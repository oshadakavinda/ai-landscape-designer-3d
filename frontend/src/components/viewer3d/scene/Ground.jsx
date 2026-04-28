import { GROUND_BASE_COLORS } from '../../../constants/renderConfig';
import { GROUND_TEXTURES, GROUND_TILE_SIZE } from '../../../constants/texturePaths';
import { useSceneTexture } from '../../../hooks/useSceneTexture';

/**
 * Ground
 * Renders the land base plane with an optional tileable texture.
 *
 * HOW TO ADD A GROUND TEXTURE:
 *  1. Download a seamless texture from polyhaven.com (e.g. grass_1k.jpg)
 *  2. Place it in: frontend/public/textures/ground/
 *  3. Uncomment the relevant entry in src/constants/texturePaths.js → GROUND_TEXTURES
 *  The material will tile automatically based on land dimensions.
 */
export default function Ground({ land }) {
  const texPath = GROUND_TEXTURES[land.ground_texture];
  const repeatX = Math.ceil(land.width / GROUND_TILE_SIZE);
  const repeatZ = Math.ceil(land.depth / GROUND_TILE_SIZE);
  const texture = useSceneTexture(texPath, repeatX, repeatZ);
  const color = texture ? undefined : (GROUND_BASE_COLORS[land.ground_texture] || '#111d0f');

  return (
    <mesh receiveShadow position={[land.width / 2, 0, land.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[land.width, land.depth]} />
      <meshStandardMaterial map={texture} color={color} roughness={1} metalness={0} />
    </mesh>
  );
}
