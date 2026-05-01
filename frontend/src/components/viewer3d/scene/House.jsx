import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { LIFT, GROUND_HEIGHT } from '../../../constants/renderConfig';

/**
 * Procedural House
 * A scalable house that adjusts its walls and roof based on width/depth 
 * without stretching architectural features like windows and doors.
 */
export default function House({ house }) {
  const { width, depth, x, y, rotation = 0 } = house;
  
  // Center position
  const cx = x + width / 2;
  const cz = y + depth / 2;
  
  const houseHeight = 3.2; // Standard floor height
  const roofHeight = 1.8;
  const wallThickness = 0.1;

  // Roof shape (pitched roof along the width)
  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(0, roofHeight);
    shape.lineTo(width / 2, 0);
    shape.lineTo(-width / 2, 0);
    return shape;
  }, [width, roofHeight]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1
  }), [depth]);

  const wallTexture = useTexture('/textures/wall_texture.jpg');
  const roofTexture = useTexture('/textures/roof_texture.jpg');
  const doorTexture = useTexture('/textures/wood-texture.jpg');

  const wallMap = useMemo(() => {
    const t = wallTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(width / 4, houseHeight / 4);
    t.needsUpdate = true;
    return t;
  }, [wallTexture, width, houseHeight]);

  const roofMap = useMemo(() => {
    const t = roofTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(depth / 4, 1);
    t.needsUpdate = true;
    return t;
  }, [roofTexture, depth]);

  const doorMap = useMemo(() => {
    const t = doorTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return t;
  }, [doorTexture]);

  return (
    <group 
      position={[cx, GROUND_HEIGHT + LIFT, cz]}
      rotation={[0, THREE.MathUtils.degToRad(rotation), 0]}
    >

      {/* Main Building Body */}
      <mesh position={[0, houseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, houseHeight, depth]} />
        <meshStandardMaterial map={wallMap} color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Pitched Roof */}
      <mesh position={[0, houseHeight, -depth / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[roofShape, extrudeSettings]} />
        <meshStandardMaterial map={roofMap} color="#e2e8f0" roughness={0.7} />
      </mesh>

      {/* Decorative Door (always centered on the front face) */}
      <mesh position={[0, 1.1, depth / 2 + 0.01]} castShadow>
        <boxGeometry args={[1.0, 2.2, 0.05]} />
        <meshStandardMaterial map={doorMap} color="#c49a6c" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Back Door (centered on the rear face, slightly smaller) */}
      <mesh position={[0, 1.0, -depth / 2 - 0.01]} castShadow>
        <boxGeometry args={[0.9, 2.0, 0.05]} />
        <meshStandardMaterial map={doorMap} color="#c49a6c" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Windows - dynamic count based on width */}
      <Windows width={width} depth={depth} houseHeight={houseHeight} />
    </group>
  );
}

function Windows({ width, depth, houseHeight }) {
  const windowSize = 0.8;
  const windowY = houseHeight * 0.6;

  const windowTexture = useTexture('/textures/granulated-surface.jpg');
  const windowMap = useMemo(() => {
    const t = windowTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return t;
  }, [windowTexture]);
  
  // Calculate spacing for windows on the front/back
  const numWindowsFront = Math.max(0, Math.floor(width / 2));
  const frontWindows = [];
  if (numWindowsFront > 0) {
    const spacing = width / (numWindowsFront + 1);
    for (let i = 1; i <= numWindowsFront; i++) {
      // Skip the middle one if it overlaps with the door
      const xPos = -width / 2 + i * spacing;
      if (Math.abs(xPos) > 0.8) {
        frontWindows.push(xPos);
      }
    }
  }

  return (
    <>
      {/* Front Windows */}
      {frontWindows.map((xPos, idx) => (
        <mesh key={`fw-${idx}`} position={[xPos, windowY, depth / 2 + 0.01]}>
          <boxGeometry args={[windowSize, windowSize, 0.05]} />
          <meshStandardMaterial map={windowMap} color="#94a3b8" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* Back Windows */}
      {frontWindows.map((xPos, idx) => (
        <mesh key={`bw-${idx}`} position={[xPos, windowY, -depth / 2 - 0.01]}>
          <boxGeometry args={[windowSize, windowSize, 0.05]} />
          <meshStandardMaterial map={windowMap} color="#94a3b8" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      
      {/* Side Windows */}
      <mesh position={[width / 2 + 0.01, windowY, 0]}>
        <boxGeometry args={[0.05, windowSize, Math.min(depth * 0.6, 1.2)]} />
        <meshStandardMaterial map={windowMap} color="#94a3b8" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-width / 2 - 0.01, windowY, 0]}>
        <boxGeometry args={[0.05, windowSize, Math.min(depth * 0.6, 1.2)]} />
        <meshStandardMaterial map={windowMap} color="#94a3b8" roughness={0.4} metalness={0.3} />
      </mesh>
    </>
  );
}
