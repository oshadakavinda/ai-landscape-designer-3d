import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { MATERIAL_COLORS, GROUND_HEIGHT, LIFT } from '../../../constants/renderConfig';
import LightPole from './LightPole';

/**
 * PathwayMesh
 * Renders a pathway as a series of box segments connecting waypoints.
 * Also renders light poles along the pathway.
 */
export default function PathwayMesh({ pathway }) {
  const color = MATERIAL_COLORS[pathway.material] || '#4a4540';

  const pathTexture = useTexture('/textures/pathway-texture.jpg');
  const pathMap = useMemo(() => {
    const t = pathTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }, [pathTexture]);

  const { segments, lightPoles } = useMemo(() => {
    const segs = [];
    const poles = [];
    const LIGHT_SPACING = 4; // Add a light pole every 4 meters
    
    for (let i = 0; i < pathway.points.length - 1; i++) {
      const [x0, z0] = pathway.points[i];
      const [x1, z1] = pathway.points[i + 1];
      const cx    = (x0 + x1) / 2;
      const cz    = (z0 + z1) / 2;
      const len   = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
      // atan2(dx, dz) gives the angle in the XZ plane
      const angle = Math.atan2(x1 - x0, z1 - z0);
      segs.push({ cx, cz, len, angle });

      // Add light poles along this segment
      const numPoles = Math.floor(len / LIGHT_SPACING);
      for (let j = 1; j <= numPoles; j++) {
        const t = j / (numPoles + 1);
        const px = x0 + t * (x1 - x0);
        const pz = z0 + t * (z1 - z0);
        
        // Offset the pole slightly to the side of the path
        const offsetX = Math.cos(angle) * (pathway.width / 2 + 0.3);
        const offsetZ = -Math.sin(angle) * (pathway.width / 2 + 0.3);
        
        poles.push({
          x: px + offsetX,
          z: pz + offsetZ,
          // Alternate sides if desired, or keep on one side. Let's just keep on one side for simplicity.
          rotation: [0, angle + Math.PI / 2, 0] // Face the path
        });
      }
    }
    return { segments: segs, lightPoles: poles };
  }, [pathway.points, pathway.width]);

  return (
    <>
      {segments.map((s, i) => {
        // Tile texture based on segment length
        const segMap = pathMap.clone();
        segMap.repeat.set(pathway.width, s.len / 2);
        segMap.needsUpdate = true;
        return (
          <mesh key={`seg-${i}`} position={[s.cx, GROUND_HEIGHT + LIFT, s.cz]} rotation={[0, s.angle, 0]} receiveShadow>
            <boxGeometry args={[pathway.width, 0.05, s.len]} />
            <meshStandardMaterial map={segMap} color={color} roughness={0.85} />
          </mesh>
        );
      })}
      
      {lightPoles.map((pole, i) => (
        <LightPole 
          key={`pole-${i}`} 
          position={[pole.x, GROUND_HEIGHT, pole.z]} 
          rotation={pole.rotation} 
        />
      ))}
    </>
  );
}
