import * as THREE from 'three';
import { useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';

/**
 * GLBModel
 * Loads a .glb file and auto-scales it to fit the target footprint.
 *
 * Scaling rules:
 *  - X and Z: uniform scale (Math.min of both) so the model fits within the footprint
 *    without being stretched.
 *  - Y: same uniform scale UNLESS fixedHeight is provided, in which case the model
 *    is scaled to exactly that height (used for architectural elements like garages).
 *  - Offset: the model is shifted so its bottom edge is exactly at Y=0 and its
 *    center is at X=0, Z=0, regardless of where the original pivot was.
 *
 * @param {string}  url          Path to the .glb file (e.g. '/models/trees/tree_palm_01.glb')
 * @param {number}  width        Target width in meters (from layout)
 * @param {number}  depth        Target depth in meters (from layout)
 * @param {number?} fixedHeight  If set, forces the model to exactly this height in meters
 */
export default function GLBModel({ url, width, depth, fixedHeight }) {
  const { scene } = useGLTF(url);

  const { offsetX, offsetY, offsetZ, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Uniform footprint scale — use the SMALLER of X/Z ratios to avoid distortion
    const uniformScale = Math.min(width / size.x, depth / size.z);
    // Y scale: fixed architectural height OR same as footprint scale
    const scaleY = fixedHeight ? fixedHeight / size.y : uniformScale;

    return {
      offsetX: -(box.max.x + box.min.x) / 2,   // center horizontally
      offsetY: -box.min.y,                       // sit bottom on ground
      offsetZ: -(box.max.z + box.min.z) / 2,    // center on Z
      scale:   [uniformScale, scaleY, uniformScale],
    };
  }, [scene, width, depth, fixedHeight]);

  return (
    <group
      position={[offsetX * scale[0], offsetY * scale[1], offsetZ * scale[2]]}
      scale={scale}
    >
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
