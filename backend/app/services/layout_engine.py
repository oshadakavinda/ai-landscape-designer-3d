"""
layout_engine.py
Orchestrates:
  1. Ultra-short Gemini call → placement intent [{type, variant, zone}]
  2. Local placement_engine → exact collision-free coordinates
  3. scoring_engine → scores
"""

import os
import json
from google import genai
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import (
    LayoutOutput, LandOutput, HouseOutput, ZoneOutput, ScoresOutput, UnplacedOutput
)
from app.services.vastu_engine import get_vastu_prompt_guidelines
from app.services.placement_engine import place_objects
from app.services.scoring_engine import calculate_scores

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        _client = genai.Client(api_key=api_key)
    return _client


def _load_catalog() -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "feature_catalog.json")
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return {"features": []}


def _build_catalog_map(catalog: dict) -> dict:
    """variant_id -> {width, depth, height, render_type, material}"""
    m = {}
    for feat in catalog.get("features", []):
        for v in feat.get("variants", []):
            m[v["id"]] = {
                "width":       v["width"],
                "depth":       v["depth"],
                "height":      v.get("height", 0.5),
                "render_type": v.get("render_type", "model"),
                "material":    v.get("material"),
            }
    return m


def _build_zones(land_w: float, land_d: float) -> list[ZoneOutput]:
    """Generate the 9 standard compass zones as explicit objects."""
    mid_x, mid_y = land_w / 2, land_d / 2
    return [
        ZoneOutput(id="north",      type="north",      x=0,     y=mid_y, width=land_w, depth=land_d - mid_y),
        ZoneOutput(id="south",      type="south",      x=0,     y=0,     width=land_w, depth=mid_y),
        ZoneOutput(id="east",       type="east",       x=mid_x, y=0,     width=land_w - mid_x, depth=land_d),
        ZoneOutput(id="west",       type="west",       x=0,     y=0,     width=mid_x,  depth=land_d),
        ZoneOutput(id="center",     type="center",     x=land_w * 0.2, y=land_d * 0.2,
                   width=land_w * 0.6, depth=land_d * 0.6),
    ]


def _compact_catalog_text(catalog: dict, requested: list[str]) -> str:
    """Only the variants that were actually requested."""
    lines = []
    for feat in catalog.get("features", []):
        if feat["type"] in requested:
            for v in feat["variants"]:
                lines.append(f"{feat['type']}|{v['id']}|{v['width']}x{v['depth']}")
    return "\n".join(lines) if lines else "(none)"


def _fallback_layout(input_data: LandscapeDesignInput, reason: str) -> LayoutOutput:
    """Return a safe empty layout when the LLM fails."""
    return LayoutOutput(
        land=LandOutput(
            width=input_data.land.width,
            depth=input_data.land.depth,
            unit=input_data.land.unit,
            road_direction=input_data.road_direction,
            ground_texture=input_data.ground_texture,
        ),
        house=HouseOutput(
            x=input_data.house.x,
            y=input_data.house.y,
            width=input_data.house.width,
            depth=input_data.house.depth,
        ),
        scores=ScoresOutput(
            vastuScore=0, sustainabilityScore=0,
            coolingScore=0, spaceUtilizationScore=0,
        ),
        unplaced=[UnplacedOutput(type="system", reason=reason)],
        objects=[],
        pathways=[],
        zones=[],
        recommendations=[],
    )


def _ask_llm(input_data: LandscapeDesignInput, catalog: dict) -> list[dict]:
    """
    Ask Gemini for placement intent only — a very short JSON array.
    Each item: {"type": "trees", "variant": "tree_oak_01", "zone": "north"}
    """
    vastu_hint = get_vastu_prompt_guidelines(input_data.vastu_priority, input_data.road_direction)
    cat_text = _compact_catalog_text(catalog, input_data.optional_features)

    parking_hint = {
        "north": "south_west or south_east",
        "south": "south_west or south_east",
        "east": "south_east or north_east",
        "west": "south_west or north_west",
    }.get(input_data.road_direction, "south")

    prompt = (
        "You are a landscape zone planner. "
        "Return ONLY a JSON array — no markdown, no explanation.\n"
        "Each item must be: {\"type\": string, \"variant\": string, \"zone\": string}\n"
        "zone must be one of: north, south, east, west, north_east, north_west, south_east, south_west, center\n\n"
        f"Land: {input_data.land.width}x{input_data.land.depth}{input_data.land.unit} | "
        f"House at ({input_data.house.x},{input_data.house.y}) size {input_data.house.width}x{input_data.house.depth} | "
        f"Road: {input_data.road_direction} | Style: {input_data.garden_style} | Vehicles: {input_data.vehicle_count}\n"
        f"Features requested: {', '.join(input_data.optional_features)}\n"
        f"Vastu priority {input_data.vastu_priority}/10: {vastu_hint}\n"
        f"Parking preferred zone: {parking_hint}\n\n"
        "Available variants (type|variantId|WxD):\n"
        f"{cat_text}\n\n"
        "Rules:\n"
        "- Use only variant IDs from the list above.\n"
        "- Do NOT include the house in the output.\n"
        "- Assign sensible zones based on the style and vastu rules.\n"
        "- For vehicles > 0, include a driveway or car park near road side.\n"
        "Return only the JSON array, nothing else."
    )

    client = _get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)
    if isinstance(data, list):
        return data
    for v in data.values():
        if isinstance(v, list):
            return v
    return []


