import { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useTexture, useGLTF, Clone } from '@react-three/drei';

import { GROUND_HEIGHT } from '../../../constants/renderConfig';
import { WALL_TEXTURES } from '../../../constants/texturePaths';

/**
 * BoundaryWall
 * Renders a perimeter wall around the land with a brick texture, pillars at
 * corners, and a gate opening on the road-facing side.
 *
 * Props:
 *   land          — { width, depth, road_direction }
 *   gateWidth     — width of the gate opening (default 3m)
 */

const WALL_HEIGHT = 1.8;
const WALL_THICKNESS = 0.15;
const PILLAR_SIZE = 0.25;
const CAP_OVERHANG = 0.04;
const GATE_MODEL_URL = '/models/gate/gate.glb';

// ─── Shared brick texture hook ───────────────────────────────────────────────
function useWallTexture(textureUrl, repeatX, repeatY) {
  const texture = useTexture(textureUrl);

  return useMemo(() => {
    const t = texture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX / 2, repeatY / 2); // Halved repeat to make bricks 2x bigger
    t.needsUpdate = true;
    return t;
  }, [texture, repeatX, repeatY]);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function WallSegment({ position, args, repeatX, repeatY, textureUrl }) {
  const wallMap = useWallTexture(textureUrl, repeatX, repeatY);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial map={wallMap} color="#c4a882" roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

function WallCap({ position, args }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#9e9687" roughness={0.8} metalness={0.05} />
    </mesh>
  );
}

function Pillar({ position, textureUrl }) {
  const pillarMap = useWallTexture(textureUrl, 0.5, WALL_HEIGHT / 1.5);
  const y = GROUND_HEIGHT + WALL_HEIGHT / 2;
  const capY = GROUND_HEIGHT + WALL_HEIGHT + 0.04;
  return (
    <group>
      <mesh position={[position[0], y, position[1]]} castShadow receiveShadow>
        <boxGeometry args={[PILLAR_SIZE, WALL_HEIGHT, PILLAR_SIZE]} />
        <meshStandardMaterial map={pillarMap} color="#b09878" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[position[0], capY, position[1]]} castShadow>
        <boxGeometry args={[PILLAR_SIZE + 0.08, 0.08, PILLAR_SIZE + 0.08]} />
        <meshStandardMaterial color="#9e9687" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── GLB Gate model ──────────────────────────────────────────────────────────
function GateModel({ position, rotation, gateWidth }) {
  const { scene } = useGLTF(GATE_MODEL_URL);

  const { offsetX, offsetY, offsetZ, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Scale gate to match the opening width and make it taller than the wall
    const GATE_HEIGHT = 2.3; // Increased from WALL_HEIGHT (1.8)
    const s = gateWidth / size.x;
    const sY = GATE_HEIGHT / size.y;

    return {
      offsetX: -(box.max.x + box.min.x) / 2,
      offsetY: -box.min.y,
      offsetZ: -(box.max.z + box.min.z) / 2,
      scale: [s, sY, s],
    };
  }, [scene, gateWidth]);

  // Fix materials (double-side, alpha)
  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          mat.side = THREE.DoubleSide;
          mat.needsUpdate = true;
        });
      }
    });
  }, [scene]);

  return (
    <group position={position} rotation={rotation}>
      <group
        position={[offsetX * scale[0], offsetY * scale[1], offsetZ * scale[2]]}
        scale={scale}
      >
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </group>
  );
}

// ─── Solid wall (no gate) ────────────────────────────────────────────────────
function SolidWall({ wallCenter, wallLength, wallY, capY, isHorizontal, hRepeat, vRepeat, textureUrl }) {
  const args = isHorizontal
    ? [wallLength + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]
    : [WALL_THICKNESS, WALL_HEIGHT, wallLength];
  const capArgs = isHorizontal
    ? [wallLength + WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, WALL_THICKNESS + CAP_OVERHANG * 2]
    : [WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, wallLength + CAP_OVERHANG * 2];

  return (
    <>
      <WallSegment position={wallCenter} args={args} repeatX={hRepeat} repeatY={vRepeat} textureUrl={textureUrl} />
      <WallCap position={[wallCenter[0], capY, wallCenter[2]]} args={capArgs} />
    </>
  );
}

