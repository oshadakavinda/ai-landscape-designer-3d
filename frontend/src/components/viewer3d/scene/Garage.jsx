import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_HEIGHT, LIFT } from '../../../constants/renderConfig';

/**
 * Garage
 * Procedural scalable garage component.
 *
 * Dimensions are driven by `numVehicles`:
 *   - Each bay is 3m wide × 6m deep, so the total width = numVehicles × 3m
 *   - Height stays fixed at 2.8m (standard garage ceiling)
 *   - The roof is a shallow shed/lean-to angled from front to back
 *
 * Usage (from LandscapeObject when type === 'covered_car_park'):
 *   <Garage x={obj.x} y={obj.y} width={dims.width} depth={dims.depth} numVehicles={obj.numVehicles || 1} rotation={obj.rotation} />
 */

const BAY_WIDTH  = 3.2;  // metres per vehicle bay
const BAY_DEPTH  = 6.0;  // metres front to back
const WALL_H     = 2.8;  // standard ceiling height
const ROOF_RISE  = 0.6;  // extra height at the back (shed roof slope)
const PILLAR_W   = 0.2;  // pillar cross-section
const WALL_T     = 0.15; // wall thickness

export default function Garage({ x, y, width, depth, numVehicles = 1, rotation = 0 }) {
  // Use provided width/depth if available, otherwise compute from vehicle count
  // Width is ALWAYS derived from vehicle count — the catalog width is per-bay only
  const gWidth = numVehicles * BAY_WIDTH;
  const gDepth = depth || BAY_DEPTH;

  const cx = x + gWidth / 2;
  const cz = y + gDepth / 2;

  // Shed roof: flat polygon extruded along depth
  const roofProfile = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-gWidth / 2 - 0.1, WALL_H);              // front-left eave
    s.lineTo( gWidth / 2 + 0.1, WALL_H);              // front-right eave
    s.lineTo( gWidth / 2 + 0.1, WALL_H + ROOF_RISE);  // back-right ridge
    s.lineTo(-gWidth / 2 - 0.1, WALL_H + ROOF_RISE);  // back-left ridge
    s.lineTo(-gWidth / 2 - 0.1, WALL_H);
    return s;
  }, [gWidth]);

  const roofExtrude = useMemo(() => ({
    steps: 1,
    depth: gDepth + 0.2,
    bevelEnabled: false,
  }), [gDepth]);

  // Compute pillar X positions (one per bay boundary)
  const pillarXs = useMemo(() => {
    const xs = [];
    for (let i = 0; i <= numVehicles; i++) {
      xs.push(-gWidth / 2 + i * BAY_WIDTH);
    }
    return xs;
  }, [numVehicles, gWidth]);

  // Garage door colour (corrugated steel look)
  const doorW = BAY_WIDTH - PILLAR_W - 0.05;

  return (
    <group
      position={[cx, GROUND_HEIGHT + LIFT, cz]}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
    >
      {/* ── Back wall ── */}
      <mesh position={[0, WALL_H / 2, -gDepth / 2 + WALL_T / 2]} castShadow receiveShadow>
        <boxGeometry args={[gWidth + PILLAR_W, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* ── Side walls ── */}
      {[-1, 1].map(side => (
        <mesh
          key={side}
          position={[side * (gWidth / 2 - WALL_T / 2 + PILLAR_W / 2), WALL_H / 2, 0]}
          castShadow receiveShadow
        >
          <boxGeometry args={[WALL_T, WALL_H, gDepth]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.85} />
        </mesh>
      ))}

      {/* ── Front pillars (one per bay boundary) ── */}
      {pillarXs.map((px, i) => (
        <mesh key={i} position={[px, WALL_H / 2, gDepth / 2 - PILLAR_W / 2]} castShadow receiveShadow>
          <boxGeometry args={[PILLAR_W, WALL_H, PILLAR_W]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}

      {/* ── Garage doors (one per bay, front-facing) ── */}
      {Array.from({ length: numVehicles }).map((_, i) => {
        const doorX = -gWidth / 2 + i * BAY_WIDTH + BAY_WIDTH / 2;
        return (
          <group key={i} position={[doorX, 0, gDepth / 2]}>
            {/* Main door panel */}
            <mesh position={[0, WALL_H * 0.45, 0.02]} castShadow>
              <boxGeometry args={[doorW, WALL_H * 0.9, 0.05]} />
              <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.3} />
            </mesh>
            {/* Horizontal panel lines (corrugated effect) */}
            {[0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1].filter(py => py < WALL_H * 0.9).map((py, li) => (
              <mesh key={li} position={[0, py + 0.15, 0.055]}>
                <boxGeometry args={[doorW - 0.1, 0.04, 0.02]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.4} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* ── Shed roof ── */}
      <mesh position={[0, 0, -gDepth / 2 - 0.1]} castShadow>
        <extrudeGeometry args={[roofProfile, roofExtrude]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── Concrete floor slab ── */}
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[gWidth, 0.06, gDepth]} />
        <meshStandardMaterial color="#475569" roughness={0.95} />
      </mesh>
    </group>
  );
}
