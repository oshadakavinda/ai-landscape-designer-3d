from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class LandInput(BaseModel):
    width: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    unit: Literal["m", "ft"] = "m"

class HouseInput(BaseModel):
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)

class LandscapeDesignInput(BaseModel):
    land: LandInput
    house: HouseInput
    road_direction: Literal["north", "south", "east", "west"]
    vastu_priority: int = Field(..., ge=0, le=10)
    garden_style: Literal["minimal", "family", "luxury", "agriculture", "mixed"]
    vehicle_count: int = Field(..., ge=0, le=4)
    optional_features: List[str] = Field(default_factory=list)
