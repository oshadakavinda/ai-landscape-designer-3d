import os
import json
from google import genai
from google.genai import types
from fastapi import HTTPException
from app.models.input_schema import LandscapeDesignInput

def get_gemini_response(input_data: LandscapeDesignInput):
    # Load prompt from JSON
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "data", "prompts.json")
    with open(prompt_path, "r") as f:
        prompts = json.load(f)
    
    system_prompt = prompts.get("system_prompt", "")
    user_template = prompts.get("user_prompt_template", "")

    # Format the user prompt safely
    replacements = {
        "{garden_style}": input_data.garden_style,
        "{width}": str(input_data.land.width),
        "{depth}": str(input_data.land.depth),
        "{unit}": input_data.land.unit,
        "{road_direction}": input_data.road_direction,
        "{house_x}": str(input_data.house.x),
        "{house_y}": str(input_data.house.y),
        "{house_w}": str(input_data.house.width),
        "{house_d}": str(input_data.house.depth),
        "{vastu_priority}": str(input_data.vastu_priority),
        "{vehicle_count}": str(input_data.vehicle_count),
        "{features}": ", ".join(input_data.optional_features)
    }
    
    user_prompt = user_template
    for placeholder, value in replacements.items():
        user_prompt = user_prompt.replace(placeholder, value)

    # Configure Gemini (new google-genai SDK)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Error: GEMINI_API_KEY not found in environment."
    
    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        )
        return response.text
    except Exception as e:
        error_msg = str(e).lower()
        if "quota" in error_msg or "resource" in error_msg or "429" in error_msg:
            raise HTTPException(status_code=429, detail="Gemini quota exceeded. Please wait and try again.")
        if "invalid" in error_msg and "key" in error_msg:
            raise HTTPException(status_code=400, detail="Invalid Gemini API key. Please check your .env file.")
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

