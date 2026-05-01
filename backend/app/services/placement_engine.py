"""
placement_engine.py
Local constraint-aware placement optimizer.

The LLM provides only high-level intent:
    [{"type": "trees", "variant": "tree_oak_01", "zone": "north"}]

This module converts that intent into exact (x, y, width, depth) coordinates
by scanning the land grid and finding valid non-overlapping positions.
Pathways are a special case: they are routed as point arrays, not boxes.
"""

from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import ObjectOutput, PathwayOutput, UnplacedOutput

class DotDict(dict):
    """Allows dot notation access for dictionary keys."""
    def __getattr__(self, name):
        return self.get(name)
    def __setattr__(self, name, value):
        self[name] = value


SPACING = 0.5  # minimum gap between any two objects


def _zone_bounds(zone: str, land_w: float, land_d: float) -> tuple[float, float, float, float]:
    """Return (x_min, y_min, x_max, y_max) for a named compass zone."""
    mid_x, mid_y = land_w / 2, land_d / 2
    zones = {
        "north":      (0,      mid_y, land_w, land_d),
        "south":      (0,      0,     land_w, mid_y),
        "east":       (mid_x,  0,     land_w, land_d),
        "west":       (0,      0,     mid_x,  land_d),
        "north_east": (mid_x,  mid_y, land_w, land_d),
        "north_west": (0,      mid_y, mid_x,  land_d),
        "south_east": (mid_x,  0,     land_w, mid_y),
        "south_west": (0,      0,     mid_x,  mid_y),
        "center":     (land_w * 0.2, land_d * 0.2, land_w * 0.8, land_d * 0.8),
    }
    return zones.get(zone, (0, 0, land_w, land_d))


def _overlaps(ax, ay, aw, ad, bx, by, bw, bd) -> bool:
    gap = SPACING
    return (
        ax < bx + bw + gap and ax + aw + gap > bx and
        ay < by + bd + gap and ay + ad + gap > by
    )


def _try_place(
    obj_w: float,
    obj_d: float,
    zone: str,
    land_w: float,
    land_d: float,
    house,
    car_park,
    placed: list,
    step: float = 0.5,

) -> tuple[float, float] | None:
    """Scan the zone in a grid pattern and return the first valid (x, y), or None."""
    x_min, y_min, x_max, y_max = _zone_bounds(zone, land_w, land_d)

    x = x_min
    while x + obj_w <= x_max and x + obj_w <= land_w:
        y = y_min
        while y + obj_d <= y_max and y + obj_d <= land_d:
            if not _overlaps(x, y, obj_w, obj_d, house.x, house.y, house.width, house.depth):
                # Also check car_park if it exists
                cp_ok = True
                if car_park:
                    if _overlaps(x, y, obj_w, obj_d, car_park.x, car_park.y, car_park.width, car_park.depth):
                        cp_ok = False
                
                if cp_ok:
                    ok = all(
                        not _overlaps(x, y, obj_w, obj_d, p["x"], p["y"], p["w"], p["d"])
                        for p in placed
                    )
                    if ok:
                        return x, y

            y += step
        x += step
    return None


def _route_pathway(
    variant: str,
    path_width: float,
    zone: str,
    land_w: float,
    land_d: float,
    house,
    road_direction: str,
    material: str,
    idx: int,
) -> PathwayOutput | None:
    """
    Route a pathway from the road-facing edge of the land toward the house entrance.
    Returns a PathwayOutput with waypoints, or None if routing fails.
    """
    # Determine road-side start point
    if road_direction == "south":
        start = (house.x + house.width / 2, 0.0)
        end = (house.x + house.width / 2, house.y)
    elif road_direction == "north":
        start = (house.x + house.width / 2, land_d)
        end = (house.x + house.width / 2, house.y + house.depth)
    elif road_direction == "east":
        start = (land_w, house.y + house.depth / 2)
        end = (house.x + house.width, house.y + house.depth / 2)
    else:  # west
        start = (0.0, house.y + house.depth / 2)
        end = (house.x, house.y + house.depth / 2)

    # Simple straight-line route — future: add L-shaped routing
    points = [start, end]

    return PathwayOutput(
        id=f"path_{idx:03d}",
        variant=variant,
        points=points,
        width=path_width,
        material=material or "stone",
    )



