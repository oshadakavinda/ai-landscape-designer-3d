from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Literal

class LandInput(BaseModel):
    width: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    unit: Literal["m", "ft"] = "m"

class HouseInput(BaseModel):
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    rotation: float = 0.0  # in degrees


class CarParkInput(BaseModel):
    width: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    type: Literal["open", "covered"] = "open"


class LandscapeDesignInput(BaseModel):
    land: LandInput
    house: HouseInput
    car_park: Optional[CarParkInput] = None
    road_direction: Literal["north", "south", "east", "west"]

    vastu_priority: int = Field(..., ge=0, le=10)
    vehicle_count: int = Field(..., ge=0, le=4)
    optional_features: Dict[str, int] = Field(default_factory=dict)  # feature_type -> count
    ground_texture: Literal["grass", "stone_paving", "bare_earth", "mixed"] = "grass"
    wall_texture: Literal["brick", "concrete"] = "brick"

    @validator("house", "car_park")
    def objects_fit_land(cls, obj, values):
        land = values.get("land")
        if land and obj:
            # For objects with specific placement (like house)
            if hasattr(obj, "x"):
                if obj.x + obj.width > land.width:
                    raise ValueError(f"{obj.__class__.__name__} exceeds land width: {obj.x + obj.width} > {land.width}")
                if obj.y + obj.depth > land.depth:
                    raise ValueError(f"{obj.__class__.__name__} exceeds land depth: {obj.y + obj.depth} > {land.depth}")
            # For unplaced objects with just dimensions (like car park)
            else:
                if obj.width > land.width:
                    raise ValueError(f"{obj.__class__.__name__} width {obj.width} is greater than land width {land.width}")
                if obj.depth > land.depth:
                    raise ValueError(f"{obj.__class__.__name__} depth {obj.depth} is greater than land depth {land.depth}")
        return obj

