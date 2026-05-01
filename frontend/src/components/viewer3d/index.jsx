/**
 * viewer3d/index.jsx
 * Main 3D Canvas entry point.
 *
 * This file owns only the <Canvas> setup, lighting, and scene composition.
 * All sub-components are imported from scene/ and objects/ folders.
 *
 * Props:
 *   layout   — the generated landscape data object
 *   walkMode — boolean; when true, switches to first-person WalkControls
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { GROUND_HEIGHT } from '../../constants/renderConfig';
import WalkControls from './controls/WalkControls';

import Ground from './scene/Ground';
import LandBoundary from './scene/LandBoundary';
import BoundaryWall from './scene/BoundaryWall';
import Road from './scene/Road';
import House from './scene/House';
import Garage from './scene/Garage';
import LandscapeObject from './objects/LandscapeObject';
import PathwayMesh from './objects/PathwayMesh';
import Compass from './scene/Compass';


export default function ThreeDViewer({ layout, walkMode = false }) {
  if (!layout) return null;

  const { land, house, objects = [], pathways = [] } = layout;
  const camTarget = [land.width / 2, 0, land.depth / 2];
  const maxDim = Math.max(land.width, land.depth);

  return (
    <Canvas
      shadows
      camera={{
        position: walkMode
          ? [land.width / 2, GROUND_HEIGHT + 1.7, land.depth / 2 + land.depth * 0.35]
          : [land.width * 1.2, land.depth * 0.9, land.depth * 1.4],
        fov: walkMode ? 75 : 50,
        near: 0.1,
        far: 1000,
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
      {walkMode ? (
        <WalkControls land={land} house={house} car_park={layout.car_park} objects={objects} />
      ) : (

        <OrbitControls
          target={camTarget}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={maxDim * 3}
        />
      )}

      {/* ── Ambient sky (replaces Environment preset="night") ── */}
      <hemisphereLight skyColor="#1a2a3a" groundColor="#0a1a0a" intensity={0.6} />

      {/* ── Scene elements ── */}
      {/* Ground renders immediately and loads texture imperatively in background */}
      <Ground land={land} />

      <Suspense fallback={null}>
        <LandBoundary land={land} />
        <BoundaryWall land={land} gate={layout.gate} house={house} />
        <Road land={land} direction={land.road_direction} />

        <Grid
          position={[land.width / 2, GROUND_HEIGHT + 0.01, land.depth / 2]}
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

        {/* ── Car Park ── */}
        {layout.car_park && (
          layout.car_park.type === 'covered' ? (
            <Garage 
              x={layout.car_park.x} 
              y={layout.car_park.y} 
              width={layout.car_park.width} 
              depth={layout.car_park.depth} 
              numVehicles={Math.round(layout.car_park.width / 3.0)} 
              rotation={layout.car_park.rotation}
            />
          ) : (
            <mesh 
              position={[
                layout.car_park.x + layout.car_park.width / 2, 
                GROUND_HEIGHT + 0.02, 
                layout.car_park.y + layout.car_park.depth / 2
              ]} 
              rotation={[0, (layout.car_park.rotation * Math.PI) / 180, 0]}
              receiveShadow
            >
              <boxGeometry args={[layout.car_park.width, 0.05, layout.car_park.depth]} />
              <meshStandardMaterial color="#64748b" roughness={0.9} />
            </mesh>
          )
        )}


        {/* ── House (drawn last so it's always on top) ── */}
        <House house={house} />

        {/* ── Compass (North Arrow) ── */}
        <Compass land={land} />
      </Suspense>
    </Canvas>
  );
}

