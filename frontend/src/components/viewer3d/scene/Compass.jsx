import { Text } from '@react-three/drei';
import { GROUND_HEIGHT } from '../../../constants/renderConfig';

export default function Compass({ land }) {
  // Place it near the bottom-right corner of the plot
  const cx = land.width + 2.5;
  const cz = 2.5;
  
  return (
    <group position={[cx, GROUND_HEIGHT + 0.05, cz]}>
      {/* Arrow shaft (cylinder) pointing towards +Z (North) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow castShadow>
         <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
         <meshStandardMaterial color="#ef4444" roughness={0.5} />
      </mesh>
      
      {/* Arrow tip (cone) pointing towards +Z (North) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.8]} receiveShadow castShadow>
         <coneGeometry args={[0.25, 0.6, 16]} />
         <meshStandardMaterial color="#ef4444" roughness={0.5} />
      </mesh>
      
      {/* 'N' Text */}
      <Text
        position={[0, 0, 2.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        N
      </Text>
    </group>
  );
}
