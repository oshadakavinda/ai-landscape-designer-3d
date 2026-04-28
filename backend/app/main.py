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

@app.post("/api/generate", response_model=LayoutOutput)
async def generate_design(input_data: LandscapeDesignInput):
    layout = generate_layout(input_data)
    return layout

@app.post("/api/test-llm")
async def test_llm_endpoint(input_data: LandscapeDesignInput):
    response = get_gemini_response(input_data)
    return {"response": response}
