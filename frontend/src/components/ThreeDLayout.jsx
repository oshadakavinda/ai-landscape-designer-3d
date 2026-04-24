import React, { useMemo, Suspense, Component } from 'react';
import * as THREE from 'three';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, useGLTF, Clone } from '@react-three/drei';
import { OBJECT_COLORS_3D, MODEL_PATHS } from '../data/featureCatalog';

// Height map for each object type (visual variety for fallback boxes)
const HEIGHTS = {
  bench: 0.6, pond: 0.1, fountain: 1.2, trees: 3.5,
  flower_beds: 0.15, vegetable_beds: 0.3, lawn: 0.05,
  pathway: 0.05, driveway: 0.05, garden_lights: 2.0,
  seating_area: 0.1, open_car_park: 0.05, covered_car_park: 2.0,
};

class ModelErrorBoundary extends Component {

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Model failed to load, falling back to box:", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const LIFT = 0.02; // Small lift to sit perfectly on ground

function LandscapeObject({ obj }) {
  const modelUrl = MODEL_PATHS[obj.variant];
  const cx = obj.x + obj.width / 2;
  const cz = obj.y + obj.depth / 2;

  if (modelUrl) {
    const isFixedType = obj.type === 'covered_car_park';
    return (
      <group position={[cx, LIFT, cz]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
        <ModelErrorBoundary fallback={<BoxFallback obj={obj} />}>
          <Suspense fallback={<BoxFallback obj={obj} />}>
            <GLBModel 
              url={modelUrl} 
              width={obj.width} 
              depth={obj.depth} 
              fixedHeight={isFixedType ? HEIGHTS[obj.type] : null}
            />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  return <BoxFallback obj={obj} cx={cx} cz={cz} />;
}


function GLBModel({ url, width, depth, fixedHeight }) {
  const { scene } = useGLTF(url);
  
  const { offsetX, offsetY, offsetZ, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const scaleX = width / size.x;
    const scaleZ = depth / size.z;
    const uniformScale = Math.min(scaleX, scaleZ);
    
    // If fixedHeight is provided, use it for Y, otherwise use uniform scale
    const scaleY = fixedHeight ? (fixedHeight / size.y) : uniformScale;
    
    // Calculate offsets to center the model horizontally and sit it on ground vertically
    const centerX = -(box.max.x + box.min.x) / 2;
    const centerZ = -(box.max.z + box.min.z) / 2;
    const bottomY = -box.min.y;
    
    return {
      offsetX: centerX,
      offsetY: bottomY,
      offsetZ: centerZ,
      scale: [uniformScale, scaleY, uniformScale]
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







function BoxFallback({ obj, cx, cz }) {
  const color = OBJECT_COLORS_3D[obj.type] || '#888888';
  const h = HEIGHTS[obj.type] ?? 0.5;
  const x = cx ?? (obj.x + obj.width / 2);
  const z = cz ?? (obj.y + obj.depth / 2);

  return (
    <group position={[x, h / 2 + LIFT, z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[obj.width, h, obj.depth]} />
        <meshStandardMaterial
          color={color}
          roughness={obj.type === 'pond' ? 0.1 : 0.7}
          metalness={obj.type === 'garden_lights' ? 0.8 : 0.0}
          opacity={obj.type === 'pond' ? 0.75 : 1}
          transparent={obj.type === 'pond'}
        />
      </mesh>
    </group>
  );
}

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
        fontSize={0.9}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        HOUSE
      </Text>
    </group>
  );
}

function LandBoundary({ land }) {
  return (
    <group position={[land.width / 2, -0.1, land.depth / 2]}>
      {/* Physical plot slab */}
      <mesh receiveShadow>
        <boxGeometry args={[land.width + 0.4, 0.2, land.depth + 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Glowing boundary line */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[land.width + 0.45, 0.02, land.depth + 0.45]} />
        <meshStandardMaterial color="#63be7b" emissive="#63be7b" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Road({ land, direction }) {
  const roadWidth = 4;
  const isHorizontal = direction === 'north' || direction === 'south';
  const pos = direction === 'north' ? [land.width / 2, 0, land.depth + roadWidth / 2 + 0.5] :
              direction === 'south' ? [land.width / 2, 0, -roadWidth / 2 - 0.5] :
              direction === 'east'  ? [land.width + roadWidth / 2 + 0.5, 0, land.depth / 2] :
              [ -roadWidth / 2 - 0.5, 0, land.depth / 2];

  const size = isHorizontal ? [land.width + 10, 0.01, roadWidth] : [roadWidth, 0.01, land.depth + 10];

  return (
    <group position={pos}>
      <mesh receiveShadow>
        <planeGeometry args={size} rotation={[-Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.9} />
      </mesh>
      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, isHorizontal ? 0 : Math.PI / 2]}
        fontSize={0.8}
        color="#4b5563"
      >
        PUBLIC ROAD ({direction.toUpperCase()})
      </Text>
    </group>
  );
}

function Ground({ land }) {
  return (
    <mesh receiveShadow position={[land.width / 2, 0, land.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[land.width, land.depth]} />
      <meshStandardMaterial 
        color="#111d0f" 
        roughness={1} 
        metalness={0}
      />
    </mesh>
  );
}


export default function ThreeDLayout({ layout }) {
  if (!layout) return null;

  const { land, house, objects = [] } = layout;
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
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[land.width, 20, land.depth]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 8, 0]} intensity={0.3} color="#a7f3d0" />

        <Environment preset="night" />

        <Ground land={land} />
        <LandBoundary land={land} />
        <Road land={land} direction={land.road_direction} />

        <Grid

          position={[land.width / 2, 0.01, land.depth / 2]}
          args={[land.width, land.depth]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#1a2e1a"
          sectionSize={5}
          sectionColor="#2d4a2d"
          sectionThickness={0.8}
          fadeDistance={100}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <House house={house} />

        {objects.map(obj => (
          <LandscapeObject key={obj.id} obj={obj} />
        ))}

        <OrbitControls
          target={camTarget}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={200}
        />
      </Suspense>
    </Canvas>
  );
}

