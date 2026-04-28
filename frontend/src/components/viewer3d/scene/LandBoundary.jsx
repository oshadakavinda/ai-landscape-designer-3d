export default function LandBoundary({ land }) {
  return (
    <group position={[land.width / 2, -0.1, land.depth / 2]}>
      {/* Physical plot slab */}
      <mesh receiveShadow>
        <boxGeometry args={[land.width + 0.4, 0.2, land.depth + 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Glowing boundary perimeter */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[land.width + 0.45, 0.02, land.depth + 0.45]} />
        <meshStandardMaterial color="#605647" emissive="#605647" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
