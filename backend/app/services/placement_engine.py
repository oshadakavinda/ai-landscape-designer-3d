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

    MARGIN = 0.1
    x_start = max(x_min, MARGIN)
    y_start = max(y_min, MARGIN)
    x_limit = min(x_max, land_w - MARGIN)
    y_limit = min(y_max, land_d - MARGIN)

    # Determine scan direction based on zone to prefer corners/boundaries
    # For 'east' zones, scan from right to left. For 'north' zones, scan from top to bottom.
    x_range = []
    y_range = []
    
    step_val = max(step, 0.1)
    
    # X range
    if "east" in zone:
        # Scan from x_limit down to x_start
        curr = x_limit - obj_w
        while curr >= x_start:
            x_range.append(curr)
            curr -= step_val
    else:
        # Scan from x_start up to x_limit
        curr = x_start
        while curr + obj_w <= x_limit:
            x_range.append(curr)
            curr += step_val
            
    # Y range
    if "north" in zone:
        # Scan from y_limit down to y_start
        curr = y_limit - obj_d
        while curr >= y_start:
            y_range.append(curr)
            curr -= step_val
    else:
        # Scan from y_start up to y_limit
        curr = y_start
        while curr + obj_d <= y_limit:
            y_range.append(curr)
            curr += step_val

    for x in x_range:
        for y in y_range:
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
    gate_data = None
) -> PathwayOutput | None:
    """
    Route a pathway from the road-facing edge of the land toward the house entrance.
    Returns a PathwayOutput with waypoints, or None if routing fails.
    """
    # Determine road-side start point
    if gate_data:
        start = (gate_data.x + gate_data.width / 2, gate_data.y + gate_data.depth / 2)
    else:
        if road_direction == "south":
            start = (house.x + house.width / 2, 0.0)
        elif road_direction == "north":
            start = (house.x + house.width / 2, land_d)
        elif road_direction == "east":
            start = (land_w, house.y + house.depth / 2)
        else:  # west
            start = (0.0, house.y + house.depth / 2)
    
    # House entrance is assumed to be at the center of the house side facing the road
    if road_direction == "south":
        end = (house.x + house.width / 2, house.y)
    elif road_direction == "north":
        end = (house.x + house.width / 2, house.y + house.depth)
    elif road_direction == "east":
        end = (house.x + house.width, house.y + house.depth / 2)
    else:
        end = (house.x, house.y + house.depth / 2)

    # Simple straight-line route — future: add L-shaped routing
    # If the start and end are not perfectly aligned, create an L-shape
    if road_direction in ["north", "south"]:
        points = [start, (start[0], end[1]), end] if start[0] != end[0] else [start, end]
    else:
        points = [start, (end[0], start[1]), end] if start[1] != end[1] else [start, end]

    return PathwayOutput(
        id=f"path_{idx:03d}",
        variant=variant,
        points=points,
        width=path_width,
        material=material or "stone",
    )



def _place_car_park(car_park_input, land_w, land_d, house, road_direction, preferred_zone=None, preferred_rotation=None, placed=None) -> tuple[float, float] | None:
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

    # If LLM provided a zone, prioritize it
    if preferred_zone and preferred_zone in ["north", "south", "east", "west", "north_east", "north_west", "south_east", "south_west", "center"]:
        if preferred_zone not in zones:
            zones = [preferred_zone] + zones
        else:
            # Move to front
            zones.remove(preferred_zone)
            zones = [preferred_zone] + zones

    # Determine bounding box based on rotation
    # 0/180 -> width=width, depth=depth
    # 90/270 -> width=depth, depth=width
    if preferred_rotation is not None:
        rot = abs(preferred_rotation % 360)
        if 45 < rot < 135 or 225 < rot < 315:
            w, d = car_park_input.depth, car_park_input.width
        else:
            w, d = car_park_input.width, car_park_input.depth
    else:
        # Fallback to road-based swap logic
        w = car_park_input.depth if road_direction in ["east", "west"] else car_park_input.width
        d = car_park_input.width if road_direction in ["east", "west"] else car_park_input.depth

    for zone in zones:
        pos = _try_place(
            w, d, 
            zone, land_w, land_d, house, None, placed or [], step=0.5
        )

        if pos:
            return pos
    return None


