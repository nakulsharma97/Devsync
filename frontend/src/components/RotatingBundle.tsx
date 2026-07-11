import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";

function BundleKnot() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    // Rotate on both axes for a nice twisting effect
    meshRef.current.rotation.x = t * 0.35;
    meshRef.current.rotation.y = t * 0.5;
    // Gentle floating
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.15;
  });

  return (
    <mesh
      ref={meshRef}
      scale={2.2}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <torusKnotGeometry args={[1, 0.3, 128, 24]} />
      <MeshDistortMaterial
        color={hovered ? "#f472b6" : "#6366f1"}
        emissive={hovered ? "#f472b6" : "#6366f1"}
        emissiveIntensity={hovered ? 0.8 : 0.4}
        roughness={0.1}
        metalness={1}
        distort={hovered ? 0.5 : 0.25}
        speed={2}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <pointLight position={[0, 4, 0]} intensity={0.6} distance={12} color="#818cf8" />
      <Suspense fallback={null}>
        <BundleKnot />
      </Suspense>
    </>
  );
}

export default function RotatingBundle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full" />;

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
      }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
