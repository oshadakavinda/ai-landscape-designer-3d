import { Text } from '@react-three/drei';
import { GROUND_HEIGHT } from '../../../constants/renderConfig';

export default function Compass({ land }) {
  // Place it near the bottom-right corner of the plot
  const cx = land.width + 2.5;
  const cz = 2.5;
  
  return (
    <group position={[cx, GROUND_HEIGHT + 0.5, cz]}>
      {/* Arrow shaft (cylinder) pointing towards +Z (North) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow castShadow>
         <cylinderGeometry args={[0.15, 0.15, 2.5, 16]} />
         <meshStandardMaterial color="#facc15" roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Arrow tip (cone) pointing towards +Z (North) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 2.1]} receiveShadow castShadow>
         <coneGeometry args={[0.4, 0.8, 16]} />
         <meshStandardMaterial color="#facc15" roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* 'NORTH' Text */}
      <Text
        position={[0, 0.5, 3.2]}
        rotation={[-Math.PI / 4, 0, 0]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        NORTH
      </Text>
    </group>
  );
}
