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
from google.genai import types
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import (
    LayoutOutput, LandOutput, HouseOutput, ZoneOutput, ScoresOutput, UnplacedOutput, CarParkOutput
)
from app.services.vastu_engine import get_vastu_prompt_guidelines
from app.services.placement_engine import place_objects
from app.services.scoring_engine import calculate_scores

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        _client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1))
        )
    return _client


def _load_catalog() -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "feature_catalog.json")
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return {"features": []}


def _load_prompts() -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "prompts.json")
    with open(path) as f:
        return json.load(f)


def _build_available_items_text(prompts: dict, requested: dict) -> str:
    """Build a compact catalog string from prompts.json available_items, filtered to requested types."""
    lines = []
    for item in prompts.get("available_items", []):
        if item["type"] in requested:
            count = requested[item["type"]]
            for v in item["variants"]:
                lines.append(f"{item['type']} (x{count}) | {v['id']} | {v['width']}x{v['depth']}m")
    return "\n".join(lines) if lines else "(none)"


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
        # Compass directions
        ZoneOutput(id="north",      type="north",      x=0,     y=mid_y, width=land_w, depth=land_d - mid_y),
        ZoneOutput(id="south",      type="south",      x=0,     y=0,     width=land_w, depth=mid_y),
        ZoneOutput(id="east",       type="east",       x=mid_x, y=0,     width=land_w - mid_x, depth=land_d),
        ZoneOutput(id="west",       type="west",       x=0,     y=0,     width=mid_x,  depth=land_d),
        
        # Corners
        ZoneOutput(id="north_east", type="north_east", x=mid_x, y=mid_y, width=land_w - mid_x, depth=land_d - mid_y),
        ZoneOutput(id="north_west", type="north_west", x=0,     y=mid_y, width=mid_x,  depth=land_d - mid_y),
        ZoneOutput(id="south_east", type="south_east", x=mid_x, y=0,     width=land_w - mid_x, depth=mid_y),
        ZoneOutput(id="south_west", type="south_west", x=0,     y=0,     width=mid_x,  depth=mid_y),
        
        # Center
        ZoneOutput(id="center",     type="center",     x=land_w * 0.25, y=land_d * 0.25,
                   width=land_w * 0.5, depth=land_d * 0.5),
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
            wall_texture=input_data.wall_texture,
        ),
        house=HouseOutput(
            x=input_data.house.x,
            y=input_data.house.y,
            width=input_data.house.width,
            depth=input_data.house.depth,
            rotation=input_data.house.rotation,
        ),
        car_park=None,
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


def _save_last_request(system_prompt: str, user_prompt: str):
    """Save the last prompt and system instruction to a JSON file for debugging."""
    path = os.path.join(os.path.dirname(__file__), "..", "data", "last_llm_request.json")
    try:
        with open(path, "w") as f:
            json.dump({
                "system_instruction": system_prompt,
                "contents": user_prompt
            }, f, indent=2)
    except Exception as e:
        print(f"Failed to save last request: {e}")


