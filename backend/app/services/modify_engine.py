"""
modify_engine.py
Gemini-powered layout modifier.

Takes the current layout + a user's natural language prompt,
asks Gemini what to add/remove/relocate, then applies those
changes using the existing placement engine.

Uses the new google-genai SDK.
"""

import os
import json
from google import genai
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import (
    LayoutOutput, LandOutput, HouseOutput, ScoresOutput,
    ObjectOutput, PathwayOutput, UnplacedOutput,
)
from app.services.layout_engine import _load_catalog, _build_catalog_map, _build_zones
from app.services.placement_engine import place_objects
from app.services.scoring_engine import calculate_scores

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        _client = genai.Client(api_key=api_key)
    return _client


def _summarise_current_layout(layout: LayoutOutput) -> str:
    """Build a compact text summary of the current layout for the LLM."""
    lines = []
    for obj in layout.objects:
        lines.append(
            f"  {obj.id}: type={obj.type}, variant={obj.variant}, "
            f"pos=({obj.x},{obj.y}), size={obj.width}x{obj.depth}, zone={obj.zoneId}"
        )
    for pw in layout.pathways:
        pts = " → ".join(f"({p[0]},{p[1]})" for p in pw.points)
        lines.append(f"  {pw.id}: pathway variant={pw.variant}, width={pw.width}, route={pts}")

    return (
        f"Land: {layout.land.width}x{layout.land.depth}{layout.land.unit}, "
        f"road={layout.land.road_direction}, ground={layout.land.ground_texture}\n"
        f"House: pos=({layout.house.x},{layout.house.y}), "
        f"size={layout.house.width}x{layout.house.depth}\n"
        f"Objects & Pathways ({len(layout.objects)} objects, {len(layout.pathways)} paths):\n"
        + "\n".join(lines)
    )


def _compact_catalog_text(catalog: dict) -> str:
    """All available variants for the LLM to choose from."""
    lines = []
    for feat in catalog.get("features", []):
        for v in feat.get("variants", []):
            lines.append(f"{feat['type']}|{v['id']}|{v['width']}x{v['depth']}")
    return "\n".join(lines)


def _build_modify_prompt(
    layout_summary: str,
    user_prompt: str,
    catalog_text: str,
) -> str:
    return (
        "You are a landscape layout modifier. "
        "The user has an existing landscape design and wants to change it.\n\n"
        "CURRENT LAYOUT:\n"
        f"{layout_summary}\n\n"
        "AVAILABLE VARIANTS (type|variantId|WxD):\n"
        f"{catalog_text}\n\n"
        f'USER REQUEST: "{user_prompt}"\n\n'
        "Return ONLY a JSON object (no markdown, no explanation) with these keys:\n"
        "{\n"
        '  "add": [{"type": "...", "variant": "...", "zone": "..."}],\n'
        '  "remove": ["obj_001", "path_001"],\n'
        '  "relocate": [{"id": "obj_002", "zone": "west"}]\n'
        "}\n\n"
        "Rules:\n"
        "- 'add': items to place. Use only variant IDs from the list above.\n"
        "  zone must be: north, south, east, west, north_east, north_west, south_east, south_west, center\n"
        "- 'remove': IDs of existing objects or pathways to delete.\n"
        "- 'relocate': IDs of existing objects to move to a new zone.\n"
        "- If the user asks to 'replace' something, remove the old one and add the new one.\n"
        "- If the user's request doesn't need a particular key, use an empty array [].\n"
        "- Do NOT include the house.\n"
        "Return only the JSON object, nothing else."
    )


def _parse_llm_response(text: str) -> dict:
    """Parse the LLM response, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)
    # Ensure all keys exist
    return {
        "add": data.get("add", []),
        "remove": data.get("remove", []),
        "relocate": data.get("relocate", []),
    }


def modify_layout(
    current_layout: LayoutOutput,
    user_prompt: str,
    input_data: LandscapeDesignInput,
) -> LayoutOutput:
    """
    Modify an existing layout based on a user's natural language prompt.

    1. Summarise current layout for the LLM
    2. Ask Gemini what to add/remove/relocate
    3. Apply changes using the placement engine
    4. Re-score and return
    """
    catalog = _load_catalog()
    catalog_map = _build_catalog_map(catalog)

    # ── 1. Build prompt ────────────────────────────────────────────────────
    layout_summary = _summarise_current_layout(current_layout)
    catalog_text = _compact_catalog_text(catalog)
    prompt = _build_modify_prompt(layout_summary, user_prompt, catalog_text)

    # ── 2. Ask Gemini ──────────────────────────────────────────────────────
    client = _get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    diff = _parse_llm_response(response.text)

    print(f"MODIFY DIFF: add={len(diff['add'])}, remove={len(diff['remove'])}, relocate={len(diff['relocate'])}")

    # ── 3. Apply removals ──────────────────────────────────────────────────
    remove_ids = set(diff["remove"])
    kept_objects = [o for o in current_layout.objects if o.id not in remove_ids]
    kept_pathways = [p for p in current_layout.pathways if p.id not in remove_ids]

    # ── 4. Apply relocations ───────────────────────────────────────────────
    relocate_map = {r["id"]: r["zone"] for r in diff["relocate"]}
    relocation_intent = []
    final_objects = []

    for obj in kept_objects:
        if obj.id in relocate_map:
            # Re-place this object in the new zone
            relocation_intent.append({
                "type": obj.type,
                "variant": obj.variant,
                "zone": relocate_map[obj.id],
            })
        else:
            final_objects.append(obj)

    # ── 5. Build placement intent for new + relocated items ────────────────
    add_intent = diff["add"] + relocation_intent

    if add_intent:
        # Build occupied rectangles from kept objects so placement avoids them
        existing_rects = [
            {"x": o.x, "y": o.y, "w": o.width, "d": o.depth}
            for o in final_objects
        ]

        new_objects, new_pathways, new_unplaced, _ = place_objects(
            add_intent, catalog_map, input_data
        )

        # TODO: ideally pass existing_rects to place_objects to avoid collisions
        # For now the placement engine uses the house + its own placed list
        final_objects.extend(new_objects)
        kept_pathways.extend(new_pathways)
    else:
        new_unplaced = []

    # ── 6. Re-number object IDs to keep them sequential ────────────────────
    for i, obj in enumerate(final_objects):
        obj.id = f"obj_{i + 1:03d}"

    # ── 7. Build zones ─────────────────────────────────────────────────────
    zones = _build_zones(input_data.land.width, input_data.land.depth)

    # ── 8. Assemble output ─────────────────────────────────────────────────
    updated_layout = LayoutOutput(
        land=current_layout.land,
        house=current_layout.house,
        zones=zones,
        objects=final_objects,
        pathways=kept_pathways,
        unplaced=(current_layout.unplaced or []) + new_unplaced,
        scores=ScoresOutput(
            vastuScore=0, sustainabilityScore=0,
            coolingScore=0, spaceUtilizationScore=0,
        ),
        recommendations=[
            f'Applied: "{user_prompt}"',
            f"{len(final_objects)} objects, {len(kept_pathways)} pathways total.",
        ],
    )

    # ── 9. Re-score ────────────────────────────────────────────────────────
    updated_layout.scores = calculate_scores(updated_layout, input_data)

    return updated_layout
