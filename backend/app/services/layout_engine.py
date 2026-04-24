"""
layout_engine.py
Orchestrates:
  1. Ultra-short Gemini call → placement intent [{type, variant, zone}]
  2. Local placement_engine → exact collision-free coordinates
  3. scoring_engine → scores
"""

import os
import json
import time
import google.generativeai as genai
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import LayoutOutput, LandOutput, HouseOutput, ScoresOutput, UnplacedOutput
from app.services.vastu_engine import get_vastu_prompt_guidelines
from app.services.placement_engine import place_objects
from app.services.scoring_engine import calculate_scores

_gemini_model = None


def get_model():
    global _gemini_model
    if _gemini_model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    return _gemini_model


def _load_catalog() -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "feature_catalog.json")
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return {"features": []}


def _build_catalog_map(catalog: dict) -> dict:
    """variant_id -> {width, depth}"""
    m = {}
    for feat in catalog.get("features", []):
        for v in feat.get("variants", []):
            m[v["id"]] = {"width": v["width"], "depth": v["depth"]}
    return m


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
        zones=[],
        recommendations=[],
    )


def _ask_llm(input_data: LandscapeDesignInput, catalog: dict) -> list[dict]:
    """
    Ask Gemini for placement intent only — a very short JSON array.
    Each item: {"type": "trees", "variant": "tree_oak_01", "zone": "north"}
    No coordinates, no dimensions — the backend handles all of that.
    """
    vastu_hint = get_vastu_prompt_guidelines(input_data.vastu_priority, input_data.road_direction)
    cat_text = _compact_catalog_text(catalog, input_data.optional_features)

    # Map road direction to which compass zone should have parking
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

    model = get_model()
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Strip markdown fences
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)
    if isinstance(data, list):
        return data
    # LLM wrapped it in an object key
    for v in data.values():
        if isinstance(v, list):
            return v
    return []



def generate_layout(input_data: LandscapeDesignInput) -> LayoutOutput:
    catalog = _load_catalog()
    catalog_map = _build_catalog_map(catalog)

    # MOCK intent for testing
    intent = [
        {"type": "trees", "variant": "tree_palm_01", "zone": "north"},
        {"type": "lawn", "variant": "lawn_patch_01", "zone": "center"},
        {"type": "bench", "variant": "bench_wood_01", "zone": "east"},
        {"type": "pathway", "variant": "path_stone_01", "zone": "south"},
        {"type": "open_car_park", "variant": "car_park_open_01", "zone": "south_east"}
    ]
    print("USING MOCK INTENT FOR TESTING")


    # Local optimizer does all coordinate placement
    placed_objects, unplaced_objects = place_objects(intent, catalog_map, input_data)

    layout = LayoutOutput(
        land=LandOutput(
            width=input_data.land.width,
            depth=input_data.land.depth,
            unit=input_data.land.unit,
            road_direction=input_data.road_direction,
        ),
        house=HouseOutput(
            x=input_data.house.x,
            y=input_data.house.y,
            width=input_data.house.width,
            depth=input_data.house.depth,
        ),
        zones=[],  # zones are implicit via object zoneIds
        objects=placed_objects,
        unplaced=unplaced_objects,
        scores=ScoresOutput(
            vastuScore=0, sustainabilityScore=0,
            coolingScore=0, spaceUtilizationScore=0,
        ),
        recommendations=[
            f"Vastu priority {input_data.vastu_priority}/10 applied.",
            f"{len(placed_objects)} features placed, {len(unplaced_objects)} could not fit.",
        ],
    )

    layout.scores = calculate_scores(layout, input_data)
    return layout
