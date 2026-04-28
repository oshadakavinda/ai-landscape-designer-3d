# Texture Assets

This folder contains all tileable texture images used in the 3D landscape viewer.

## Folder Structure

```
textures/
├── ground/          ← Applied to the full land base plane
│   ├── grass_1k.jpg
│   ├── stone_paving_1k.jpg
│   ├── bare_earth_1k.jpg
│   └── mixed_1k.jpg
└── surface/         ← Applied to individual flat objects (lawn, pond, driveway, etc.)
    ├── grass_patch_1k.jpg
    ├── water_1k.jpg
    ├── stone_1k.jpg
    ├── concrete_1k.jpg
    ├── flowers_1k.jpg
    └── soil_1k.jpg
```

## How to Add a Texture

### Step 1 — Download a free texture
Get a **seamless/tileable** texture from one of these free sources:
- **https://polyhaven.com/textures** — CC0, high quality, download at 1K resolution
- **https://ambientcg.com** — CC0, PBR-ready
- **https://freepbr.com** — free tier

Download the **JPEG version at 1K resolution** (1024×1024 px) for best performance.

### Step 2 — Place the file
Put the `.jpg` file in the correct subfolder:
- **Land ground**: `textures/ground/`
- **Object surface** (lawn, pond, driveway...): `textures/surface/`

### Step 3 — Register the path
Open `frontend/src/constants/texturePaths.js` and uncomment (or add) the entry:

```js
// For a ground texture:
export const GROUND_TEXTURES = {
  grass: '/textures/ground/grass_1k.jpg',   // ← add this line
};

// For a surface material texture:
export const SURFACE_TEXTURES = {
  grass:    '/textures/surface/grass_patch_1k.jpg',
  water:    '/textures/surface/water_1k.jpg',
  concrete: '/textures/surface/concrete_1k.jpg',
};
```

### Step 4 — Done!
The `Ground.jsx` and `FlatObject.jsx` components automatically pick up registered paths.
They fall back to solid colors (defined in `renderConfig.js`) when a texture file is missing.

## Tiling

Textures tile automatically based on the object's physical size:
- **Ground**: tiles every `GROUND_TILE_SIZE` meters (default: 4m per tile)
- **Surfaces**: tiles every `SURFACE_TILE_SIZE` meters (default: 2m per tile)

To adjust tiling density, change these constants in `texturePaths.js`.

## File Naming Convention

```
{type}_{resolution}.jpg
```

Examples: `grass_1k.jpg`, `stone_paving_1k.jpg`, `water_1k.jpg`