def _mock_intent(input_data: LandscapeDesignInput) -> list[dict]:
    """
    Build a mock intent that respects optional_features from the user's form.
    Useful while LLM is disabled for testing.
    """
    VARIANT_MAP = {
        "bench":           {"variant": "bench_wood_01",    "zone": "east"},
        "pond":            {"variant": "pond_small_01",    "zone": "north_east"},
        "fountain":        {"variant": "fountain_round_01","zone": "center"},
        "trees":           {"variant": "tree_palm_01",     "zone": "north"},
        "flower_beds":     {"variant": "flower_bed_rect_01","zone": "north_west"},
        "vegetable_beds":  {"variant": "veg_bed_raised_01","zone": "west"},
        "lawn":            {"variant": "lawn_patch_01",    "zone": "center"},
        "pathway":         {"variant": "path_stone_01",    "zone": "south"},
        "driveway":        {"variant": "driveway_paved_01","zone": "south"},
        "garden_lights":   {"variant": "light_post_01",    "zone": "south_east"},
        "seating_area":    {"variant": "seating_patio_01", "zone": "east"},
        "open_car_park":   {"variant": "car_park_open_01", "zone": "south_east"},
        "covered_car_park":{"variant": "car_park_covered_01","zone": "south_west"},
    }
    intent = []
    for feature_type in input_data.optional_features:
        entry = VARIANT_MAP.get(feature_type)
        if entry:
            intent.append({"type": feature_type, **entry})
    # Ensure a pathway from road to house is always included
    if "pathway" not in input_data.optional_features:
        intent.append({"type": "pathway", "variant": "path_stone_01", "zone": "south"})
    return intent


def generate_layout(input_data: LandscapeDesignInput) -> LayoutOutput:
    catalog = _load_catalog()
    catalog_map = _build_catalog_map(catalog)

    # ── Intent: mock (respects user features) ─────────────────────────────
    intent = _mock_intent(input_data)
    print(f"MOCK INTENT ({len(intent)} items): {[i['type'] for i in intent]}")

    # ── Placement ──────────────────────────────────────────────────────────
    placed_objects, placed_pathways, unplaced_objects = place_objects(intent, catalog_map, input_data)

    # ── Zones ──────────────────────────────────────────────────────────────
    zones = _build_zones(input_data.land.width, input_data.land.depth)

    # ── Layout assembly ────────────────────────────────────────────────────
    layout = LayoutOutput(
        land=LandOutput(
            width=input_data.land.width,
            depth=input_data.land.depth,
            unit=input_data.land.unit,
            road_direction=input_data.road_direction,
            ground_texture=input_data.ground_texture,
        ),
        house=HouseOutput(
            x=input_data.house.x,
            y=input_data.house.y,
            width=input_data.house.width,
            depth=input_data.house.depth,
        ),
        zones=zones,
        objects=placed_objects,
        pathways=placed_pathways,
        unplaced=unplaced_objects,
        scores=ScoresOutput(vastuScore=0, sustainabilityScore=0, coolingScore=0, spaceUtilizationScore=0),
        recommendations=[
            f"Vastu priority {input_data.vastu_priority}/10 applied.",
            f"{len(placed_objects)} features placed, {len(placed_pathways)} pathways routed, "
            f"{len(unplaced_objects)} could not fit.",
        ],
    )

    layout.scores = calculate_scores(layout, input_data)
    return layout