def _place_car_park(car_park_input, land_w, land_d, house, road_direction) -> tuple[float, float] | None:
    """Find a valid spot for the car park near the road side."""
    if not car_park_input:
        return None

    # Preferred zones based on road
    zones = {
        "south": ["south_east", "south_west", "south"],
        "north": ["north_east", "north_west", "north"],
        "east":  ["south_east", "north_east", "east"],
        "west":  ["south_west", "north_west", "west"],
    }.get(road_direction, ["south"])

    # If facing East or West, the physical footprint swaps width and depth
    w = car_park_input.depth if road_direction in ["east", "west"] else car_park_input.width
    d = car_park_input.width if road_direction in ["east", "west"] else car_park_input.depth

    for zone in zones:
        pos = _try_place(
            w, d, 
            zone, land_w, land_d, house, None, [], step=0.5
        )

        if pos:
            # Return original unswapped coords, placement engine expects original width/depth
            return pos
    return None



def place_objects(

    intent: list[dict],
    catalog_map: dict,
    input_data: LandscapeDesignInput,
) -> tuple[list[ObjectOutput], list[PathwayOutput], list[UnplacedOutput]]:
    """
    Given LLM intent + catalog dimensions, compute exact object coordinates.
    Returns (placed_objects, placed_pathways, unplaced_objects).
    """
    land_w = input_data.land.width
    land_d = input_data.land.depth
    house = input_data.house
    road = input_data.road_direction

    placed_rects: list[dict] = []
    placed: list[ObjectOutput] = []
    pathways: list[PathwayOutput] = []
    unplaced: list[UnplacedOutput] = []

    # ── Place Car Park First ───────────────────────────────────────────
    car_park_pos = _place_car_park(input_data.car_park, land_w, land_d, house, road)
    car_park_rect = None
    if car_park_pos:
        cx, cy = car_park_pos
        
        rot = 0
        if road == "north": rot = 0
        elif road == "south": rot = 180
        elif road == "east": rot = -90
        elif road == "west": rot = 90
        
        car_park_rect = DotDict({
            "x": cx, "y": cy, 
            "width": input_data.car_park.width, 
            "depth": input_data.car_park.depth,
            "type": input_data.car_park.type,
            "rotation": rot
        })


    
    FALLBACK_ORDER = ["north", "south", "east", "west",

                      "north_east", "north_west", "south_east", "south_west", "center"]

    path_count = 0
    for idx, item in enumerate(intent):
        obj_type = item.get("type", "unknown")
        variant = item.get("variant", "")
        preferred_zone = item.get("zone", "").lower().replace(" ", "_")

        dims = catalog_map.get(variant)
        if not dims:
            unplaced.append(UnplacedOutput(type=obj_type, reason=f"Variant '{variant}' not in catalog."))
            continue

        obj_w = dims["width"]
        obj_d = dims["depth"]
        height = dims.get("height", 0.5)
        render_type = dims.get("render_type", "model")
        material = dims.get("material")

        # ── Pathways: routed, not grid-placed ──────────────────────────────
        if render_type == "path":
            path_count += 1
            pw = _route_pathway(
                variant=variant,
                path_width=obj_w,
                zone=preferred_zone,
                land_w=land_w,
                land_d=land_d,
                house=house,
                road_direction=road,
                material=material,
                idx=path_count,
            )
            if pw:
                pathways.append(pw)
            else:
                unplaced.append(UnplacedOutput(type=obj_type, reason="Could not route pathway."))
            continue

        # ── All other objects: grid placement ──────────────────────────────
        zones_to_try = [preferred_zone] if preferred_zone else []
        for z in FALLBACK_ORDER:
            if z not in zones_to_try:
                zones_to_try.append(z)

        pos = None
        for zone in zones_to_try:
            # Note: car_park_rect is passed as the car_park obstacle
            pos = _try_place(obj_w, obj_d, zone, land_w, land_d, house, car_park_rect, placed_rects)
            if pos:
                break



        if pos is None:
            unplaced.append(UnplacedOutput(type=obj_type, reason="No valid space found on the land."))
            continue

        x, y = pos
        placed_rects.append({"x": x, "y": y, "w": obj_w, "d": obj_d})
        placed.append(ObjectOutput(
            id=f"obj_{idx + 1:03d}",
            type=obj_type,
            variant=variant,
            x=round(x, 2),
            y=round(y, 2),
            width=obj_w,
            depth=obj_d,
            height=height,
            rotation=0.0,
            zoneId=preferred_zone or "general",
            render_type=render_type,
            material=material,
        ))

    return placed, pathways, unplaced, car_park_rect

