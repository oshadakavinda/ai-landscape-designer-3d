/**
 * useSceneTexture.js
 *
 * A safe texture loader hook that:
 *  - Tries to load the texture file if a path is provided.
 *  - Returns null gracefully if the file is missing (no crash).
 *  - Automatically sets up tiling (RepeatWrapping) and the correct repeat count.
 *
 * Usage:
 *   const texture = useSceneTexture('/textures/ground/grass_1k.jpg', landWidth, landDepth, 4);
 *   // returns a THREE.Texture or null
 *
 *   In JSX:
 *   <meshStandardMaterial map={texture} color={texture ? undefined : '#0d1c0a'} />
 */

import { useMemo } from 'react';
import * as THREE from 'three';

export function useSceneTexture(path, repeatX = 1, repeatZ = 1) {
  return useMemo(() => {
    if (!path) return null;

    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        path,
        undefined,
        undefined,
        (err) => console.warn(`[useSceneTexture] Could not load texture: ${path}`, err)
      );
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatZ);
      return tex;
    } catch (e) {
      console.warn('[useSceneTexture] Texture load failed:', e);
      return null;
    }
  }, [path, repeatX, repeatZ]);
}
