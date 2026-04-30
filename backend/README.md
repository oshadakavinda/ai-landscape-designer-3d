# AI Landscape Designer 3D — Backend

A **FastAPI** backend that generates intelligent, constraint-aware 2D landscape layouts for residential properties. It combines **Google Gemini AI** (for high-level placement intent) with deterministic local engines (for collision-free coordinate placement, pathway routing, Vastu Shastra compliance, and multi-metric scoring).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
  - [Input Schema](#input-schema)
  - [Output Schema](#output-schema)
- [Service Modules](#service-modules)
  - [Layout Engine](#layout-engine-layout_enginepy)
  - [LLM Service](#llm-service-llm_servicepy)
  - [Placement Engine](#placement-engine-placement_enginepy)
  - [Constraint Solver](#constraint-solver-constraint_solverpy)
  - [Scoring Engine](#scoring-engine-scoring_enginepy)
  - [Vastu Engine](#vastu-engine-vastu_enginepy)
- [Feature Catalog](#feature-catalog)
- [Prompt System](#prompt-system)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│                  POST /api/generate                      │
└────────────────────────┬─────────────────────────────────┘
                         │  LandscapeDesignInput (JSON)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    FastAPI Server                         │
│                      main.py                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Layout Engine (Orchestrator)           │  │
│  │                                                    │  │
│  │  1. Load Feature Catalog (JSON)                    │  │
│  │  2. Query Gemini → placement intent (OR mock)      │  │
│  │  3. Placement Engine → collision-free coords       │  │
│  │  4. Build compass zones                            │  │
│  │  5. Scoring Engine → Vastu / Sustainability /      │  │
│  │     Cooling / Space Utilization scores              │  │
│  │  6. Return LayoutOutput                            │  │
│  └────┬───────────┬───────────┬───────────┬───────────┘  │
│       │           │           │           │              │
│  ┌────▼───┐ ┌─────▼────┐ ┌───▼───┐ ┌─────▼─────┐       │
│  │Placement│ │ Scoring  │ │ Vastu │ │Constraint │       │
│  │ Engine  │ │ Engine   │ │Engine │ │  Solver   │       │
│  └────────┘ └──────────┘ └───────┘ └───────────┘       │
└──────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
backend/
├── .env                          # API keys (not committed)
├── requirements.txt              # Python dependencies
├── app/
│   ├── __init__.py               # Package marker
│   ├── main.py                   # FastAPI app, CORS, route definitions
│   ├── data/
│   │   ├── __init__.py
│   │   ├── feature_catalog.json  # All placeable landscape features & dimensions
│   │   └── prompts.json          # System + user prompt templates for Gemini
│   ├── models/
│   │   ├── __init__.py
│   │   ├── input_schema.py       # Pydantic models for request validation
│   │   └── layout_schema.py      # Pydantic models for response structure
│   └── services/
│       ├── __init__.py
│       ├── layout_engine.py      # Main orchestrator (Gemini + placement + scoring)
│       ├── llm_service.py        # Standalone Gemini test endpoint service
│       ├── placement_engine.py   # Collision-free grid placement & pathway routing
│       ├── constraint_solver.py  # Post-hoc overlap & bounds validation
│       ├── scoring_engine.py     # Multi-metric layout quality scorer
│       └── vastu_engine.py       # Vastu Shastra guideline generator
└── venv/                         # Python virtual environment (gitignored)
```

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- A **Google Gemini API key** (free tier works)

### Installation

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### Running the Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

| Variable         | Required | Description                          |
|------------------|----------|--------------------------------------|
| `GEMINI_API_KEY` | Yes      | Google Gemini API key for LLM calls  |

---

## API Endpoints

### `POST /api/generate`

**Primary endpoint.** Generates a complete landscape layout from user inputs.

- **Request Body**: `LandscapeDesignInput` (see [Input Schema](#input-schema))
- **Response**: `LayoutOutput` (see [Output Schema](#output-schema))
- **Current Mode**: Uses **mock intent** (deterministic, no LLM call) — the LLM integration is ready but disabled for offline testing.

#### Example Request

```json
{
  "land": { "width": 20, "depth": 15, "unit": "m" },
  "house": { "x": 5, "y": 5, "width": 8, "depth": 6 },
  "road_direction": "south",
  "vastu_priority": 7,
  "garden_style": "family",
  "vehicle_count": 1,
  "optional_features": ["trees", "bench", "pathway", "lawn"],
  "ground_texture": "grass"
}
```

#### Example Response (abbreviated)

```json
{
  "land": { "width": 20, "depth": 15, "unit": "m", "road_direction": "south", "ground_texture": "grass" },
  "house": { "x": 5, "y": 5, "width": 8, "depth": 6 },
  "zones": [
    { "id": "north", "type": "north", "x": 0, "y": 7.5, "width": 20, "depth": 7.5 },
    ...
  ],
  "objects": [
    { "id": "obj_001", "type": "trees", "variant": "tree_palm_01", "x": 0, "y": 7.5, "width": 4, "depth": 4, "height": 6.0, "rotation": 0, "zoneId": "north", "render_type": "model", "material": null },
    ...
  ],
  "pathways": [
    { "id": "path_001", "variant": "path_stone_01", "points": [[9.0, 0.0], [9.0, 5.0]], "width": 1.2, "material": "stone" }
  ],
  "unplaced": [],
  "scores": { "vastuScore": 100, "sustainabilityScore": 65, "coolingScore": 50, "spaceUtilizationScore": 40 },
  "recommendations": ["Vastu priority 7/10 applied.", "4 features placed, 1 pathways routed, 0 could not fit."]
}
```

---

### `POST /api/test-llm`

**Test endpoint.** Sends user input directly to Gemini and returns the raw LLM response. Useful for debugging prompt engineering.

- **Request Body**: `LandscapeDesignInput`
- **Response**: `{ "response": "<raw Gemini text>" }`

---

## Data Models

### Input Schema

Defined in `app/models/input_schema.py`.

#### `LandscapeDesignInput`

| Field              | Type                                                       | Description                                    |
|--------------------|------------------------------------------------------------|------------------------------------------------|
| `land`             | `LandInput` (`width`, `depth`, `unit`)                     | Land dimensions and unit (m/ft)                |
| `house`            | `HouseInput` (`x`, `y`, `width`, `depth`)                  | House position & size on the land              |
| `road_direction`   | `"north"` \| `"south"` \| `"east"` \| `"west"`            | Which side of the land faces the road          |
| `vastu_priority`   | `int` (0–10)                                               | Importance of Vastu Shastra compliance          |
| `garden_style`     | `"minimal"` \| `"family"` \| `"luxury"` \| `"agriculture"` \| `"mixed"` | Design style                   |
| `vehicle_count`    | `int` (0–4)                                                | Number of vehicles (affects parking placement) |
| `optional_features`| `list[str]`                                                | Features to include (e.g. `["trees", "pond"]`) |
| `ground_texture`   | `"grass"` \| `"stone_paving"` \| `"bare_earth"` \| `"mixed"` | Default ground material                     |

**Validation**: The `house_fits_land` validator ensures the house footprint does not exceed the land boundaries.

### Output Schema

Defined in `app/models/layout_schema.py`.

#### `LayoutOutput`

| Field             | Type                  | Description                                       |
|-------------------|-----------------------|---------------------------------------------------|
| `land`            | `LandOutput`          | Echoed land info with road direction & texture     |
| `house`           | `HouseOutput`         | Echoed house position and size                     |
| `zones`           | `list[ZoneOutput]`    | 5 compass zones (north, south, east, west, center) |
| `objects`         | `list[ObjectOutput]`  | All successfully placed landscape objects          |
| `pathways`        | `list[PathwayOutput]` | Routed pathways as waypoint arrays                 |
| `unplaced`        | `list[UnplacedOutput]`| Items that couldn't fit, with reasons              |
| `scores`          | `ScoresOutput`        | Quality metrics (0–100 each)                       |
| `recommendations` | `list[str]`           | Human-readable design notes                        |

#### `ObjectOutput`

Each placed object includes: `id`, `type`, `variant`, `x`, `y`, `width`, `depth`, `height`, `rotation`, `zoneId`, `render_type` (`"model"` | `"flat"` | `"path"`), and optional `material`.

#### `PathwayOutput`

Pathways are defined by a list of `(x, z)` waypoints instead of bounding boxes, plus a `width` and `material`.

#### `ScoresOutput`

| Score                   | Range  | Description                                     |
|-------------------------|--------|-------------------------------------------------|
| `vastuScore`            | 0–100  | Vastu Shastra compliance rating                  |
| `sustainabilityScore`   | 0–100  | Green coverage ratio (50% coverage → 100 score)  |
| `coolingScore`          | 0–100  | Shade & water feature coverage                   |
| `spaceUtilizationScore` | 0–100  | Total used area vs total land area               |

---

## Service Modules

### Layout Engine (`layout_engine.py`)

The **main orchestrator** that ties everything together:

1. **Loads the feature catalog** from `data/feature_catalog.json`
2. **Generates placement intent** — currently via `_mock_intent()` (deterministic fallback), with `_ask_llm()` ready for Gemini-powered placement
3. **Calls the placement engine** to convert intent into exact, collision-free coordinates
4. **Builds compass zones** (north, south, east, west, center)
5. **Calculates quality scores** via the scoring engine
6. **Returns a complete `LayoutOutput`**

**Switching to LLM mode**: Replace `_mock_intent(input_data)` with `_ask_llm(input_data, catalog)` on line 199.

### LLM Service (`llm_service.py`)

A standalone service used by the `/api/test-llm` endpoint:

- Loads prompts from `data/prompts.json`
- Replaces template placeholders with actual input values
- Calls **Gemini 2.5 Flash** with a system instruction
- Handles errors: quota exhaustion (429), invalid API key (400), generic failures (500)

### Placement Engine (`placement_engine.py`)

Converts high-level intent (`type + variant + zone`) into exact coordinates:

- **Grid scanning**: Iterates over the target zone in 0.5m steps to find the first valid position
- **Collision detection**: Checks against the house and all previously placed objects (with 0.5m minimum spacing)
- **Zone fallback**: If the preferred zone is full, tries all 9 compass zones in order
- **Pathway routing**: Special handling — routes a straight-line path from the road edge to the house entrance based on `road_direction`
- **Render type awareness**: Objects with `render_type: "path"` are routed as waypoint arrays, not grid-placed

### Constraint Solver (`constraint_solver.py`)

A post-processing validation layer (available but not currently called in the main pipeline):

- **Boundary check**: Ensures every object fits within the land
- **Overlap check**: Removes objects that overlap with the house or each other
- Moves invalid objects to the `unplaced` list with descriptive reasons

### Scoring Engine (`scoring_engine.py`)

Calculates four quality metrics (0–100 each):

| Metric           | How It's Calculated                                                  |
|------------------|----------------------------------------------------------------------|
| **Vastu Score**  | Base = `vastu_priority × 10`, bonus up to +30 for objects in Vastu-preferred zones |
| **Sustainability** | Green coverage ratio × 200, floored at 20 (50% green → 100 score) |
| **Cooling**      | Shade/water coverage ratio × 250, with solar penalty for south/east-facing roads |
| **Space Utilization** | Total used area (house + objects + paths) / land area × 100      |

**Vastu-preferred zones** are defined per feature type (e.g., trees → north/north_east/east, pond → north/north_east).

### Vastu Engine (`vastu_engine.py`)

Generates Vastu Shastra guidelines as text to be injected into the LLM prompt:

- **Priority ≤ 3**: Basic layout, no strict constraints
- **Priority 4–7**: Soft guidelines (water features → North/East, green spaces → North/East)
- **Priority ≥ 8**: Strict Vastu rules enforced (water MUST be in NE, no heavy structures in NE corner, parking in SE/NW for south/west-facing roads)

---

## Feature Catalog

Defined in `app/data/feature_catalog.json`. Each feature type has one or more variants with physical dimensions:

| Type              | Variants                        | Render Type | Notes                     |
|-------------------|---------------------------------|-------------|---------------------------|
| `bench`           | `bench_wood_01`, `bench_stone_01` | model      | 2.0×1.0m, 2.0×0.7m       |
| `pond`            | `pond_small_01`, `pond_large_01`  | flat        | Water material            |
| `fountain`        | `fountain_round_01`              | model       | 1.5×1.5m, 1.2m tall       |
| `trees`           | `tree_oak_01`, `tree_palm_01`     | model       | 4.0×4.0m, 5–6m tall       |
| `flower_beds`     | `flower_bed_rect_01`             | flat        | Flowers material           |
| `vegetable_beds`  | `veg_bed_raised_01`              | model       | Soil material              |
| `lawn`            | `lawn_patch_01`                  | flat        | 5.0×5.0m grass patch       |
| `pathway`         | `path_stone_01`, `path_concrete_01` | path     | Routed as waypoints        |
| `driveway`        | `driveway_paved_01`              | flat        | 3.0×6.0m concrete          |
| `garden_lights`   | `light_post_01`                  | model       | 0.2×0.2m, 2.0m tall        |
| `seating_area`    | `seating_patio_01`               | flat        | 4.0×4.0m stone             |
| `open_car_park`   | `car_park_open_01`               | flat        | 3.0×5.5m concrete          |
| `covered_car_park`| `car_park_covered_01`            | model       | 3.5×6.0m, 2.0m tall        |

---

## Prompt System

`app/data/prompts.json` contains:

- **`system_prompt`**: Instructs Gemini to generate JSON-only landscape layouts
- **`user_prompt_template`**: A compact template with placeholders (`{width}`, `{depth}`, `{garden_style}`, etc.) that gets filled with actual input values at runtime

The prompt encodes placement rules: origin at SW corner, no overlaps, minimum 0.5m spacing, path from road to house, parking near road, and Vastu guidelines.

---

## Design Decisions

1. **Hybrid AI + Deterministic Approach**: The LLM decides *what* to place and *where* (zone-level), but exact coordinates are computed locally. This avoids LLM hallucination of coordinates while leveraging its design reasoning.

2. **Mock Fallback**: The `_mock_intent()` function maps user-selected features to sensible default zones, enabling offline development without API calls.

3. **Catalog-Driven Dimensions**: All object sizes come from the catalog JSON, never from the LLM. This guarantees dimensional accuracy for the 3D renderer.

4. **Zone-Based Placement**: The land is divided into 9 compass zones. The LLM (or mock) assigns each feature to a zone, then the placement engine finds exact coordinates within that zone.

5. **Graceful Degradation**: If placement fails for an object, it's moved to the `unplaced` list with a reason — the layout is always valid, never crashes.

6. **Scoring Transparency**: Each score (Vastu, sustainability, cooling, space utilization) is computed independently with clear formulas, making the system auditable.
