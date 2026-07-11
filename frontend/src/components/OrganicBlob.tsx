import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Environment, Float } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

// ─── Custom shader-based organic blob ──────────────────────

function OrganicRibbon({ mouse }: { mouse: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Y-axis rotation: 15s per loop
    meshRef.current.rotation.y += 0.005;

    // Mouse tilt — smooth follow
    const targetRotX = mouse.y * 0.15;
    const targetRotZ = mouse.x * 0.2;
    meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.02;
    meshRef.current.rotation.z += (targetRotZ - meshRef.current.rotation.z) * 0.02;

    // Scale breathing: 1 → 1.03 → 1
    const breathe = 1 + Math.sin(t * 0.4) * 0.015;
    meshRef.current.scale.setScalar(breathe);

    // Sync glow mesh
    if (glowRef.current) {
      glowRef.current.rotation.copy(meshRef.current.rotation);
      glowRef.current.scale.setScalar(breathe * 1.25);
    }
  });

  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef} scale={1.25}>
        <torusKnotGeometry args={[1, 0.32, 96, 24]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Main organic blob */}
      <mesh
        ref={meshRef}
        scale={1}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <torusKnotGeometry args={[1, 0.32, 128, 24]} />
        <MeshDistortMaterial
          color={hovered ? "#818cf8" : "#6366f1"}
          emissive="#6366f1"
          emissiveIntensity={hovered ? 0.8 : 0.45}
          roughness={0.08}
          metalness={0.95}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          distort={hovered ? 0.45 : 0.3}
          speed={hovered ? 5 : 3}
          envMapIntensity={2}
        />
      </mesh>

      {/* Inner core glow */}
      <mesh scale={0.6}>
        <torusKnotGeometry args={[1, 0.32, 64, 16]} />
        <meshBasicMaterial
          color="#a5b4fc"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────

function Scene({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <>
      <color attach="background" args={["transparent"]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#818cf8" />
      <directionalLight position={[-3, -2, 4]} intensity={0.6} color="#6366f1" />
      <pointLight position={[0, 3, 2]} intensity={1.2} distance={10} color="#818cf8" />
      <pointLight position={[3, -1, -2]} intensity={0.8} distance={10} color="#6366f1" />
      <Environment preset="night" />
      <Suspense fallback={null}>
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.4}>
          <OrganicRibbon mouse={mouse} />
        </Float>
      </Suspense>
    </>
  );
}

// ─── Exported Component ──────────────────────────────────

export default function OrganicBlob() {
  const [mounted, setMounted] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);

    const handleMouse = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  if (!mounted) return <div className="w-full h-full" />;

  return (
    <div className="w-full h-full relative">
      {/* Ambient blue glow around canvas */}
      <div
        className="absolute -inset-20 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: "transparent" }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
