import { Text } from '@react-three/drei';

export default function Road({ land, direction }) {
  const roadWidth = 4;
  const isHoriz = direction === 'north' || direction === 'south';

  const pos =
    direction === 'north' ? [land.width / 2, 0, land.depth + roadWidth / 2 + 0.5] :
    direction === 'south' ? [land.width / 2, 0, -roadWidth / 2 - 0.5] :
    direction === 'east'  ? [land.width + roadWidth / 2 + 0.5, 0, land.depth / 2] :
                            [-roadWidth / 2 - 0.5, 0, land.depth / 2];

  const size = isHoriz
    ? [land.width + 10, 0.01, roadWidth]
    : [roadWidth, 0.01, land.depth + 10];

  return (
    <group position={pos}>
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.9} />
      </mesh>
      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, isHoriz ? 0 : Math.PI / 2]}
        fontSize={0.8}
        color="#4b5563"
      >
        PUBLIC ROAD ({direction.toUpperCase()})
      </Text>
    </group>
  );
}
