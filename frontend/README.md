# AI Landscape Designer 3D — Frontend

A **React + Three.js** single-page application that provides an interactive design studio for AI-generated landscape layouts. Users configure their plot, house, and desired features via a sidebar form, then visualize the generated layout in both a **2D SVG floor plan** and a fully interactive **3D WebGL scene** with orbit controls, GLB model loading, textured grounds, and real-time quality scoring.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Technology Stack](#technology-stack)
- [Application Layout](#application-layout)
- [Component Guide](#component-guide)
  - [App (Root)](#app-root)
  - [Sidebar Components](#sidebar-components)
  - [2D Viewer](#2d-viewer)
  - [3D Viewer](#3d-viewer)
  - [Score Panel](#score-panel)
- [Data & Configuration](#data--configuration)
  - [API Service](#api-service)
  - [Feature Catalog](#feature-catalog)
  - [Render Config](#render-config)
  - [Texture System](#texture-system)
  - [Example Layout](#example-layout)
- [Custom Hooks](#custom-hooks)
- [Styling System](#styling-system)
- [Static Assets](#static-assets)
  - [3D Models (GLB)](#3d-models-glb)
  - [Textures](#textures)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                           App.jsx (Root)                             │
│   State: layout, isLoading, activeTab, error, has3dMounted           │
│                                                                       │
│  ┌──────────────┐  ┌────────────────────────────────────────────────┐ │
│  │   Sidebar     │  │              Viewer Area                      │ │
│  │              │  │                                                │ │
│  │  LayoutForm  │  │  ┌──────┐ ┌──────┐                            │ │
│  │  (form input) │  │  │ 2D   │ │ 3D   │  ← Tab Toggle             │ │
│  │              │  │  │ Plan │ │ View │                            │ │
│  │  Object      │  │  └──┬───┘ └──┬───┘                            │ │
│  │  Inspector   │  │     │        │                                │ │
│  │  (placed     │  │  TopViewSvg  ThreeDViewer                     │ │
│  │   objects)   │  │  (SVG)       (Canvas + R3F)                   │ │
│  └──────────────┘  │     │              │                          │ │
│                    │     │     ┌────────┼────────┐                  │ │
│                    │     │     │ scene/ │objects/ │                  │ │
│                    │     │     │Ground  │LandscapeObject            │ │
│                    │     │     │House   │FlatObject                 │ │
│                    │     │     │Road    │GLBModel                   │ │
│                    │     │     │Land-   │PathwayMesh                │ │
│                    │     │     │Boundary│ModelErrorBoundary          │ │
│                    │     │     └────────┴────────┘                  │ │
│                    │                                                │ │
│                    │  ┌──────────┐  ┌────────────┐  ┌────────────┐ │ │
│                    │  │ Unplaced │  │Recommend-  │  │ Score      │ │ │
│                    │  │ Banner   │  │ations Strip│  │ Panel      │ │ │
│                    │  └──────────┘  └────────────┘  └────────────┘ │ │
│                    └────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                               │
                     axios POST /api/generate
                               │
                    ┌───────────▼───────────┐
                    │   FastAPI Backend     │
                    │   (localhost:8000)    │
                    └──────────────────────┘
```

---

## Project Structure

```
frontend/
├── index.html                           # Entry HTML (Inter font, meta tags)
├── package.json                         # Dependencies & scripts
├── vite.config.js                       # Vite + React plugin
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── models/                          # GLB 3D models
│   │   ├── bench/                       # bench_wood_01.glb, bench_stone_01.glb
│   │   ├── car_park/                    # car_park_open_01.glb, car_park_covered_01.glb
│   │   ├── decor/
│   │   ├── flower_beds/                 # flower_bed_rect_01.glb, etc.
│   │   ├── fountain/                    # fountain_round_01.glb
│   │   ├── pond/                        # pond_small_01.glb, pond_large_01.glb
│   │   └── trees/                       # tree_oak_01.glb, tree_palm_01.glb
│   └── textures/
│       ├── ground/                      # Land base textures (grass, stone, etc.)
│       ├── road/                        # Road surface textures
│       └── README.md                    # Instructions for adding new textures
└── src/
    ├── main.jsx                         # React entry point (StrictMode + root render)
    ├── App.jsx                          # Root component (state management, layout shell)
    ├── App.css                          # Intentionally empty (all styles in index.css)
    ├── index.css                        # Global design system (570 lines)
    ├── api/
    │   └── landscapeApi.js              # Axios wrapper for backend API
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/
    │   ├── ScorePanel.jsx               # Quality metric bar charts
    │   ├── LayoutForm.jsx               # (Legacy) — replaced by sidebar/LayoutForm.jsx
    │   ├── TopViewSvg.jsx               # (Legacy) — replaced by viewer2d/TopViewSvg.jsx
    │   ├── ThreeDLayout.jsx             # (Legacy) — replaced by viewer3d/
    │   ├── sidebar/
    │   │   ├── LayoutForm.jsx           # Design input form (land, house, features)
    │   │   └── ObjectInspector.jsx      # Placed objects & pathways data table
    │   ├── viewer2d/
    │   │   └── TopViewSvg.jsx           # SVG 2D floor plan renderer
    │   └── viewer3d/
    │       ├── index.jsx                # Canvas setup, lighting, scene composition
    │       ├── objects/
    │       │   ├── LandscapeObject.jsx  # Object dispatcher (model vs flat vs fallback)
    │       │   ├── FlatObject.jsx       # Flat surface renderer (lawn, pond, driveway)
    │       │   ├── GLBModel.jsx         # Auto-scaling GLB model loader
    │       │   ├── PathwayMesh.jsx      # Waypoint-based pathway renderer
    │       │   └── ModelErrorBoundary.jsx  # Graceful GLB load failure handler
    │       └── scene/
    │           ├── Ground.jsx           # Textured ground plane
    │           ├── House.jsx            # 3D house with roof and walls
    │           ├── Road.jsx             # Road strip with label
    │           ├── LandBoundary.jsx     # Glowing land boundary frame
    │           └── Garage.jsx           # Garage/car park structure
    ├── constants/
    │   ├── renderConfig.js              # Heights, colors, material maps, lift constants
    │   └── texturePaths.js              # Texture file path registry & tiling config
    ├── data/
    │   ├── featureCatalog.js            # Feature list, color maps, model paths, dimensions
    │   └── exampleLayout.json           # Pre-built demo layout (30×40m luxury garden)
    └── hooks/
        └── useSceneTexture.js           # Safe async texture loader with tiling
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- Backend server running at `http://localhost:8000` (see backend README)

### Installation

```bash
cd frontend
npm install
```

### Running the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Available Scripts

| Script           | Command              | Description                        |
|------------------|----------------------|------------------------------------|
| `npm run dev`    | `vite`               | Start development server with HMR  |
| `npm run build`  | `vite build`         | Production build to `dist/`        |
| `npm run preview`| `vite preview`       | Preview production build locally   |
| `npm run lint`   | `eslint .`           | Lint all source files              |

---

## Technology Stack

| Technology            | Version   | Purpose                                    |
|-----------------------|-----------|--------------------------------------------|
| **React**             | 19.x      | UI framework                               |
| **Vite**              | 8.x       | Build tool & dev server                    |
| **Three.js**          | 0.184     | 3D rendering engine                        |
| **React Three Fiber** | 9.x       | React renderer for Three.js                |
| **React Three Drei**  | 10.x      | Helpers: OrbitControls, Grid, Text, GLTF   |
| **Axios**             | 1.x       | HTTP client for backend API                |
| **React Router DOM**  | 7.x       | Client-side routing (future use)           |

---

## Application Layout

The app uses a **sidebar + main viewer** layout that fills the full viewport:

```
┌─────────────────────────────────────────────────────┐
│  Header  🌿 AI Landscape Designer    [✨ Use Example] │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  [🗺️ 2D Plan] [🧊 3D View]  ← Tabs      │
│ 340px    │                                          │
│          │  ┌──────────────────────────────────┐    │
│ Land     │  │                                  │    │
│ House    │  │     Canvas (SVG or WebGL)         │    │
│ Config   │  │                                  │    │
│ Features │  │                                  │    │
│ Generate │  └──────────────────────────────────┘    │
│          │  ⚠️ Unplaced: ...                        │
│ ─────────│  💡 Recommendations                      │
│ Objects  │  ┌──Scores──────────────────────────┐    │
│ Inspector│  │ Vastu │ Sustainability │ Cooling  │    │
│          │  └──────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────┘
```

---

## Component Guide

### App (Root)

**File**: `src/App.jsx`

Manages all top-level state:

| State           | Type          | Description                                      |
|-----------------|---------------|--------------------------------------------------|
| `layout`        | `object|null` | Complete layout response from the backend        |
| `isLoading`     | `boolean`     | True while API request is in flight              |
| `activeTab`     | `'2d'|'3d'`   | Currently visible viewer tab                     |
| `error`         | `string|null` | Error message displayed as a toast               |
| `has3dMounted`  | `boolean`     | Tracks if 3D viewer has been lazy-mounted        |

**Key behaviors**:
- **Example layout**: Loads `exampleLayout.json` instantly without an API call
- **Lazy 3D mount**: The WebGL canvas is only created on first 3D tab click, then kept alive using `visibility: hidden` (not `display: none`) to preserve the GL context
- **Error toast**: Click-to-dismiss error notifications

---

### Sidebar Components

#### LayoutForm (`sidebar/LayoutForm.jsx`)

The main design input form with sections:

| Section              | Fields                                              |
|----------------------|-----------------------------------------------------|
| 📐 Land Dimensions   | Width, Depth (5–200), Unit (m/ft)                   |
| 🏠 House Placement   | Position X, Position Y, Width, Depth                |
| ⚙️ Site Configuration| Road Direction, Garden Style, Vehicles, Ground Texture, Vastu Priority (0–10 slider) |
| 🌿 Landscape Features| 13 toggleable feature chips (checkbox grid)         |
| ✨ Generate           | Submit button with loading spinner                  |

**Default values**: 20×30m land, house at (5,8) size 10×9, south road, family style, 1 vehicle, bench + trees + lawn + pathway selected.

#### ObjectInspector (`sidebar/ObjectInspector.jsx`)

Displays a data table of all placed objects and routed pathways from the layout response:
- **Objects**: Type, position (X,Y), size (W×D)
- **Pathways**: Variant name, start point, width

---

### 2D Viewer

#### TopViewSvg (`viewer2d/TopViewSvg.jsx`)

A pure SVG renderer (600×500 viewBox) showing the layout from above:

- **Land boundary** with 1m grid pattern
- **Compass zones** as dashed overlays
- **House** centered with label
- **Pathways** as thick polylines with center-line dashes
- **Objects** as colored, labeled rectangles with tooltips
- **Compass** indicator (top-right)
- **Scale bar** showing 5-unit reference (bottom)

Objects are colored using `OBJECT_COLORS` from the feature catalog and `MATERIAL_COLORS` from render config. The SVG scales responsively to fit the container.

---

### 3D Viewer

#### ThreeDViewer (`viewer3d/index.jsx`)

The main 3D canvas entry point using React Three Fiber:

- **Camera**: Positioned dynamically based on land dimensions, 50° FOV
- **Lighting**: Ambient (0.4) + directional with 2048×2048 shadow map + green-tinted point light + hemisphere sky
- **Controls**: OrbitControls with max polar angle (prevents looking under the ground), distance limits
- **Grid**: 1m cells, 5m sections, fading at distance

#### Scene Components (`viewer3d/scene/`)

| Component         | Description                                                    |
|-------------------|----------------------------------------------------------------|
| **Ground.jsx**    | Textured ground plane using `useSceneTexture` hook; falls back to solid color if texture missing |
| **House.jsx**     | Multi-mesh house with walls, roof structure, and "HOUSE" label |
| **Road.jsx**      | Road strip positioned on the correct side based on `road_direction`, with text label |
| **LandBoundary.jsx** | Dark base frame with green emissive glow border             |
| **Garage.jsx**    | Dedicated garage/car park 3D structure                        |

#### Object Components (`viewer3d/objects/`)

| Component                | Description                                              |
|--------------------------|----------------------------------------------------------|
| **LandscapeObject.jsx**  | Dispatcher — routes to FlatObject, GLBModel, or BoxFallback based on `render_type` and model availability |
| **FlatObject.jsx**       | Thin box mesh for flat surfaces (lawn, pond, driveway) with material-based coloring; water gets low roughness + transparency |
| **GLBModel.jsx**         | Loads `.glb` files via `useGLTF`, auto-scales to match catalog dimensions, aligns to ground plane |
| **PathwayMesh.jsx**      | Renders waypoint pairs as rotated box segments forming a continuous path |
| **ModelErrorBoundary.jsx** | React error boundary — catches GLB load failures and renders a colored box fallback |

**Object rendering pipeline**:
```
LandscapeObject receives obj
    ├── render_type === "flat" → FlatObject (colored box mesh)
    ├── render_type === "model" && has GLB → GLBModel (wrapped in Suspense + ErrorBoundary)
    └── fallback → BoxFallback (simple colored box)
```

---

### Score Panel

**File**: `components/ScorePanel.jsx`

Displays four quality metrics as animated horizontal bar charts:

| Metric           | Color    | Source                  |
|------------------|----------|------------------------|
| Vastu            | `#a78bfa` | `scores.vastuScore`    |
| Sustainability   | `#4ade80` | `scores.sustainabilityScore` |
| Cooling          | `#38bdf8` | `scores.coolingScore`  |
| Space Usage      | `#f59e0b` | `scores.spaceUtilizationScore` |

Each bar animates on appearance with a 0.8s cubic-bezier transition.

---

## Data & Configuration

### API Service

**File**: `src/api/landscapeApi.js`

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

| Function                   | Method | Endpoint          | Description                |
|----------------------------|--------|-------------------|----------------------------|
| `generateLandscapeDesign`  | POST   | `/api/generate`   | Sends form data, returns full layout |

### Feature Catalog

**File**: `src/data/featureCatalog.js`

Central source of truth for feature metadata used across the app:

| Export              | Purpose                                                      |
|---------------------|--------------------------------------------------------------|
| `FEATURES`          | Array of `{ key, label }` for the 13 toggleable feature chips |
| `OBJECT_COLORS`     | Type → 2D SVG fill color (lighter palette)                   |
| `OBJECT_COLORS_3D`  | Type → 3D fallback color (deeper, more realistic palette)    |
| `MODEL_PATHS`       | Variant ID → GLB file path in `/public/models/`             |
| `OBJECT_DIMENSIONS` | Variant ID → `{ width, depth, height }` for rendering       |

### Render Config

**File**: `src/constants/renderConfig.js`

Centralized 3D rendering constants:

| Export                    | Description                                          |
|---------------------------|------------------------------------------------------|
| `FALLBACK_HEIGHTS`        | Default heights per type when model has no height    |
| `OBJECT_FALLBACK_COLORS`  | Base fallback colors for box rendering               |
| `MATERIAL_COLORS`         | Material name → flat surface color                   |
| `GROUND_BASE_COLORS`      | Ground type → solid color (no texture fallback)      |
| `GROUND_HEIGHT`           | Ground plane Y position (0.03m)                      |
| `LIFT`                    | Z-fighting prevention offset (0.01m)                 |
| `ARCHITECTURAL_HEIGHT`    | Fixed height for architectural elements (2.0m)       |
| `ARCHITECTURAL_TYPES`     | Set of types using fixed Y scaling (`covered_car_park`) |

### Texture System

**File**: `src/constants/texturePaths.js`

Registry for all texture file paths with documentation on how to add new ones:

| Export               | Description                                             |
|----------------------|---------------------------------------------------------|
| `GROUND_TEXTURES`    | Ground type → texture file path (grass, stone_paving)   |
| `SURFACE_TEXTURES`   | Material name → surface texture path (mostly commented out, ready to activate) |
| `ROAD_TEXTURES`      | Road surface texture paths                              |
| `GROUND_TILE_SIZE`   | Meters per tile repeat for ground (2m)                  |
| `SURFACE_TILE_SIZE`  | Meters per tile repeat for surfaces (2m)                |
| `ROAD_TILE_SIZE`     | Meters per tile repeat for roads (4m)                   |

**Adding new textures**:
1. Download seamless texture (512×512 or 1024×1024) from [Poly Haven](https://polyhaven.com/textures) or [AmbientCG](https://ambientcg.com)
2. Place in `public/textures/{category}/`
3. Add the path to the relevant map in `texturePaths.js`
4. The Ground/FlatObject components auto-detect and use it

### Example Layout

**File**: `src/data/exampleLayout.json`

A pre-built demo layout (30×40m luxury garden with north road) containing:
- 13 objects: covered car park, pond, fountain, bench, flower beds (×3), palm trees (×7)
- 1 pathway: stone path from road to house
- High scores: Vastu 85, Sustainability 90, Cooling 80, Space 95

---

## Custom Hooks

### `useSceneTexture`

**File**: `src/hooks/useSceneTexture.js`

Safe async texture loader for Three.js:

```javascript
const texture = useSceneTexture('/textures/ground/grass_1k.jpg', repeatX, repeatZ);
// Returns THREE.Texture | null
```

- Loads texture asynchronously with `THREE.TextureLoader`
- Sets up `RepeatWrapping` and configures tiling based on land dimensions
- Returns `null` gracefully if the file is missing (no crash)
- Uses `SRGBColorSpace` for correct color rendering

---

## Styling System

**File**: `src/index.css` (570 lines)

The entire design system is in a single CSS file using CSS custom properties:

### Design Tokens

```css
--bg-dark:        #0a0e1a     /* App background */
--bg-card:        #111827     /* Card / sidebar background */
--bg-glass:       rgba(17, 24, 39, 0.85)
--accent-green:   #63be7b     /* Primary accent */
--accent-sky:     #38bdf8     /* Secondary accent */
--accent-amber:   #f59e0b     /* Warning / space score */
--accent-red:     #f87171     /* Error / unplaced */
--text-primary:   #f1f5f9
--text-secondary: #94a3b8
--text-muted:     #4b5563
--radius:         12px
--transition:     0.22s cubic-bezier(0.4, 0, 0.2, 1)
```

### Key CSS Sections

| Section               | Description                                               |
|-----------------------|-----------------------------------------------------------|
| Layout Shell          | Full-height flexbox (`app-shell`, `app-header`, `app-body`) |
| Sidebar               | 340px fixed-width scrollable panel                         |
| Form Controls          | Dark-themed inputs, selects with green focus rings         |
| Vastu Slider           | Custom range input with gradient track and glowing thumb   |
| Feature Checkboxes     | 2-column grid of togglable chips with check animation      |
| Generate Button        | Green gradient with hover lift, glow shadow, and spinner   |
| View Tabs              | Pill-style tab switcher (2D / 3D)                         |
| Canvas Container       | Fills remaining space, radial gradient background          |
| Score Panel            | Horizontal bar charts with animated fills                  |
| Unplaced Banner        | Red-tinted warning strip for items that couldn't fit       |
| Error Toast            | Fixed-position bottom-right dismissible notification       |
| Responsive             | Sidebar stacks vertically on mobile (≤768px)              |

**Typography**: Inter (Google Fonts), loaded via `index.html`.

---

## Static Assets

### 3D Models (GLB)

Located in `public/models/`, organized by type:

```
models/
├── bench/          bench_wood_01.glb, bench_stone_01.glb
├── car_park/       car_park_open_01.glb, car_park_covered_01.glb
├── decor/
├── flower_beds/    flower_bed_rect_01.glb, flower_bed_rect_02.glb, flower_bed_round_01.glb
├── fountain/       fountain_round_01.glb
├── pond/           pond_small_01.glb, pond_large_01.glb
└── trees/          tree_oak_01.glb, tree_palm_01.glb
```

Models are loaded via `useGLTF` (drei) and auto-scaled by `GLBModel.jsx` to match catalog dimensions. If a model fails to load, the `ModelErrorBoundary` catches the error and renders a colored box fallback.

### Textures

Located in `public/textures/`:

```
textures/
├── ground/         Land base textures (grass, stone paving, etc.)
├── road/           Road surface textures (asphalt)
└── README.md       Instructions for sourcing and adding textures
```

---

## Design Decisions

1. **Lazy 3D Mount**: The WebGL canvas is only created when the user first clicks the 3D tab, then kept alive with `visibility: hidden`. This avoids the expensive GL context creation on page load while preventing context destruction on tab switch.

2. **Render Type Dispatch**: Objects follow a 3-tier rendering strategy — `"flat"` surfaces use simple box meshes (no model needed), `"model"` objects load GLB files with fallback boxes, and `"path"` types are routed as waypoint segments. This keeps the scene performant.

3. **Fallback-First Loading**: Every 3D object has a guaranteed visual representation. GLB models are wrapped in both `<Suspense>` (loading state) and `<ModelErrorBoundary>` (failed state), both of which render colored boxes so the scene is never broken.

4. **Centralized Config**: All heights, colors, material maps, and texture paths live in `constants/` and `data/`, not scattered across components. Adding a new feature type requires editing only `featureCatalog.js` and `renderConfig.js`.

5. **CSS-Only Design System**: All styles live in `index.css` using CSS custom properties. No CSS framework dependency — the dark-themed glassmorphism design is entirely hand-crafted.

6. **SVG 2D View**: The floor plan uses pure SVG (not a canvas) for crisp rendering at any zoom level, easy tooltips, and zero WebGL overhead. Coordinate transforms (`wx`/`wy`) handle the Y-axis flip from backend coordinates (origin = SW) to SVG coordinates (origin = top-left).

7. **Dimension Accuracy**: Object sizes in the 3D scene come from `OBJECT_DIMENSIONS` in the feature catalog, not from the backend response width/depth. This ensures visual consistency between the model's expected appearance and its on-screen size.
