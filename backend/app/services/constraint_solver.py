from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import LayoutOutput, UnplacedOutput

def check_overlap(rect1, rect2) -> bool:
    # rect is dict with x, y, width, depth
    if (rect1["x"] < rect2["x"] + rect2["width"] and
        rect1["x"] + rect1["width"] > rect2["x"] and
        rect1["y"] < rect2["y"] + rect2["depth"] and
        rect1["y"] + rect1["depth"] > rect2["y"]):
        return True
    return False

def check_within_bounds(rect, bounds_width, bounds_depth) -> bool:
    if (rect["x"] >= 0 and rect["y"] >= 0 and
        rect["x"] + rect["width"] <= bounds_width and
        rect["y"] + rect["depth"] <= bounds_depth):
        return True
    return False

def validate_and_correct_layout(layout: LayoutOutput, input_data: LandscapeDesignInput) -> LayoutOutput:
    house_rect = {
        "x": input_data.house.x,
        "y": input_data.house.y,
        "width": input_data.house.width,
        "depth": input_data.house.depth
    }

    valid_objects = []

    for obj in layout.objects:
        obj_rect = {"x": obj.x, "y": obj.y, "width": obj.width, "depth": obj.depth}

        if not check_within_bounds(obj_rect, input_data.land.width, input_data.land.depth):
            layout.unplaced.append(UnplacedOutput(
                type=obj.type,
                reason=f"{obj.id} exceeded land boundaries."
            ))
            continue

        if check_overlap(obj_rect, house_rect):
            layout.unplaced.append(UnplacedOutput(
                type=obj.type,
                reason=f"{obj.id} overlapped with the house."
            ))
            continue

        overlap_other = False
        for valid_obj in valid_objects:
            v_rect = {"x": valid_obj.x, "y": valid_obj.y, "width": valid_obj.width, "depth": valid_obj.depth}
            if check_overlap(obj_rect, v_rect):
                overlap_other = True
                break

        if overlap_other:
            layout.unplaced.append(UnplacedOutput(
                type=obj.type,
                reason=f"{obj.id} overlapped with another object."
            ))
            continue

        valid_objects.append(obj)

    layout.objects = valid_objects
    return layout
