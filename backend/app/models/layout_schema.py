from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Tuple

class LandOutput(BaseModel):
    width: float
    depth: float
    unit: str
    road_direction: str = "south"
    ground_texture: str = "grass"

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
    height: float = 0.5                         # real-world height in meters
    rotation: float = 0.0
    zoneId: Optional[str] = None
    render_type: str = "model"                  # "model" | "flat" | "path"
    material: Optional[str] = None              # "grass" | "stone" | "concrete" | etc.

class PathwayOutput(BaseModel):
    """A routed path defined by waypoints rather than a bounding box."""
    id: str
    variant: str
    points: List[Tuple[float, float]]           # [(x, z), ...] in world-space meters
    width: float = 1.2
    material: str = "stone"

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
    pathways: List[PathwayOutput] = Field(default_factory=list)
    unplaced: List[UnplacedOutput] = Field(default_factory=list)
    scores: ScoresOutput
    recommendations: List[str] = Field(default_factory=list)
