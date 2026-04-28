import { Text } from '@react-three/drei';
import { LIFT } from '../../../constants/renderConfig';

export default function House({ house }) {
  const cx = house.x + house.width / 2;
  const cz = house.y + house.depth / 2;
  const h  = 2; // fixed architectural height (meters)

  return (
    <group position={[cx, h / 2 + LIFT, cz]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[house.width, h, house.depth]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.6} />
      </mesh>
      <Text
        position={[0, h / 2 + 0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        HOUSE
      </Text>
    </group>
  );
}
