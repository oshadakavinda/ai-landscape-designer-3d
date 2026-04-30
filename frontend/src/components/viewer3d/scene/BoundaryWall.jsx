import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { GROUND_HEIGHT } from '../../../constants/renderConfig';

/**
 * BoundaryWall
 * Renders a perimeter wall around the land with a brick texture and pillars at corners.
 */

const WALL_HEIGHT = 1.8;
const WALL_THICKNESS = 0.15;
const PILLAR_SIZE = 0.25;
const CAP_OVERHANG = 0.04;

/** Shared hook: loads + tiles the brick texture to the given wall length & height */
function useBrickTexture(repeatX, repeatY) {
  const texture = useTexture('/textures/brick_wall.png');

  return useMemo(() => {
    const t = texture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.needsUpdate = true;
    return t;
  }, [texture, repeatX, repeatY]);
}

function WallSegment({ position, args, repeatX, repeatY }) {
  const brickMap = useBrickTexture(repeatX, repeatY);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        map={brickMap}
        color="#c4a882"
        roughness={0.92}
        metalness={0.02}
      />
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

function Pillar({ position }) {
  const pillarMap = useBrickTexture(0.5, WALL_HEIGHT / 1.5);
  const y = GROUND_HEIGHT + WALL_HEIGHT / 2;
  const capY = GROUND_HEIGHT + WALL_HEIGHT + 0.04;

  return (
    <group>
      {/* Pillar body */}
      <mesh position={[position[0], y, position[1]]} castShadow receiveShadow>
        <boxGeometry args={[PILLAR_SIZE, WALL_HEIGHT, PILLAR_SIZE]} />
        <meshStandardMaterial
          map={pillarMap}
          color="#b09878"
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>
      {/* Pillar cap */}
      <mesh position={[position[0], capY, position[1]]} castShadow>
        <boxGeometry args={[PILLAR_SIZE + 0.08, 0.08, PILLAR_SIZE + 0.08]} />
        <meshStandardMaterial color="#9e9687" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

export default function BoundaryWall({ land }) {
  const w = land.width;
  const d = land.depth;
  const wallY = GROUND_HEIGHT + WALL_HEIGHT / 2;
  const capY = GROUND_HEIGHT + WALL_HEIGHT + CAP_OVERHANG / 2;

  // Tile bricks roughly every 1.5m wide, every 0.8m tall
  const hRepeat = (len) => Math.max(1, Math.round(len / 1.5));
  const vRepeat = Math.max(1, Math.round(WALL_HEIGHT / 0.8));

  return (
    <group>
      {/* ── North wall (far side, along Z = depth) ── */}
      <WallSegment
        position={[w / 2, wallY, d]}
        args={[w + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]}
        repeatX={hRepeat(w)}
        repeatY={vRepeat}
      />
      <WallCap
        position={[w / 2, capY, d]}
        args={[w + WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, WALL_THICKNESS + CAP_OVERHANG * 2]}
      />

      {/* ── South wall (near side, along Z = 0) ── */}
      <WallSegment
        position={[w / 2, wallY, 0]}
        args={[w + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]}
        repeatX={hRepeat(w)}
        repeatY={vRepeat}
      />
      <WallCap
        position={[w / 2, capY, 0]}
        args={[w + WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, WALL_THICKNESS + CAP_OVERHANG * 2]}
      />

      {/* ── West wall (left side, along X = 0) ── */}
      <WallSegment
        position={[0, wallY, d / 2]}
        args={[WALL_THICKNESS, WALL_HEIGHT, d]}
        repeatX={hRepeat(d)}
        repeatY={vRepeat}
      />
      <WallCap
        position={[0, capY, d / 2]}
        args={[WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, d + CAP_OVERHANG * 2]}
      />

      {/* ── East wall (right side, along X = width) ── */}
      <WallSegment
        position={[w, wallY, d / 2]}
        args={[WALL_THICKNESS, WALL_HEIGHT, d]}
        repeatX={hRepeat(d)}
        repeatY={vRepeat}
      />
      <WallCap
        position={[w, capY, d / 2]}
        args={[WALL_THICKNESS + CAP_OVERHANG * 2, CAP_OVERHANG, d + CAP_OVERHANG * 2]}
      />

      {/* ── Corner pillars ── */}
      <Pillar position={[0, 0]} />
      <Pillar position={[w, 0]} />
      <Pillar position={[0, d]} />
      <Pillar position={[w, d]} />
    </group>
  );
}
