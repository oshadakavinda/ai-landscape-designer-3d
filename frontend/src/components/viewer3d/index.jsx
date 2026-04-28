/**
 * viewer3d/index.jsx
 * Main 3D Canvas entry point.
 * 
 * This file owns only the <Canvas> setup, lighting, and scene composition.
 * All sub-components are imported from scene/ and objects/ folders.
 */
import { Canvas }       from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';

import Ground           from './scene/Ground';
import LandBoundary     from './scene/LandBoundary';
import Road             from './scene/Road';
import House            from './scene/House';
import LandscapeObject  from './objects/LandscapeObject';
import PathwayMesh      from './objects/PathwayMesh';

export default function ThreeDViewer({ layout }) {
  if (!layout) return null;

  const { land, house, objects = [], pathways = [] } = layout;
  const camTarget = [land.width / 2, 0, land.depth / 2];
  const maxDim    = Math.max(land.width, land.depth);

  return (
    <Canvas
      shadows
      camera={{
        position: [land.width * 1.2, land.depth * 0.9, land.depth * 1.4],
        fov:      50,
        near:     0.1,
        far:      1000,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0e1a']} />

      {/* ── Lighting ── */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[land.width * 0.8, land.depth, land.depth * 0.6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[land.width / 2, 8, land.depth / 2]} intensity={0.3} color="#63be7b" />

      {/* ── Controls ── */}
      <OrbitControls
        target={camTarget}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={maxDim * 3}
      />
      <Environment preset="night" />

      {/* ── Scene elements ── */}
      <Ground       land={land} />
      <LandBoundary land={land} />
      <Road         land={land} direction={land.road_direction} />

      <Grid
        position={[land.width / 2, 0.01, land.depth / 2]}
        args={[land.width, land.depth]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1a2a1a"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#2a4a2a"
        fadeDistance={maxDim * 2.5}
        infiniteGrid={false}
      />

      {/* ── Pathways (routed lines, not boxes) ── */}
      {pathways.map(pw => (
        <PathwayMesh key={pw.id} pathway={pw} />
      ))}

      {/* ── Landscape objects ── */}
      {objects.map(obj => (
        <LandscapeObject key={obj.id} obj={obj} />
      ))}

      {/* ── House (drawn last so it's always on top) ── */}
      <House house={house} />
    </Canvas>
  );
}
