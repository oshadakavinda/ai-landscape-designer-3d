import { useMemo } from 'react';
import { MATERIAL_COLORS } from '../../../constants/renderConfig';

/**
 * PathwayMesh
 * Renders a pathway as a series of box segments connecting waypoints.
 *
 * The backend provides pathways as [{points: [[x,z], [x,z], ...], width, material}].
 * Each consecutive pair of points becomes one rectangular segment, rotated to face
 * the correct direction.
 *
 * Future upgrade: replace with TubeGeometry using THREE.CatmullRomCurve3 for
 * smooth curved paths.
 */
export default function PathwayMesh({ pathway }) {
  const color = MATERIAL_COLORS[pathway.material] || '#4a4540';

  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < pathway.points.length - 1; i++) {
      const [x0, z0] = pathway.points[i];
      const [x1, z1] = pathway.points[i + 1];
      const cx    = (x0 + x1) / 2;
      const cz    = (z0 + z1) / 2;
      const len   = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
      // atan2(dx, dz) gives the angle in the XZ plane
      const angle = Math.atan2(x1 - x0, z1 - z0);
      segs.push({ cx, cz, len, angle });
    }
    return segs;
  }, [pathway.points]);

  return (
    <>
      {segments.map((s, i) => (
        <mesh key={i} position={[s.cx, 0.03, s.cz]} rotation={[0, s.angle, 0]} receiveShadow>
          <boxGeometry args={[pathway.width, 0.05, s.len]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}