def _ask_llm(input_data: LandscapeDesignInput, catalog: dict) -> list[dict]:
    """
    Ask Gemini for placement intent only — a very short JSON array.
    Each item: {"type": "trees", "variant": "tree_oak_01", "zone": "north"}
    Prompt template and available_items catalog are loaded from prompts.json.
    """
    prompts = _load_prompts()
    vastu_hint = get_vastu_prompt_guidelines(input_data.vastu_priority, input_data.road_direction)
    parking_hint = {
        "north": "south_west or south_east",
        "south": "south_west or south_east",
        "east":  "south_east or north_east",
        "west":  "south_west or north_west",
    }.get(input_data.road_direction, "south")

    available_items_text = _build_available_items_text(prompts, input_data.optional_features)
    features_count = len(input_data.optional_features)
    
    cp = input_data.car_park
    car_park_info = f"{cp.type} size {cp.width}x{cp.depth}" if cp else "None"

    # Format: "bench x2, trees x3, lawn x1"
    features_str = ", ".join(
        f"{k} x{v}" for k, v in input_data.optional_features.items()
    )

    template = prompts.get("intent_prompt_template", "")
    replacements = {
        "{width}":          str(input_data.land.width),
        "{depth}":          str(input_data.land.depth),
        "{unit}":           input_data.land.unit,
        "{house_x}":        str(input_data.house.x),
        "{house_y}":        str(input_data.house.y),
        "{house_w}":        str(input_data.house.width),
        "{house_d}":        str(input_data.house.depth),
        "{road_direction}": input_data.road_direction,
        "{garden_style}":   input_data.garden_style,
        "{vehicle_count}":  str(input_data.vehicle_count),
        "{features}":       features_str,
        "{features_count}": str(features_count),
        "{vastu_priority}": str(input_data.vastu_priority),
        "{vastu_hint}":     vastu_hint,
        "{parking_hint}":   parking_hint,
        "{available_items}": available_items_text,
        "{car_park_info}":  car_park_info,
    }

    prompt = template
    for placeholder, value in replacements.items():
        prompt = prompt.replace(placeholder, value)

    system_prompt = prompts.get("intent_system_prompt", "You are a landscape zone planner. Return ONLY a JSON array.")
    _save_last_request(system_prompt, prompt)

    client = _get_client()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=system_prompt),
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
        "bush":            {"variant": "bush_01",          "zone": "center"},
        "pathway":         {"variant": "path_stone_01",    "zone": "south"},
        "driveway":        {"variant": "driveway_paved_01","zone": "south"},
        "garden_lights":   {"variant": "light_post_01",    "zone": "south_east"},
        "seating_area":    {"variant": "seating_patio_01", "zone": "east"},
        "open_car_park":   {"variant": "car_park_open_01", "zone": "south_east"},
        "covered_car_park":{"variant": "car_park_covered_01","zone": "south_west"},
        "well":            {"variant": "well_01",          "zone": "north_east"},
    }
    intent = []
    for feature_type, count in input_data.optional_features.items():
        entry = VARIANT_MAP.get(feature_type)
        if entry:
            for _ in range(count):
                intent.append({"type": feature_type, **entry})
    # Ensure a pathway from road to house is always included
    if "pathway" not in input_data.optional_features:
        intent.append({"type": "pathway", "variant": "path_stone_01", "zone": "south"})
    return intent


def generate_layout(input_data: LandscapeDesignInput) -> LayoutOutput:
    catalog = _load_catalog()
    catalog_map = _build_catalog_map(catalog)

    # ── House Rotation ──────────────────────────────────────────────────
    road = input_data.road_direction
    house_rot = 0
    if road == "north": house_rot = 0
    elif road == "south": house_rot = 180
    elif road == "east": house_rot = -90
    elif road == "west": house_rot = 90
    
    # ── Intent: LLM (with mock fallback) ──────────────────────────────────
    try:
        intent = _ask_llm(input_data, catalog)
        print(f"LLM INTENT ({len(intent)} items): {[i['type'] for i in intent]}")
    except Exception as exc:
        print(f"LLM failed ({exc}), falling back to mock intent")
        intent = _mock_intent(input_data)
        print(f"MOCK INTENT ({len(intent)} items): {[i['type'] for i in intent]}")

    # ── Placement ──────────────────────────────────────────────────────────
    placed_objects, placed_pathways, unplaced_objects, car_park_rect = place_objects(intent, catalog_map, input_data)

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
            wall_texture=input_data.wall_texture,
        ),
        house=HouseOutput(
            x=input_data.house.x,
            y=input_data.house.y,
            width=input_data.house.width,
            depth=input_data.house.depth,
            rotation=house_rot,
        ),
        car_park=CarParkOutput(**car_park_rect) if car_park_rect else None,
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
