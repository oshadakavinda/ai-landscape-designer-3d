from app.models.layout_schema import ScoresOutput
from app.models.input_schema import LandscapeDesignInput

# Vastu-favorable compass positions for trees/water (shade, cooling)
VASTU_PREFERRED = {
    "trees":       ["north", "north_east", "east"],
    "pond":        ["north", "north_east"],
    "fountain":    ["north", "north_east"],
    "well":        ["north", "north_east"],
    "bench":       ["east", "north_east"],
    "garden_lights":["south_east"],
    "seating_area":["east", "north"],
    "flower_beds": ["east", "west", "north"],
}

COOL_TYPES = {"trees", "pond", "fountain", "lawn", "well"}
GREEN_TYPES = {"trees", "lawn", "flower_beds", "vegetable_beds", "pond", "fountain", "well"}


def calculate_scores(layout, input_data: LandscapeDesignInput) -> ScoresOutput:
    land_area = input_data.land.width * input_data.land.depth
    house_area = input_data.house.width * input_data.house.depth

    used_area = house_area
    if input_data.car_park:
        used_area += input_data.car_park.width * input_data.car_park.depth
    
    green_area = 0.0

    cool_area = 0.0
    vastu_hits = 0
    vastu_total = 0

    for obj in layout.objects:
        obj_area = obj.width * obj.depth
        used_area += obj_area

        if obj.type in GREEN_TYPES:
            green_area += obj_area
        if obj.type in COOL_TYPES:
            cool_area += obj_area

        # Vastu: check if object is in a preferred zone
        preferred = VASTU_PREFERRED.get(obj.type)
        if preferred:
            vastu_total += 1
            if obj.zoneId and obj.zoneId in preferred:
                vastu_hits += 1

    # Account for pathways as a small green area
    for pw in getattr(layout, "pathways", []):
        if len(pw.points) >= 2:
            p0, p1 = pw.points[0], pw.points[-1]
            path_len = ((p1[0] - p0[0])**2 + (p1[1] - p0[1])**2) ** 0.5
            used_area += pw.width * path_len * 0.5  # 50% of path is usable area

    # ── Vastu Score (0–100) ────────────────────────────────────────────────
    base_vastu = input_data.vastu_priority * 10
    if vastu_total > 0:
        placement_bonus = int((vastu_hits / vastu_total) * 30)
    else:
        placement_bonus = 0
    vastu_score = min(100, base_vastu + placement_bonus)

    # ── Sustainability (0–100): green coverage ratio ───────────────────────
    green_ratio = green_area / land_area if land_area > 0 else 0
    sustainability = min(100, int(green_ratio * 200))       # 50% green coverage = 100 score
    sustainability = max(20, sustainability)                 # floor at 20

    # ── Cooling Score (0–100): shade/water coverage ────────────────────────
    cool_ratio = cool_area / land_area if land_area > 0 else 0
    # Road direction affects solar gain — south-facing = more sun
    solar_penalty = 10 if input_data.road_direction in ("south", "east") else 0
    cooling = min(100, int(cool_ratio * 250) - solar_penalty)
    cooling = max(15, cooling)

    # ── Space Utilization (0–100) ──────────────────────────────────────────
    utilization = min(100, int((used_area / land_area) * 100)) if land_area > 0 else 0

    return ScoresOutput(
        vastuScore=vastu_score,
        sustainabilityScore=sustainability,
        coolingScore=cooling,
        spaceUtilizationScore=utilization,
    )
