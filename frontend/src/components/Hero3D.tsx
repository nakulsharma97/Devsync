import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

// ─── Optimized Torus Knot (centerpiece) ─────────────────────

function PulsingKnot() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.position.y = Math.sin(t * 0.5) * 0.3;
  });

  return (
    <mesh
      ref={meshRef}
      scale={1.6}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <torusKnotGeometry args={[1, 0.35, 64, 16]} />
      <MeshDistortMaterial
        color={hovered ? "#f472b6" : "#6366f1"}
        emissive={hovered ? "#f472b6" : "#6366f1"}
        emissiveIntensity={hovered ? 0.8 : 0.4}
        roughness={0.1}
        metalness={1}
        distort={0.3}
        speed={3}
      />
    </mesh>
  );
}

// ─── Optimized Orbiting Moons ────────────────────────────────

function OrbitingMoons() {
  const moon1Ref = useRef<THREE.Mesh>(null);
  const moon2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (moon1Ref.current) {
      const a = t * 0.4;
      moon1Ref.current.position.set(Math.cos(a) * 3.2, Math.sin(a * 0.5) * 0.5, Math.sin(a) * 3.2);
    }
    if (moon2Ref.current) {
      const a = -t * 0.3 + 1.5;
      moon2Ref.current.position.set(Math.cos(a) * 3.8, Math.sin(a * 0.5 + 1) * 0.4, Math.sin(a) * 3.8);
    }
  });

  return (
    <>
      <mesh ref={moon1Ref} scale={0.22}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={moon2Ref} scale={0.16}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>
    </>
  );
}

// ─── Single Orbital Ring ─────────────────────────────────────

function OrbitalRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = clock.getElapsedTime() * 0.15;
  });

  return (
    <mesh ref={ringRef} scale={2.8}>
      <ringGeometry args={[1.15, 1.25, 32]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Optimized Particles ─────────────────────────────────────

function Particles() {
  const count = 400;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={pointsRef} geometry={geom}>
      <pointsMaterial size={0.05} color="#818cf8" transparent opacity={0.7} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ─── Grid Floor ──────────────────────────────────────────────

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <gridHelper args={[14, 20, "#4f46e5", "#312e81"]} />
    </mesh>
  );
}

// ─── Scene ───────────────────────────────────────────────────

function Scene() {
  return (
    <>
      <color attach="background" args={["#0a0a2e"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <pointLight position={[0, 4, 0]} intensity={0.8} distance={12} color="#818cf8" />
      <Suspense fallback={null}>
        <OrbitalRing />
        <PulsingKnot />
        <OrbitingMoons />
        <Particles />
        <GridFloor />
      </Suspense>
    </>
  );
}

// ─── Exported Component ──────────────────────────────────────

export default function Hero3D({
  intensity = 0,
  color = "#000000",
}: {
  intensity?: number;
  color?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasOverlay = intensity > 0;
  const overlayR = parseInt(color.slice(1, 3), 16);
  const overlayG = parseInt(color.slice(3, 5), 16);
  const overlayB = parseInt(color.slice(5, 7), 16);

  return (
    <div className="fixed inset-0 z-0">
      {/* Tinted dimming overlay — color + opacity = full control */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-all duration-500"
        style={{
          background: hasOverlay
            ? `rgba(${overlayR}, ${overlayG}, ${overlayB}, ${intensity})`
            : "transparent",
        }}
      />
      <Canvas
        camera={{ position: [0, 1, 7], fov: 50 }}
        dpr={[1, 1.0]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
