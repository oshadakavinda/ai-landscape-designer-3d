import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GROUND_BASE_COLORS } from '../../../constants/renderConfig';
import { GROUND_TEXTURES, GROUND_TILE_SIZE } from '../../../constants/texturePaths';

// Module-level cache — survives re-renders and tab switches
const textureCache = {};

export default function Ground({ land }) {
  const [texture, setTexture] = useState(() => textureCache[land.ground_texture] || null);

  const texPath = GROUND_TEXTURES[land.ground_texture];
  const repeatX = Math.ceil(land.width / GROUND_TILE_SIZE);
  const repeatZ = Math.ceil(land.depth / GROUND_TILE_SIZE);
  // Top of Ground.jsx, inside the component
  console.log('[Ground] land.ground_texture:', land.ground_texture, '→ path:', texPath);

  useEffect(() => {
    if (!texPath) return;

    // Already cached — just apply repeat and use it
    if (textureCache[land.ground_texture]) {
      const tex = textureCache[land.ground_texture];
      tex.repeat.set(repeatX, repeatZ);
      tex.needsUpdate = true;
      setTexture(tex);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      texPath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatZ);
        tex.needsUpdate = true;

        textureCache[land.ground_texture] = tex; // cache it permanently
        setTexture(tex);
      },
      undefined,
      (err) => console.error('[Ground] failed to load texture', texPath, err)
    );

    // NO cleanup that nulls the texture
  }, [texPath, repeatX, repeatZ]);

  const fallbackColor = GROUND_BASE_COLORS[land.ground_texture] || '#111d0f';

  return (
    <mesh
      receiveShadow
      position={[land.width / 2, 0, land.depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[land.width, land.depth]} />
      <meshStandardMaterial
        key={texture ? 'textured-ground' : 'plain-ground'}
        map={texture}
        color={texture ? '#ffffff' : fallbackColor}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}