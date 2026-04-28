import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { GROUND_BASE_COLORS } from '../../../constants/renderConfig';
import { GROUND_TEXTURES, GROUND_TILE_SIZE } from '../../../constants/texturePaths';

// Module-level cache — texture survives re-renders and tab switches
const textureCache = {};

export default function Ground({ land }) {
  const texPath = GROUND_TEXTURES[land.ground_texture];
  const fallbackColor = GROUND_BASE_COLORS[land.ground_texture] || '#4a7c3f';

  // Start with cached texture immediately (if already loaded before)
  const [texture, setTexture] = useState(() => textureCache[land.ground_texture] || null);

  const repeatX = Math.ceil(land.width / GROUND_TILE_SIZE);
  const repeatZ = Math.ceil(land.depth / GROUND_TILE_SIZE);

  useEffect(() => {
    if (!texPath) return;

    // Already cached — just reuse it
    if (textureCache[land.ground_texture]) {
      setTexture(textureCache[land.ground_texture]);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      texPath,
      (tex) => {
        tex.colorSpace  = THREE.SRGBColorSpace;
        tex.wrapS       = THREE.RepeatWrapping;
        tex.wrapT       = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatZ);
        tex.needsUpdate = true;
        textureCache[land.ground_texture] = tex; // cache permanently
        setTexture(tex);
      },
      undefined,
      (err) => console.warn('[Ground] texture load failed:', texPath, err)
    );
  }, [texPath, repeatX, repeatZ, land.ground_texture]);

  return (
    <mesh
      receiveShadow
      position={[land.width / 2, 0.03, land.depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[land.width, land.depth]} />
      {/*
        key changes when texture first becomes available, forcing Three.js to
        recompile the shader with USE_MAP defined. Without this, a material
        created with map=null silently ignores any later map assignment.
      */}
      <meshStandardMaterial
        key={texture ? 'textured' : 'plain'}
        map={texture ?? null}
        color={texture ? '#ffffff' : fallbackColor}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}