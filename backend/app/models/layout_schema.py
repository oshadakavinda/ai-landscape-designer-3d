from pydantic import BaseModel, Field
from typing import List, Optional

class LandOutput(BaseModel):
    width: float
    depth: float
    unit: str
    road_direction: str = "south"


class HouseOutput(BaseModel):
    x: float
    y: float
    width: float
    depth: float

class ZoneOutput(BaseModel):
    id: str
    type: str
    x: float
    y: float
    width: float
    depth: float

class ObjectOutput(BaseModel):
    id: str
    type: str
    variant: str
    x: float
    y: float
    width: float
    depth: float
    rotation: float = 0.0
    zoneId: Optional[str] = None

class UnplacedOutput(BaseModel):
    type: str
    reason: str

class ScoresOutput(BaseModel):
    vastuScore: int
    sustainabilityScore: int
    coolingScore: int
    spaceUtilizationScore: int

class LayoutOutput(BaseModel):
    land: LandOutput
    house: HouseOutput
    zones: List[ZoneOutput] = Field(default_factory=list)
    objects: List[ObjectOutput] = Field(default_factory=list)
    unplaced: List[UnplacedOutput] = Field(default_factory=list)
    scores: ScoresOutput
    recommendations: List[str] = Field(default_factory=list)