// ─── Split wall with gate opening ────────────────────────────────────────────
function SplitWall({ wallLength, fixedCoord, wallY, capY, isHorizontal, gateWidth, hRepeatFn, vRepeat, textureUrl, mid: customMid }) {
  const halfGate = gateWidth / 2;
  const mid = customMid ?? (wallLength / 2);

  // Left segment: from 0 to (mid - halfGate)
  const leftLen = mid - halfGate;
  // Right segment: from (mid + halfGate) to wallLength
  const rightLen = wallLength - (mid + halfGate);

  const leftCenter = leftLen / 2;
  const rightCenter = mid + halfGate + rightLen / 2;

  if (isHorizontal) {
    // Wall along X axis (north or south), Z is fixed
    return (
      <>
        {/* Left wall segment */}
        {leftLen > 0.1 && (
          <>
            <WallSegment
              position={[leftCenter, wallY, fixedCoord]}
              args={[leftLen, WALL_HEIGHT, WALL_THICKNESS]}
              repeatX={hRepeatFn(leftLen)} repeatY={vRepeat} textureUrl={textureUrl}
            />
            <WallCap
              position={[leftCenter, capY, fixedCoord]}
              args={[leftLen + CAP_OVERHANG * 2, CAP_OVERHANG, WALL_THICKNESS + CAP_OVERHANG * 2]}
            />
          </>
        )}

        {/* Right wall segment */}
        {rightLen > 0.1 && (
          <>
            <WallSegment
              position={[rightCenter, wallY, fixedCoord]}
              args={[rightLen, WALL_HEIGHT, WALL_THICKNESS]}
              repeatX={hRepeatFn(rightLen)} repeatY={vRepeat} textureUrl={textureUrl}
            />
            <WallCap
              position={[rightCenter, capY, fixedCoord]}
              args={[rightLen + CAP_OVERHANG * 2, CAP_OVERHANG, WALL_THICKNESS + CAP_OVERHANG * 2]}
            />
          </>
        )}

        {/* Gate pillars on either side of the opening */}
        <Pillar position={[mid - halfGate, fixedCoord]} textureUrl={textureUrl} />
        <Pillar position={[mid + halfGate, fixedCoord]} textureUrl={textureUrl} />
      </>
    );
  } else {
    // Wall along Z axis (east or west), X is fixed
    return (
      <>
        {leftLen > 0.1 && (
          <>
            <WallSegment
              position={[fixedCoord, wallY, leftCenter]}
              args={[WALL_THICKNESS, WALL_HEIGHT, leftLen]}
              repeatX={hRepeatFn(leftLen)} repeatY={vRepeat} textureUrl={textureUrl}
            />
            <WallCap
              position={[fixedCoord, capY, leftCenter]}
              args={[WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, leftLen + CAP_OVERHANG * 2]}
            />
          </>
        )}

        {rightLen > 0.1 && (
          <>
            <WallSegment
              position={[fixedCoord, wallY, rightCenter]}
              args={[WALL_THICKNESS, WALL_HEIGHT, rightLen]}
              repeatX={hRepeatFn(rightLen)} repeatY={vRepeat} textureUrl={textureUrl}
            />
            <WallCap
              position={[fixedCoord, capY, rightCenter]}
              args={[WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, rightLen + CAP_OVERHANG * 2]}
            />
          </>
        )}

        <Pillar position={[fixedCoord, mid - halfGate]} textureUrl={textureUrl} />
        <Pillar position={[fixedCoord, mid + halfGate]} textureUrl={textureUrl} />
      </>
    );
  }
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function BoundaryWall({ land, gate, house }) {
  // Use gate from layout if provided, otherwise default to land center
  const gateWidth = gate ? gate.width : 3.5;
  
  const w = land.width;
  const d = land.depth;
  const road = land.road_direction || 'south';
  const wallY = GROUND_HEIGHT + WALL_HEIGHT / 2;
  const capY = GROUND_HEIGHT + WALL_HEIGHT + CAP_OVERHANG / 2;
  const wallTextureKey = land.wall_texture || 'brick';
  const textureUrl = WALL_TEXTURES[wallTextureKey] || WALL_TEXTURES.brick;

  const hRepeat = (len) => Math.max(1, Math.round(len / 1.5));
  const vRepeat = Math.max(1, Math.round(WALL_HEIGHT / 0.8));

  // Determine gate position and rotation based on road direction
  const gateConfig = useMemo(() => {
    const houseCenterX = house ? house.x + house.width / 2 : w / 2;
    const houseCenterY = house ? house.y + house.depth / 2 : d / 2;

    if (gate) {
      return { 
        pos: [gate.x + gate.width/2, GROUND_HEIGHT, gate.y + gate.depth/2], 
        rot: road === 'north' ? [0, Math.PI, 0] : 
             road === 'east' ? [0, -Math.PI / 2, 0] : 
             road === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]
      };
    }
    
    // Fallback if no gate is provided in layout
    switch (road) {
      case 'south':
        return { pos: [houseCenterX, GROUND_HEIGHT, 0], rot: [0, 0, 0] };
      case 'north':
        return { pos: [houseCenterX, GROUND_HEIGHT, d], rot: [0, Math.PI, 0] };
      case 'east':
        return { pos: [w, GROUND_HEIGHT, houseCenterY], rot: [0, -Math.PI / 2, 0] };
      case 'west':
        return { pos: [0, GROUND_HEIGHT, houseCenterY], rot: [0, Math.PI / 2, 0] };
      default:
        return { pos: [houseCenterX, GROUND_HEIGHT, 0], rot: [0, 0, 0] };
    }
  }, [road, w, d, gate, house]);

  // Helper: is a given wall the road-facing one?
  const isRoadWall = (side) => side === road;

  return (
    <group>
      {/* ── North wall ── */}
      {isRoadWall('north') ? (
        <SplitWall
          wallLength={w} fixedCoord={d} wallY={wallY} capY={capY}
          isHorizontal gateWidth={gateWidth} hRepeatFn={hRepeat} vRepeat={vRepeat} textureUrl={textureUrl}
          mid={gate ? (gate.x + gate.width/2) : (house ? house.x + house.width / 2 : w / 2)} 

        />
      ) : (
        <SolidWall
          wallCenter={[w / 2, wallY, d]} wallLength={w} wallY={wallY} capY={capY}
          isHorizontal hRepeat={hRepeat(w)} vRepeat={vRepeat} textureUrl={textureUrl}
        />
      )}

      {/* ── South wall ── */}
      {isRoadWall('south') ? (
        <SplitWall
          wallLength={w} fixedCoord={0} wallY={wallY} capY={capY}
          isHorizontal gateWidth={gateWidth} hRepeatFn={hRepeat} vRepeat={vRepeat} textureUrl={textureUrl}
          mid={gate ? (gate.x + gate.width/2) : (house ? house.x + house.width / 2 : w / 2)}

        />
      ) : (
        <SolidWall
          wallCenter={[w / 2, wallY, 0]} wallLength={w} wallY={wallY} capY={capY}
          isHorizontal hRepeat={hRepeat(w)} vRepeat={vRepeat} textureUrl={textureUrl}
        />
      )}

      {/* ── West wall ── */}
      {isRoadWall('west') ? (
        <SplitWall
          wallLength={d} fixedCoord={0} wallY={wallY} capY={capY}
          isHorizontal={false} gateWidth={gateWidth} hRepeatFn={hRepeat} vRepeat={vRepeat} textureUrl={textureUrl}
          mid={gate ? (gate.y + gate.depth/2) : (house ? house.y + house.depth / 2 : d / 2)}

        />
      ) : (
        <SolidWall
          wallCenter={[0, wallY, d / 2]} wallLength={d} wallY={wallY} capY={capY}
          isHorizontal={false} hRepeat={hRepeat(d)} vRepeat={vRepeat} textureUrl={textureUrl}
        />
      )}

      {/* ── East wall ── */}
      {isRoadWall('east') ? (
        <SplitWall
          wallLength={d} fixedCoord={w} wallY={wallY} capY={capY}
          isHorizontal={false} gateWidth={gateWidth} hRepeatFn={hRepeat} vRepeat={vRepeat} textureUrl={textureUrl}
          mid={gate ? (gate.y + gate.depth/2) : (house ? house.y + house.depth / 2 : d / 2)}

        />
      ) : (
        <SolidWall
          wallCenter={[w, wallY, d / 2]} wallLength={d} wallY={wallY} capY={capY}
          isHorizontal={false} hRepeat={hRepeat(d)} vRepeat={vRepeat} textureUrl={textureUrl}
        />
      )}

      {/* ── Corner pillars ── */}
      <Pillar position={[0, 0]} textureUrl={textureUrl} />
      <Pillar position={[w, 0]} textureUrl={textureUrl} />
      <Pillar position={[0, d]} textureUrl={textureUrl} />
      <Pillar position={[w, d]} textureUrl={textureUrl} />

      {/* ── Gate model ── */}
      <Suspense fallback={null}>
        <GateModel
          position={gateConfig.pos}
          rotation={gateConfig.rot}
          gateWidth={gateWidth}
        />
      </Suspense>
    </group>
  );
}
