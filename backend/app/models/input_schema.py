from pydantic import BaseModel, Field, validator
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
    ground_texture: Literal["grass", "stone_paving", "bare_earth", "mixed"] = "grass"

    @validator("house")
    def house_fits_land(cls, house, values):
        land = values.get("land")
        if land:
            if house.x + house.width > land.width:
                raise ValueError(f"House exceeds land width: {house.x + house.width} > {land.width}")
            if house.y + house.depth > land.depth:
                raise ValueError(f"House exceeds land depth: {house.y + house.depth} > {land.depth}")
        return house
