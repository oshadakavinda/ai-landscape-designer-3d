from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.input_schema import LandscapeDesignInput
from app.models.layout_schema import LayoutOutput
from app.services.layout_engine import generate_layout
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Landscape Designer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.services.llm_service import get_gemini_response
from app.models.modify_schema import ModifyDesignInput
from app.services.modify_engine import modify_layout

@app.post("/api/generate", response_model=LayoutOutput)
async def generate_design(input_data: LandscapeDesignInput):
    layout = generate_layout(input_data)
    return layout

@app.post("/api/modify", response_model=LayoutOutput)
async def modify_design(body: ModifyDesignInput):
    """Modify an existing layout based on a natural language prompt."""
    layout = modify_layout(body.current_layout, body.user_prompt, body.input_data)
    return layout

@app.post("/api/test-llm")
async def test_llm_endpoint(input_data: LandscapeDesignInput):
    response = get_gemini_response(input_data)
    return {"response": response}

@app.get("/api/test-llm-direct")
async def test_llm_direct(prompt: str = "hello"):
    from app.services.llm_service import test_gemini_direct
    response = test_gemini_direct(prompt)
    return {"response": response}

