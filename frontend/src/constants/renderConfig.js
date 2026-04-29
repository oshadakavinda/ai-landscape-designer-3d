/**
 * renderConfig.js
 * Central source of truth for all 3D render configuration constants.
 * When adding a new object type, add its height and color here.
 */

/** Default heights (meters) used by BoxFallback when a model has no height field */
export const FALLBACK_HEIGHTS = {
  bench:            0.6,
  pond:             0.1,
  fountain:         1.2,
  trees:            3.5,
  flower_beds:      0.15,
  vegetable_beds:   0.3,
  lawn:             0.02,
  pathway:          0.05,
  driveway:         0.05,
  garden_lights:    2.0,
  seating_area:     0.05,
  open_car_park:    0.05,
  covered_car_park: 2.0,
};

/** Object type → base fallback color (when no material or GLB is available) */
export const OBJECT_FALLBACK_COLORS = {
  bench:            '#8B6914',
  pond:             '#1a4a6b',
  fountain:         '#2563eb',
  trees:            '#166534',
  flower_beds:      '#9d174d',
  vegetable_beds:   '#4d7c0f',
  lawn:             '#15803d',
  pathway:          '#78716c',
  driveway:         '#52525b',
  garden_lights:    '#fbbf24',
  seating_area:     '#92400e',
  open_car_park:    '#475569',
  covered_car_park: '#334155',
};

/** Material name → flat surface color */
export const MATERIAL_COLORS = {
  grass:    '#2d5a1b',
  water:    '#1a4a6b',
  flowers:  '#7a2e6b',
  soil:     '#3d2010',
  stone:    '#4a4540',
  concrete: '#3a3a3a',
};

/** Ground type → solid colour used directly (no texture files needed) */
export const GROUND_BASE_COLORS = {
  grass:        '#4a7c3f',
  stone_paving: '#6b6560',
  bare_earth:   '#7a5c3a',
  mixed:        '#556b45',
};

/** Absolute height of the ground plane */
export const GROUND_HEIGHT = 0.03;

/** Minimal lift amount (meters) to prevent Z-fighting with surfaces */
export const LIFT = 0.01;

/** Fixed height (meters) for architectural elements that should not scale vertically */
export const ARCHITECTURAL_HEIGHT = 2.0;

/** Types that are considered architectural (use ARCHITECTURAL_HEIGHT for Y scaling) */
export const ARCHITECTURAL_TYPES = new Set(['covered_car_park']);
