import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { Suspense, useRef } from "react";

function FloatingShape() {
  const meshRef = useRef<THREE.Mesh>(null);
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1.2}>
      <mesh ref={meshRef} scale={1.8}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.15}
          roughness={0.2}
          metalness={0.8}
          distort={0.25}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const positions = new Float32Array(300 * 3);
  for (let i = 0; i < 300 * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 12;
  }
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={300}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#8b5cf6" transparent opacity={0.6} />
    </points>
  );
}

export default function Hero3D() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#8b5cf6" />
        <Suspense fallback={null}>
          <FloatingShape />
          <Particles />
        </Suspense>
      </Canvas>
    </div>
  );
}
