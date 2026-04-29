/**
 * texturePaths.js
 * Maps logical texture names to their file paths in /public/textures/.
 *
 * HOW TO ADD A NEW TEXTURE:
 *  1. Download a seamless/tileable texture image (JPG or PNG, 512x512 or 1024x1024).
 *  2. Place it in the correct folder under frontend/public/textures/.
 *  3. Add the path to the relevant map below.
 *  4. The Ground or FlatObject component will automatically pick it up.
 *
 * WHERE TO GET FREE TEXTURES:
 *  - https://polyhaven.com/textures  (CC0 license, production quality)
 *  - https://ambientcg.com           (CC0 license, PBR-ready)
 *  - https://freepbr.com             (free tier available)
 *
 * FILE NAMING CONVENTION:
 *  {type}_{resolution}.jpg  e.g.  grass_1k.jpg, stone_paving_1k.jpg
 */

/**
 * Ground texture paths.
 * These are applied to the full land base plane.
 * Keys match the `ground_texture` field from the backend response (`land.ground_texture`).
 *
 * @example
 *   // In Ground.jsx:
 *   const path = GROUND_TEXTURES[land.ground_texture];
 *   // if path is defined, load with useLoader(TextureLoader, path)
 *   // if undefined, fall back to GROUND_BASE_COLORS[land.ground_texture]
 */
export const GROUND_TEXTURES = {
  grass: '/textures/ground/brown_mud_leaves_01_diff_4k.jpg',
  stone_paving: '/textures/ground/stone_tiles.jpg',
  // bare_earth:   '/textures/ground/bare_earth_1k.jpg',
  // mixed:        '/textures/ground/mixed_1k.jpg',
};

/**
 * Surface material texture paths.
 * Applied to flat objects (lawn patches, ponds, driveways, seating areas, etc.).
 * Keys match the `material` field on each ObjectOutput.
 *
 * @example
 *   // In FlatObject.jsx:
 *   const path = SURFACE_TEXTURES[obj.material];
 *   // if path is defined, load with useLoader(TextureLoader, path)
 *   // if undefined, fall back to MATERIAL_COLORS[obj.material]
 */
export const SURFACE_TEXTURES = {
  // grass:    '/textures/surface/grass_patch_1k.jpg',   // ← Uncomment when file is added
  // water:    '/textures/surface/water_1k.jpg',
  // stone:    '/textures/surface/stone_1k.jpg',
  // concrete: '/textures/surface/concrete_1k.jpg',
  // flowers:  '/textures/surface/flowers_1k.jpg',
  // soil:     '/textures/surface/soil_1k.jpg',
};

/**
 * Tiling repeat scale for ground textures.
 * Controls how many times a texture tiles across the land.
 * Larger land = more repeats to keep the texture looking right.
 * Formula used: repeat = landDimension / TILE_SIZE
 */
export const GROUND_TILE_SIZE = 2; // meters per tile repeat

/**
 * Tiling repeat scale for surface material textures.
 */
export const SURFACE_TILE_SIZE = 2; // meters per tile repeat

/**
 * Road textures.
 */
export const ROAD_TEXTURES = {
  asphalt: '/textures/road/asphalt_1k.png',
};

export const ROAD_TILE_SIZE = 4;