def place_objects(
    intent: list[dict],
    catalog_map: dict,
    input_data: LandscapeDesignInput,
    existing_rects: list[dict] = None
) -> tuple[list[ObjectOutput], list[PathwayOutput], list[UnplacedOutput], any, any]:
    """
    Given LLM intent + catalog dimensions, compute exact object coordinates.
    Returns (placed_objects, placed_pathways, unplaced_objects, car_park, gate).
    """
    land_w = input_data.land.width
    land_d = input_data.land.depth
    house = input_data.house
    road = input_data.road_direction

    placed_rects: list[dict] = existing_rects[:] if existing_rects else []
    placed: list[ObjectOutput] = []
    pathways: list[PathwayOutput] = []
    unplaced: list[UnplacedOutput] = []

    # ── 1. Place Gate First (on road edge) ────────────────────────────────
    gate_intent = next((item for item in intent if item.get("type") == "gate"), None)
    gate_data = None
    if gate_intent:
        variant = gate_intent.get("variant", "gate_single_01")
        dims = catalog_map.get(variant, {"width": 3.5, "depth": 0.2})
        gw, gd = dims["width"], dims["depth"]
        
        # Snap gate to road edge and align with house
        if road == "south": gx, gy = house.x + house.width / 2 - gw / 2, 0
        elif road == "north": gx, gy = house.x + house.width / 2 - gw / 2, land_d - gd
        elif road == "east": gx, gy = land_w - gd, house.y + house.depth / 2 - gw / 2
        elif road == "west": gx, gy = 0, house.y + house.depth / 2 - gw / 2
        else: gx, gy = 0, 0
        
        gate_data = DotDict({
            "id": "gate_01",
            "variant": variant,
            "x": gx, "y": gy,
            "width": gw, "depth": gd,
            "rotation": 0.0 # BoundaryWall handles rotation
        })
        # Add gate to placed_rects to avoid overlaps
        placed_rects.append({"x": gx, "y": gy, "w": gw, "d": gd})

    # ── 2. Route Pathways ────────────────────────────────────────────────
    path_intents = [i for i in intent if catalog_map.get(i.get("variant"), {}).get("render_type") == "path"]
    other_intents = [i for i in intent if catalog_map.get(i.get("variant"), {}).get("render_type") != "path"]
    
    path_count = 0
    for item in path_intents:
        obj_type = item.get("type", "unknown")
        variant = item.get("variant", "")
        preferred_zone = item.get("zone", "").lower().replace(" ", "_")
        
        # Skip car park/gate if they were in the list (already handled)
        if obj_type in ["car_park", "garage", "gate"]:
            continue
            
        dims = catalog_map.get(variant)
        if not dims: continue
        obj_w = dims["width"]
        material = dims.get("material")

        pw = _route_pathway(
            variant=variant,
            path_width=obj_w,
            zone=preferred_zone,
            land_w=land_w,
            land_d=land_d,
            house=house,
            road_direction=road,
            material=material,
            idx=path_count + 1,
            gate_data=gate_data
        )
        
        if pw:
            # Add to pathways output only if NOT a driveway
            if obj_type != "driveway":
                path_count += 1
                pathways.append(pw)
            
            # Add segments to placed_rects for ALL paths (including driveway) to keep corridors clear
            for i in range(len(pw.points) - 1):
                p1, p2 = pw.points[i], pw.points[i+1]
                min_x = min(p1[0], p2[0]) - pw.width/2
                max_x = max(p1[0], p2[0]) + pw.width/2
                min_y = min(p1[1], p2[1]) - pw.width/2
                max_y = max(p1[1], p2[1]) + pw.width/2
                placed_rects.append({"x": min_x, "y": min_y, "w": max_x - min_x, "d": max_y - min_y})
        else:
            unplaced.append(UnplacedOutput(type=obj_type, reason="Could not route path."))

    # ── 3. Place Car Park ────────────────────────────────────────────────
    # Look for car park intent from LLM
    cp_intent = next((item for item in intent if item.get("type") in ["car_park", "garage"]), None)
    preferred_cp_zone = cp_intent.get("zone") if cp_intent else None
    
    # Determine forced rotation so it faces the gate
    target_zone = preferred_cp_zone
    if not target_zone:
        target_zone = {
            "south": "south_east",
            "north": "north_east",
            "east": "south_east",
            "west": "south_west"
        }.get(road, "south_east")
        
    forced_rot = 0
    if road in ["south", "north"]:
        forced_rot = -90 if "east" in target_zone else 90
    else: # east or west
        forced_rot = 0 if "north" in target_zone else 180

    car_park_pos = _place_car_park(input_data.car_park, land_w, land_d, house, road, preferred_cp_zone, forced_rot, placed=placed_rects)
    car_park_rect = None
    if car_park_pos:
        cx, cy = car_park_pos
        
        car_park_rect = DotDict({
            "x": cx, "y": cy, 
            "width": input_data.car_park.width, 
            "depth": input_data.car_park.depth,
            "type": input_data.car_park.type,
            "rotation": forced_rot
        })


    if car_park_rect:
        is_swapped = abs(forced_rot) == 90 or abs(forced_rot) == 270
        cw = car_park_rect.width if not is_swapped else car_park_rect.depth
        cd = car_park_rect.depth if not is_swapped else car_park_rect.width
        
        placed_rects.append({"x": car_park_rect.x, "y": car_park_rect.y, "w": cw, "d": cd})
        # Add clearance in front of garage (towards road) to ensure no obstacles block the car
        cw, cd = car_park_rect.width, car_park_rect.depth
        if road == "south":
            placed_rects.append({"x": car_park_rect.x, "y": 0, "w": cw, "d": car_park_rect.y})
        elif road == "north":
            placed_rects.append({"x": car_park_rect.x, "y": car_park_rect.y + cd, "w": cw, "d": land_d - (car_park_rect.y + cd)})
        elif road == "east":
            placed_rects.append({"x": car_park_rect.x + cw, "y": car_park_rect.y, "w": land_w - (car_park_rect.x + cw), "d": cd})
        elif road == "west":
            placed_rects.append({"x": 0, "y": car_park_rect.y, "w": car_park_rect.x, "d": cd})

    FALLBACK_ORDER = ["north", "south", "east", "west",

                      "north_east", "north_west", "south_east", "south_west", "center"]

    # ── Separate Pathways from Other Objects ─────────────────────────────
    path_intents = [i for i in intent if catalog_map.get(i.get("variant"), {}).get("render_type") == "path"]
    other_intents = [i for i in intent if catalog_map.get(i.get("variant"), {}).get("render_type") != "path"]
    
    path_count = 0
    for item in path_intents:
        obj_type = item.get("type", "unknown")
        variant = item.get("variant", "")
        preferred_zone = item.get("zone", "").lower().replace(" ", "_")
        
        # Skip car park/gate if they were in the list (already handled)
        if obj_type in ["car_park", "garage", "gate"]:
            continue
            
        dims = catalog_map.get(variant)
        if not dims: continue
        obj_w = dims["width"]
        material = dims.get("material")

        pw = _route_pathway(
            variant=variant,
            path_width=obj_w,
            zone=preferred_zone,
            land_w=land_w,
            land_d=land_d,
            house=house,
            road_direction=road,
            material=material,
            idx=path_count + 1,
            gate_data=gate_data
        )
        
        if pw:
            # Add to pathways output only if NOT a driveway
            if obj_type != "driveway":
                path_count += 1
                pathways.append(pw)
            
            # Add segments to placed_rects for ALL paths (including driveway) to keep corridors clear
            for i in range(len(pw.points) - 1):
                p1, p2 = pw.points[i], pw.points[i+1]
                min_x = min(p1[0], p2[0]) - pw.width/2
                max_x = max(p1[0], p2[0]) + pw.width/2
                min_y = min(p1[1], p2[1]) - pw.width/2
                max_y = max(p1[1], p2[1]) + pw.width/2
                placed_rects.append({"x": min_x, "y": min_y, "w": max_x - min_x, "d": max_y - min_y})
        else:
            unplaced.append(UnplacedOutput(type=obj_type, reason="Could not route path."))

    # ── 4. Place All Other Objects ────────────────────────────────────────
    for idx, item in enumerate(other_intents):
        obj_type = item.get("type", "unknown")
        variant = item.get("variant", "")
        preferred_zone = item.get("zone", "").lower().replace(" ", "_")

        # Skip car park and gate as they are handled separately
        if obj_type in ["car_park", "garage", "gate"]:
            continue

        dims = catalog_map.get(variant)
        if not dims:
            unplaced.append(UnplacedOutput(type=obj_type, reason=f"Variant '{variant}' not in catalog."))
            continue

        obj_w = dims["width"]
        obj_d = dims["depth"]
        rot = item.get("rotation", 0)
        is_swapped = abs(rot) == 90 or abs(rot) == 270
        try_w = obj_d if is_swapped else obj_w
        try_d = obj_w if is_swapped else obj_d

        height = dims.get("height", 0.5)
        render_type = dims.get("render_type", "model")
        material = dims.get("material")

        # ── All other objects: grid placement ──────────────────────────────
        zones_to_try = [preferred_zone] if preferred_zone else []
        for z in FALLBACK_ORDER:
            if z not in zones_to_try:
                zones_to_try.append(z)

        pos = None
        for zone in zones_to_try:
            # Note: car_park_rect is passed as the car_park obstacle
            pos = _try_place(try_w, try_d, zone, land_w, land_d, house, car_park_rect, placed_rects)
            if pos:
                break



        if pos is None:
            unplaced.append(UnplacedOutput(type=obj_type, reason="No valid space found on the land."))
            continue

        x, y = pos
        placed_rects.append({"x": x, "y": y, "w": try_w, "d": try_d})
        placed.append(ObjectOutput(
            id=f"obj_{idx + 1:03d}",
            type=obj_type,
            variant=variant,
            x=round(x, 2),
            y=round(y, 2),
            width=obj_w,
            depth=obj_d,
            height=height,
            rotation=float(item.get("rotation", 0.0)),
            zoneId=preferred_zone or "general",
            render_type=render_type,
            material=material,
        ))

    return placed, pathways, unplaced, car_park_rect, gate_data

