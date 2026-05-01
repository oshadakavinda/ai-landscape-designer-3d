export const FEATURES = [
  { key: 'bench', label: '🪑 Bench' },
  { key: 'pond', label: '🏞️ Pond' },
  { key: 'fountain', label: '⛲ Fountain' },
  { key: 'trees', label: '🌳 Trees' },
  { key: 'flower_beds', label: '🌸 Flower Beds' },
  { key: 'vegetable_beds', label: '🥦 Veggie Beds' },
  { key: 'bush', label: '🪴 Bush' },
  { key: 'pathway', label: '🪨 Pathway' },
  { key: 'driveway', label: '🛣️ Driveway' },
  { key: 'garden_lights', label: '💡 Lights' },
  { key: 'seating_area', label: '🛋️ Seating' },
  { key: 'well', label: '🪣 Well' },
];

export const OBJECT_COLORS = {
  bench: '#c8a96e',
  pond: '#38bdf8',
  fountain: '#7dd3fc',
  trees: '#4ade80',
  flower_beds: '#f472b6',
  vegetable_beds: '#86efac',
  bush: '#84cc16',
  pathway: '#d4d4aa',
  driveway: '#9ca3af',
  garden_lights: '#fde68a',
  seating_area: '#c4b5fd',
  open_car_park: '#94a3b8',
  covered_car_park: '#64748b',
  well: '#94a3b8',
};

export const OBJECT_COLORS_3D = {
  bench: '#c8a96e',
  pond: '#1d6fa4',
  fountain: '#38bdf8',
  trees: '#166534',
  flower_beds: '#be185d',
  vegetable_beds: '#15803d',
  bush: '#4d7c0f',
  pathway: '#b5b39a',
  driveway: '#6b7280',
  garden_lights: '#f59e0b',
  seating_area: '#7c3aed',
  open_car_park: '#475569',
  covered_car_park: '#334155',
  well: '#475569',
};

export const MODEL_PATHS = {
  'bench_wood_01': '/models/bench/bench_wood_01.glb',
  'bench_stone_01': '/models/bench/bench_stone_01.glb',
  'pond_small_01': '/models/pond/pond_small_01.glb',
  'tree_palm_01': '/models/trees/maple_tree.glb',
  'car_park_open_01': '/models/car_park/car_park_open_01.glb',
  'flower_bed_rect_01': '/models/flower_beds/flower_bed_rect_01.glb',
  'flower_bed_rect_02': '/models/flower_beds/flower_bed_rect_02.glb',
  'flower_bed_round_01': '/models/flower_beds/flower_bed_round_01.glb',
  'fountain_round_01': '/models/fountain/fountain_round_01.glb',
  'path_stone_01': '/models/decor/path_stone_01.glb',
  'well_01': '/models/well/stone_well_stylized.glb',
  'bush_01': '/models/bush/small_bush.glb',
};

export const OBJECT_DIMENSIONS = {
  'bench_wood_01': { width: 3.0, depth: 1.2, height: 1.0 },
  'bench_stone_01': { width: 3.5, depth: 1.4, height: 1.2 },
  'pond_small_01': { width: 4.0, depth: 4.0, height: 0.3 },
  'tree_palm_01': { width: 2.0, depth: 2.0, height: 5.0 },
  'car_park_open_01': { width: 3.0, depth: 5.5, height: 0.1 },
  'bush_01': { width: 1.0, depth: 1.0, height: 1.0 },
  'flower_bed_rect_01': { width: 3.0, depth: 1.5, height: 0.4 },
  'flower_bed_rect_02': { width: 1.0, depth: 2.0, height: 0.1 },
  'flower_bed_round_01': { width: 0.5, depth: 0.5, height: 0.1 },
  'fountain_round_01': { width: 1, depth: 1.5, height: 0.1 },
  'path_stone_01': { width: 1.2, depth: 1.2, height: 0.05 },
  'well_01': { width: 1.5, depth: 1.5, height: 2.0 },
  'default': { width: 1.0, depth: 1.0, height: 1.0 }
};
