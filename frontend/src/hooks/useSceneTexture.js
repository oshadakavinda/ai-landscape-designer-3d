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

import { useState, useEffect } from 'react';
import * as THREE from 'three';

export function useSceneTexture(path, repeatX = 1, repeatZ = 1) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!path) {
      setTexture(null);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatZ);
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.warn(`[useSceneTexture] Failed to load: ${path}`, err);
        setTexture(null);
      }
    );
  }, [path, repeatX, repeatZ]);

  return texture;
}
