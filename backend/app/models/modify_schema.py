from pydantic import BaseModel, Field
from typing import Optional
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import LayoutOutput


class ModifyDesignInput(BaseModel):
    """Request body for the /api/modify endpoint."""
    current_layout: LayoutOutput
    user_prompt: str = Field(..., min_length=1, max_length=1000)
    input_data: LandscapeDesignInput
