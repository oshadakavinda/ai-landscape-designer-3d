import { MATERIAL_COLORS, OBJECT_FALLBACK_COLORS, FALLBACK_HEIGHTS, LIFT } from '../../../constants/renderConfig';
import { SURFACE_TEXTURES, SURFACE_TILE_SIZE } from '../../../constants/texturePaths';
import { useSceneTexture } from '../../../hooks/useSceneTexture';

/**
 * FlatObject
 * Renders flat/ground-level objects (lawn, pond, driveway, seating area, etc.)
 * as a low BoxGeometry — NO .glb model needed.
 *
 * HOW TO ADD A SURFACE TEXTURE:
 *  1. Download a seamless texture (e.g. grass_patch_1k.jpg from polyhaven.com)
 *  2. Place it in: frontend/public/textures/surface/
 *  3. Uncomment the entry in src/constants/texturePaths.js → SURFACE_TEXTURES
 *  The texture tiles automatically based on the object's physical dimensions.
 */
export default function FlatObject({ obj }) {
  const cx = obj.x + obj.width / 2;
  const cz = obj.y + obj.depth / 2;
  const h  = obj.height ?? FALLBACK_HEIGHTS[obj.type] ?? 0.05;

  const texPath = SURFACE_TEXTURES[obj.material];
  const repeatX = Math.ceil(obj.width / SURFACE_TILE_SIZE);
  const repeatZ = Math.ceil(obj.depth / SURFACE_TILE_SIZE);
  const texture = useSceneTexture(texPath, repeatX, repeatZ);

  const color   = texture
    ? undefined
    : (MATERIAL_COLORS[obj.material] || OBJECT_FALLBACK_COLORS[obj.type] || '#444');

  const isWater = obj.material === 'water';

  return (
    <mesh position={[cx, h / 2 + LIFT, cz]} castShadow receiveShadow>
      <boxGeometry args={[obj.width, h, obj.depth]} />
      <meshStandardMaterial
        map={texture}
        color={color}
        roughness={isWater ? 0.05 : 0.85}
        metalness={isWater ? 0.1 : 0.0}
        opacity={isWater ? 0.8 : 1.0}
        transparent={isWater}
      />
    </mesh>
  );
}
