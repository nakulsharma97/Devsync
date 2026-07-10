import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Text3D, OrbitControls } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

// ─── Animated Torus Knot (centerpiece) ───────────────────────

function PulsingKnot() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.position.y = Math.sin(t * 0.5) * 0.3;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);
  });

  return (
    <mesh
      ref={meshRef}
      scale={1.8}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <torusKnotGeometry args={[1, 0.35, 128, 32]} />
      <MeshDistortMaterial
        color={hovered ? "#f472b6" : "#6366f1"}
        emissive={hovered ? "#f472b6" : "#6366f1"}
        emissiveIntensity={hovered ? 0.8 : 0.4}
        roughness={0.1}
        metalness={1}
        distort={0.4}
        speed={4}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

// ─── Orbiting Moons ──────────────────────────────────────────

function OrbitingMoons() {
  const groupRef = useRef<THREE.Group>(null);

  const moons = useMemo(() => [
    { radius: 3.2, speed: 0.4, size: 0.25, color: "#a855f7", offset: 0 },
    { radius: 4.0, speed: -0.3, size: 0.18, color: "#06b6d4", offset: 1.5 },
    { radius: 2.6, speed: 0.6, size: 0.15, color: "#f59e0b", offset: 3.0 },
    { radius: 3.8, speed: -0.5, size: 0.12, color: "#10b981", offset: 4.5 },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    moons.forEach((moon, i) => {
      const child = groupRef.current!.children[i];
      const angle = t * moon.speed + moon.offset;
      child.position.x = Math.cos(angle) * moon.radius;
      child.position.z = Math.sin(angle) * moon.radius;
      child.position.y = Math.sin(angle * 0.5 + moon.offset) * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {moons.map((moon, i) => (
        <mesh key={i} scale={moon.size}>
          <icosahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial
            color={moon.color}
            emissive={moon.color}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.8}
            distort={0.2}
            speed={2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Orbital Rings ───────────────────────────────────────────

function OrbitalRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.2) * 0.1;
      ring1Ref.current.rotation.z = t * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 4 + Math.cos(t * 0.3) * 0.1;
      ring2Ref.current.rotation.z = -t * 0.2;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref} scale={2.8}>
        <ringGeometry args={[1.2, 1.3, 64]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} scale={3.5}>
        <ringGeometry args={[1.1, 1.15, 64]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// ─── Wireframe Sphere Cage ───────────────────────────────────

function WireframeCage() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.1;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.15;
  });

  return (
    <mesh ref={meshRef} scale={4.5}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.08} />
    </mesh>
  );
}

// ─── Particle Galaxy ─────────────────────────────────────────

function ParticleGalaxy() {
  const count = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.3;
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const hue = 0.65 + Math.random() * 0.25;
      const c = new THREE.Color().setHSL(hue, 0.9, 0.4 + Math.random() * 0.4);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return col;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.03;
    pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Shooting Stars ──────────────────────────────────────────

function ShootingStars() {
  const count = 30;
  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 + 5,
        (Math.random() - 0.5) * 20 - 5
      ),
      speed: 0.5 + Math.random() * 2,
      delay: Math.random() * 10,
      life: 1 + Math.random() * 2,
    }));
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    stars.forEach((star, i) => {
      const localT = t - star.delay;
      if (localT < 0 || localT > star.life) {
        positions[i * 3] = star.position.x;
        positions[i * 3 + 1] = star.position.y;
        positions[i * 3 + 2] = star.position.z;
        return;
      }
      const progress = localT / star.life;
      positions[i * 3] = star.position.x + progress * 8 * (Math.random() > 0.5 ? 1 : -1);
      positions[i * 3 + 1] = star.position.y - progress * 5;
      positions[i * 3 + 2] = star.position.z + progress * 4;
    });
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const positions = useMemo(() => new Float32Array(stars.map((s) => [s.position.x, s.position.y, s.position.z]).flat()), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#ffffff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ─── Holographic Grid ────────────────────────────────────────

function HolographicGrid() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!gridRef.current) return;
    const t = clock.getElapsedTime();
    gridRef.current.position.y = -2.5 + Math.sin(t * 0.2) * 0.1;
  });

  return (
    <group ref={gridRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <gridHelper args={[16, 24, "#4f46e5", "#312e81"]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <gridHelper args={[12, 16, "#818cf8", "#6366f1"]} />
      </mesh>
    </group>
  );
}

// ─── Beam Lights ─────────────────────────────────────────────

function LightBeams() {
  const beam1Ref = useRef<THREE.Mesh>(null);
  const beam2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beam1Ref.current) {
      beam1Ref.current.position.x = Math.sin(t * 0.3) * 3;
      beam1Ref.current.position.z = Math.cos(t * 0.4) * 3;
    }
    if (beam2Ref.current) {
      beam2Ref.current.position.x = Math.sin(t * 0.2 + 2) * 4;
      beam2Ref.current.position.z = Math.cos(t * 0.25 + 1) * 4;
    }
  });

  return (
    <>
      <pointLight ref={beam1Ref} intensity={1.5} distance={8} color="#6366f1" />
      <pointLight ref={beam2Ref} intensity={1} distance={6} color="#a855f7" />
      <pointLight position={[0, 4, 0]} intensity={0.8} distance={10} color="#06b6d4" />
    </>
  );
}

// ─── Scene Background ────────────────────────────────────────

function SceneBackground() {
  return (
    <color attach="background" args={["#050510"]} />
  );
}

// ─── Main Scene ──────────────────────────────────────────────

function Scene() {
  return (
    <>
      <SceneBackground />
      <LightBeams />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.5} />
      <Suspense fallback={null}>
        <WireframeCage />
        <OrbitalRings />
        <PulsingKnot />
        <OrbitingMoons />
        <ParticleGalaxy />
        <ShootingStars />
        <HolographicGrid />
      </Suspense>
    </>
  );
}

// ─── Exported Component ──────────────────────────────────────

export default function Hero3D() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 1, 7], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
