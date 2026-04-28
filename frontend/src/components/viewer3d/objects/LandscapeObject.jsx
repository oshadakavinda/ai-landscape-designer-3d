import { Suspense } from 'react';
import { MODEL_PATHS } from '../../../data/featureCatalog';
import {
  OBJECT_FALLBACK_COLORS, FALLBACK_HEIGHTS, LIFT, ARCHITECTURAL_TYPES
} from '../../../constants/renderConfig';
import GLBModel           from './GLBModel';
import FlatObject         from './FlatObject';
import ModelErrorBoundary from './ModelErrorBoundary';

/**
 * BoxFallback
 * A simple colored box shown while a GLB is loading or when it fails.
 * Also used directly for objects that have no GLB in the catalog.
 */
function BoxFallback({ obj, cx, cz }) {
  const color = OBJECT_FALLBACK_COLORS[obj.type] || '#888888';
  const h     = obj.height ?? FALLBACK_HEIGHTS[obj.type] ?? 0.5;
  const x     = cx ?? (obj.x + obj.width / 2);
  const z     = cz ?? (obj.y + obj.depth / 2);

  return (
    <group position={[x, h / 2 + LIFT, z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[obj.width, h, obj.depth]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * LandscapeObject
 * Dispatches each backend ObjectOutput to the correct renderer based on render_type:
 *
 *   "flat"  → FlatObject  (lawn, pond, driveway, seating area, etc.)
 *   "model" → GLBModel    (trees, bench, fountain, etc.)
 *             Falls back to BoxFallback if the .glb file is missing.
 *
 * Pathways (render_type: "path") are handled separately by PathwayMesh,
 * as they come from layout.pathways, not layout.objects.
 */
export default function LandscapeObject({ obj }) {
  const cx         = obj.x + obj.width / 2;
  const cz         = obj.y + obj.depth / 2;
  const renderType = obj.render_type || 'model';

  // ── Flat plane objects ──────────────────────────────────────────────────
  if (renderType === 'flat') {
    return <FlatObject obj={obj} />;
  }

  // ── 3D model objects ────────────────────────────────────────────────────
  const modelUrl       = MODEL_PATHS[obj.variant];
  const isArchitectural = ARCHITECTURAL_TYPES.has(obj.type);
  const fixedH         = isArchitectural ? (obj.height ?? 2.0) : null;

  if (modelUrl) {
    return (
      <group position={[cx, LIFT, cz]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
        <ModelErrorBoundary fallback={<BoxFallback obj={obj} cx={0} cz={0} />}>
          <Suspense fallback={<BoxFallback obj={obj} cx={0} cz={0} />}>
            <GLBModel url={modelUrl} width={obj.width} depth={obj.depth} fixedHeight={fixedH} />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  // ── No GLB available → colored box ─────────────────────────────────────
  return <BoxFallback obj={obj} cx={cx} cz={cz} />;
}
