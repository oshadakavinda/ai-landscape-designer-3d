import React, { useMemo, Suspense, Component } from 'react';
import * as THREE from 'three';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, useGLTF, Clone } from '@react-three/drei';
import { TextureLoader } from 'three';
import { OBJECT_COLORS_3D, MODEL_PATHS } from '../data/featureCatalog';

// ─── Height fallback map ─────────────────────────────────────────────────────
const HEIGHTS = {
  bench: 0.6, pond: 0.1, fountain: 1.2, trees: 3.5,
  flower_beds: 0.15, vegetable_beds: 0.3, lawn: 0.02,
  pathway: 0.05, driveway: 0.05, garden_lights: 2.0,
  seating_area: 0.05, open_car_park: 0.05, covered_car_park: 2.0,
};

const LIFT = 0.02;

// ─── Ground texture colors (used while no texture is loaded) ────────────────
const GROUND_COLORS = {
  grass:        '#111d0f',
  stone_paving: '#2a2520',
  bare_earth:   '#1e160a',
  mixed:        '#141a10',
};

// ─── Material colors for flat objects ───────────────────────────────────────
const MATERIAL_COLORS = {
  grass:    '#2d5a1b',
  water:    '#1a4a6b',
  flowers:  '#7a2e6b',
  soil:     '#3d2010',
  stone:    '#4a4540',
  concrete: '#3a3a3a',
};

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ModelErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.warn('Model failed, using fallback box:', err.message); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ─── GLB Model with auto-scaling and ground alignment ───────────────────────
function GLBModel({ url, width, depth, fixedHeight }) {
  const { scene } = useGLTF(url);

  const { offsetX, offsetY, offsetZ, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const scaleX = width / size.x;
    const scaleZ = depth / size.z;
    const uniformScale = Math.min(scaleX, scaleZ);
    const scaleY = fixedHeight ? fixedHeight / size.y : uniformScale;

    return {
      offsetX: -(box.max.x + box.min.x) / 2,
      offsetY: -box.min.y,
      offsetZ: -(box.max.z + box.min.z) / 2,
      scale: [uniformScale, scaleY, uniformScale],
    };
  }, [scene, width, depth, fixedHeight]);

  return (
    <group position={[offsetX * scale[0], offsetY * scale[1], offsetZ * scale[2]]} scale={scale}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

// ─── Flat plane object (lawn, ponds, driveways, etc.) ───────────────────────
function FlatObject({ obj }) {
  const cx = obj.x + obj.width / 2;
  const cz = obj.y + obj.depth / 2;
  const color = MATERIAL_COLORS[obj.material] || OBJECT_COLORS_3D[obj.type] || '#444';
  const h = obj.height ?? HEIGHTS[obj.type] ?? 0.05;
  const isWater = obj.material === 'water';

  return (
    <mesh
      position={[cx, h / 2 + LIFT, cz]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[obj.width, h, obj.depth]} />
      <meshStandardMaterial
        color={color}
        roughness={isWater ? 0.05 : 0.85}
        metalness={isWater ? 0.1 : 0.0}
        opacity={isWater ? 0.8 : 1.0}
        transparent={isWater}
      />
    </mesh>
  );
}

// ─── Box fallback (used while model loads or on error) ───────────────────────
function BoxFallback({ obj, cx, cz }) {
  const color = OBJECT_COLORS_3D[obj.type] || '#888888';
  const h = obj.height ?? HEIGHTS[obj.type] ?? 0.5;
  const x = cx ?? (obj.x + obj.width / 2);
  const z = cz ?? (obj.y + obj.depth / 2);
  return (
    <group position={[x, h / 2 + LIFT, z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[obj.width, h, obj.depth]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Main landscape object dispatcher ────────────────────────────────────────
function LandscapeObject({ obj }) {
  const cx = obj.x + obj.width / 2;
  const cz = obj.y + obj.depth / 2;
  const renderType = obj.render_type || 'model';

  // Flat objects: rendered as textured planes, no GLB needed
  if (renderType === 'flat') {
    return <FlatObject obj={obj} />;
  }

  // 3D model objects
  const modelUrl = MODEL_PATHS[obj.variant];
  const isArchitectural = obj.type === 'covered_car_park';

  if (modelUrl) {
    return (
      <group position={[cx, LIFT, cz]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
        <ModelErrorBoundary fallback={<BoxFallback obj={obj} cx={0} cz={0} />}>
          <Suspense fallback={<BoxFallback obj={obj} cx={0} cz={0} />}>
            <GLBModel
              url={modelUrl}
              width={obj.width}
              depth={obj.depth}
              fixedHeight={isArchitectural ? (obj.height ?? 2.0) : null}
            />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  return <BoxFallback obj={obj} cx={cx} cz={cz} />;
}

// ─── Pathway renderer ─────────────────────────────────────────────────────────
function PathwayMesh({ pathway }) {
  const color = MATERIAL_COLORS[pathway.material] || '#4a4540';

  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < pathway.points.length - 1; i++) {
      const [x0, z0] = pathway.points[i];
      const [x1, z1] = pathway.points[i + 1];
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const len = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
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

// ─── House ────────────────────────────────────────────────────────────────────
function House({ house }) {
  const cx = house.x + house.width / 2;
  const cz = house.y + house.depth / 2;
  const h = 2;
  return (
    <group position={[cx, h / 2 + LIFT, cz]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[house.width, h, house.depth]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.6} />
      </mesh>
      <Text
        position={[0, h / 2 + 0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        HOUSE
      </Text>
    </group>
  );
}

// ─── Land boundary glow ──────────────────────────────────────────────────────
function LandBoundary({ land }) {
  return (
    <group position={[land.width / 2, -0.1, land.depth / 2]}>
      <mesh receiveShadow>
        <boxGeometry args={[land.width + 0.4, 0.2, land.depth + 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[land.width + 0.45, 0.02, land.depth + 0.45]} />
        <meshStandardMaterial color="#63be7b" emissive="#63be7b" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ─── Road ─────────────────────────────────────────────────────────────────────
function Road({ land, direction }) {
  const roadWidth = 4;
  const isHoriz = direction === 'north' || direction === 'south';
  const pos =
    direction === 'north' ? [land.width / 2, 0, land.depth + roadWidth / 2 + 0.5] :
    direction === 'south' ? [land.width / 2, 0, -roadWidth / 2 - 0.5] :
    direction === 'east'  ? [land.width + roadWidth / 2 + 0.5, 0, land.depth / 2] :
                            [-roadWidth / 2 - 0.5, 0, land.depth / 2];
  const size = isHoriz ? [land.width + 10, 0.01, roadWidth] : [roadWidth, 0.01, land.depth + 10];
  return (
    <group position={pos}>
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.9} />
      </mesh>
      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, isHoriz ? 0 : Math.PI / 2]}
        fontSize={0.8}
        color="#4b5563"
      >
        PUBLIC ROAD ({direction.toUpperCase()})
      </Text>
    </group>
  );
}

// ─── Ground plane with texture ───────────────────────────────────────────────
const GROUND_TEXTURE_COLORS = {
  grass:        '#0d1c0a',
  stone_paving: '#252220',
  bare_earth:   '#1c1208',
  mixed:        '#121a0e',
};

function Ground({ land }) {
  const color = GROUND_TEXTURE_COLORS[land.ground_texture] || '#111d0f';
  return (
    <mesh receiveShadow position={[land.width / 2, 0, land.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[land.width, land.depth]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </mesh>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function ThreeDLayout({ layout }) {
  if (!layout) return null;

  const { land, house, objects = [], pathways = [] } = layout;
  const camTarget = [land.width / 2, 0, land.depth / 2];

  return (
    <Canvas
      shadows
      camera={{
        position: [land.width * 1.2, land.depth * 0.9, land.depth * 1.4],
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0e1a']} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[land.width * 0.8, land.depth, land.depth * 0.6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[land.width / 2, 8, land.depth / 2]} intensity={0.3} color="#63be7b" />

      <OrbitControls
        target={camTarget}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={Math.max(land.width, land.depth) * 3}
      />
      <Environment preset="night" />

      <Ground land={land} />
      <LandBoundary land={land} />
      <Road land={land} direction={land.road_direction} />

      <Grid
        position={[land.width / 2, 0.01, land.depth / 2]}
        args={[land.width, land.depth]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1a2a1a"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#2a4a2a"
        fadeDistance={Math.max(land.width, land.depth) * 2.5}
        infiniteGrid={false}
      />

      {/* Pathways */}
      {pathways.map(pw => (
        <PathwayMesh key={pw.id} pathway={pw} />
      ))}

      {/* Landscape objects */}
      {objects.map(obj => (
        <LandscapeObject key={obj.id} obj={obj} />
      ))}

      {/* House */}
      <House house={house} />
    </Canvas>
  );
}
