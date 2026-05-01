import { GROUND_HEIGHT } from '../../../constants/renderConfig';

export default function LightPole({ position, rotation }) {
  const poleHeight = 2.5;
  const poleRadius = 0.05;
  const capWidth = 0.3;
  const capHeight = 0.1;
  const capDepth = 0.3;

  return (
    <group position={position} rotation={rotation}>
      {/* The Pole */}
      <mesh position={[0, poleHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[poleRadius, poleRadius * 1.5, poleHeight, 8]} />
        <meshStandardMaterial color="#2d3748" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* The Cap/Light Housing */}
      <mesh position={[0, poleHeight, 0]} castShadow>
        <boxGeometry args={[capWidth, capHeight, capDepth]} />
        <meshStandardMaterial color="#1a202c" roughness={0.8} />
      </mesh>

      {/* The Glowing Bulb */}
      <mesh position={[0, poleHeight - 0.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>

      {/* The Actual Light Source */}
      <pointLight 
        position={[0, poleHeight - 0.1, 0]} 
        color="#fef08a" 
        intensity={0.8} 
        distance={8} 
        decay={2}
        castShadow
      />
    </group>
  );
}
