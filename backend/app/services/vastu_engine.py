def get_vastu_prompt_guidelines(priority: int, road_direction: str) -> str:
    if priority <= 3:
        return "Vastu priority is LOW. Apply basic logical layout. No strict Vastu constraints."
    
    guidelines = []
    if priority >= 4:
        guidelines.append("- If possible, place water features (pond, fountain) towards the North or East.")
        guidelines.append("- Prefer green spaces (lawn, flower beds) in the North or East.")
        guidelines.append(f"- The road is on the {road_direction}. Ensure clear access from the road to the house.")
        
    if priority >= 8:
        guidelines.append("- STRICT VASTU: Water elements MUST be in the North, East, or North-East unless physically impossible.")
        guidelines.append("- STRICT VASTU: Avoid placing heavy structures or trees in the exact North-East corner.")
        if road_direction in ["south", "west"]:
            guidelines.append("- STRICT VASTU: Parking should ideally be in South-East or North-West.")
            
    return "\n".join(guidelines)
