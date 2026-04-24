import random
from app.models.layout_schema import ScoresOutput
from app.models.input_schema import LandscapeDesignInput

def calculate_scores(layout, input_data: LandscapeDesignInput) -> ScoresOutput:
    # Basic scoring logic
    vastu = 100 - (10 - input_data.vastu_priority) * 2
    
    total_area = input_data.land.width * input_data.land.depth
    used_area = input_data.house.width * input_data.house.depth
    for obj in layout.objects:
        used_area += (obj.width * obj.depth)
        
    utilization = min(100, int((used_area / total_area) * 100))
    if utilization < 30: utilization += 40
    
    return ScoresOutput(
        vastuScore=max(50, vastu - random.randint(0, 10)),
        sustainabilityScore=random.randint(70, 95),
        coolingScore=random.randint(65, 90),
        spaceUtilizationScore=utilization
    )
