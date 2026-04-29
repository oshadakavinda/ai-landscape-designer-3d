import { Text } from '@react-three/drei';
import { ROAD_TEXTURES, ROAD_TILE_SIZE } from '../../../constants/texturePaths';
import { useSceneTexture } from '../../../hooks/useSceneTexture';

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

  const texPath = ROAD_TEXTURES.asphalt;
  // Tile based on size. size[0] is width, size[2] is length/depth for the mesh
  const repeatX = Math.ceil(size[0] / ROAD_TILE_SIZE);
  const repeatZ = Math.ceil(size[2] / ROAD_TILE_SIZE);
  const texture = useSceneTexture(texPath, repeatX, repeatZ);

  return (
    <group position={pos}>
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial 
          map={texture}
          color={texture ? '#ffffff' : '#1e1e1e'} 
          roughness={0.8} 
        />
      </mesh>
      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, isHoriz ? 0 : Math.PI / 2]}
        fontSize={0.8}
        color="#ffffff"
      >
        PUBLIC ROAD ({direction.toUpperCase()})
      </Text>
    </group>
  );
}
