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

@app.post("/api/generate", response_model=LayoutOutput)
async def generate_design(input_data: LandscapeDesignInput):
    layout = generate_layout(input_data)
    return layout
