import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// ─── Orbiting Glow Ring ───────────────────────────────────────

function OrbitRing({ radius = 2.2, color = "#6366f1", speed = 0.3 }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.PI / 3;
    meshRef.current.rotation.z += speed * 0.01;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.1, 0]}>
      <ringGeometry args={[radius - 0.02, radius, 64]} />
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Orbiting Dots on Ring ────────────────────────────────────

function OrbitDots({ count = 12, radius = 2.2, color = "#a78bfa" }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = Math.PI / 3;
    groupRef.current.rotation.z += 0.02;
    groupRef.current.rotation.y += 0.005;
  });

  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      })),
    [count],
  );

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {dots.map((dot, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(dot.angle) * radius,
            0,
            Math.sin(dot.angle) * radius,
          ]}
        >
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Secondary Ring (tilted) ──────────────────────────────────

function TiltedRing() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.PI / 2.5;
    meshRef.current.rotation.y += 0.008;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]}>
      <ringGeometry args={[1.5, 1.52, 48]} />
      <meshPhysicalMaterial
        color="#8b5cf6"
        emissive="#8b5cf6"
        emissiveIntensity={0.2}
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Code Particles (colored floating symbols) ────────────────

function CodeParticles({ count = 80 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.5 + Math.random() * 3;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r * 0.6 + 0.3;
      pos[i * 3 + 2] = Math.cos(phi) * r;
      sizes[i] = 0.02 + Math.random() * 0.03;
    }
    return { pos, sizes };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      const t = state.clock.elapsedTime;
      dummy.position.set(
        data.pos[i * 3] + Math.sin(t * 0.2 + i * 0.7) * 0.3,
        data.pos[i * 3 + 1] + Math.sin(t * 0.15 + i * 0.5) * 0.3,
        data.pos[i * 3 + 2] + Math.cos(t * 0.2 + i * 0.6) * 0.3,
      );
      const s = data.sizes[i] * (1 + Math.sin(t * 0.5 + i) * 0.3);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.3, 0.3, 0.03]} />
      <meshPhysicalMaterial
        color="#6366f1"
        emissive="#6366f1"
        emissiveIntensity={0.6}
        transparent
        opacity={0.5}
        metalness={0.2}
        roughness={0.3}
      />
    </instancedMesh>
  );
}

// ─── Screen Content (code lines with animation) ──────────────

function ScreenContent() {
  const codeLines = useMemo(
    () => [
      { color: "#6366f1", text: "import { AI } from 'devsync'" },
      { color: "#a78bfa", text: "const app = new DevApp()" },
      { color: "#f59e0b", text: "app.on('deploy', async () => {" },
      { color: "#10b981", text: "  const build = await app.build()" },
      { color: "#38bdf8", text: "  await deploy(build, { region: 'auto' })" },
      { color: "#f472b6", text: "  return { status: 'live' }" },
      { color: "#f59e0b", text: "})" },
    ],
    [],
  );

  // Animate line opacity/position
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material && Array.isArray(mesh.material)) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        // Wave opacity
        const delay = i * 0.3;
        const pulse = Math.sin((t + delay) * 0.8) * 0.15 + 0.85;
        mat.opacity = pulse;
        // Subtle position wave
        const yBase = 0.95 - i * 0.14;
        mesh.position.y = yBase + Math.sin(t * 0.5 + i) * 0.01;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {codeLines.map((line, i) => {
        const yBase = 0.95 - i * 0.14;
        return (
          <group key={i} position={[-0.82, yBase, -0.77]} rotation={[0.15, 0, 0]}>
            {Array.from({ length: Math.ceil(line.text.length * 0.38) }).map(
              (_, j) => (
                <mesh
                  key={j}
                  position={[j * 0.068, 0, 0]}
                >
                  <planeGeometry args={[0.05, 0.02]} />
                  <meshPhysicalMaterial
                    color={line.color}
                    emissive={line.color}
                    emissiveIntensity={0.6}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              ),
            )}
          </group>
        );
      })}
      {/* Blinking cursor */}
      <mesh position={[0.3, 0.55 + 0.95 - codeLines.length * 0.14 + 0.07, -0.77]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[0.025, 0.12]} />
        <meshPhysicalMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={1}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ─── Scan Line Effect Overlay ────────────────────────────────

function ScanLines() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    if (mat) {
      mat.opacity = 0.03 + Math.sin(state.clock.elapsedTime * 2) * 0.015;
    }
  });

  return (
    <mesh position={[0, 0.55, -0.76]} rotation={[0.15, 0, 0]}>
      <planeGeometry args={[1.9, 1.1, 1, 30]} />
      <meshPhysicalMaterial
        color="#6366f1"
        transparent
        opacity={0.04}
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── The 3D Laptop ───────────────────────────────────────────

function Laptop() {
  const group = useRef<THREE.Group>(null);
  const screenGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Gentle floating + rotation
    group.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    group.current.position.y = Math.sin(t * 0.25) * 0.04;

    // Pulse screen glow
    if (screenGlowRef.current) {
      const mat = screenGlowRef.current.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.12 + Math.sin(t * 0.5) * 0.06;
      }
    }
  });

  return (
    <group ref={group}>
      {/* ── Base / Keyboard ── */}
      {/* Bottom case */}
      <mesh position={[0, -0.22, 0]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[2.2, 0.06, 1.5]} />
        <meshPhysicalMaterial
          color="#181825"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      {/* Keyboard surface */}
      <mesh position={[0, -0.17, 0.06]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[1.85, 0.01, 1.1]} />
        <meshPhysicalMaterial color="#1e1e30" metalness={0.3} roughness={0.8} />
      </mesh>
      {/* Keyboard grid lines */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 12 }).map((_, col) => (
          <mesh
            key={`key-${row}-${col}`}
            position={[
              -0.78 + col * 0.14,
              -0.16,
              0.5 - row * 0.2,
            ]}
            rotation={[-0.08, 0, 0]}
          >
            <planeGeometry args={[0.1, 0.04]} />
            <meshPhysicalMaterial
              color="#2a2a40"
              metalness={0.2}
              roughness={0.9}
            />
          </mesh>
        )),
      )}
      {/* Trackpad */}
      <mesh position={[0, -0.16, -0.32]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshPhysicalMaterial
          color="#222236"
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>

      {/* ── Screen / Lid ── */}
      {/* Bezel */}
      <mesh position={[0, 0.6, -0.86]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[2.15, 1.35, 0.04]} />
        <meshPhysicalMaterial
          color="#0f0f18"
          metalness={0.95}
          roughness={0.1}
        />
      </mesh>
      {/* Screen panel */}
      <mesh position={[0, 0.6, -0.83]} rotation={[0.12, 0, 0]}>
        <planeGeometry args={[1.95, 1.15]} />
        <meshPhysicalMaterial
          color="#131322"
          emissive="#6366f1"
          emissiveIntensity={0.1}
          metalness={0}
          roughness={0.05}
        />
      </mesh>
      {/* Screen outer glow */}
      <mesh
        ref={screenGlowRef}
        position={[0, 0.6, -0.82]}
        rotation={[0.12, 0, 0]}
      >
        <planeGeometry args={[2.25, 1.45]} />
        <meshPhysicalMaterial
          color="#6366f1"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          emissive="#6366f1"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* ── Code Lines on Screen ── */}
      <ScreenContent />
      <ScanLines />

      {/* ── Hinge detail ── */}
      <mesh position={[0, -0.01, -0.12]}>
        <cylinderGeometry args={[0.03, 0.03, 2.2, 8]} />
        <meshPhysicalMaterial
          color="#1e1e30"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// ─── Ground Glow ─────────────────────────────────────────────

function GroundGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    if (mat) {
      mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.3) * 0.04;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.45, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[4, 4]} />
      <meshPhysicalMaterial
        color="#6366f1"
        transparent
        opacity={0.1}
        emissive="#6366f1"
        emissiveIntensity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Hero Export ─────────────────────────────────────────────

export default function Hero3D() {
  return (
    <div className="w-full h-[450px] md:h-[550px] relative">
      <Canvas
        camera={{ position: [0, 1.5, 4.5], fov: 40 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        {/* ── Lighting ── */}
        <ambientLight intensity={0.4} />
        {/* Main front light */}
        <spotLight
          position={[2, 3, 3]}
          angle={0.4}
          penumbra={0.8}
          intensity={2}
          color="#6366f1"
          distance={10}
        />
        {/* Back rim light */}
        <spotLight
          position={[-2, 2, -2]}
          angle={0.3}
          penumbra={0.9}
          intensity={0.8}
          color="#a78bfa"
        />
        {/* Top fill */}
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#8b5cf6" />
        {/* Side accent */}
        <pointLight position={[2.5, 0.5, 0]} intensity={0.6} color="#f472b6" />
        {/* Bottom glow */}
        <pointLight position={[0, -0.5, 0]} intensity={0.4} color="#6366f1" />

        {/* ── Scene ── */}
        <Float speed={1.5} rotationIntensity={0.06} floatIntensity={0.2}>
          <Laptop />
        </Float>

        {/* Orbiting rings */}
        <OrbitRing radius={2.3} color="#6366f1" speed={0.3} />
        <OrbitRing radius={2.6} color="#a78bfa" speed={-0.2} />
        <OrbitDots count={16} radius={2.3} color="#a78bfa" />
        <OrbitDots count={12} radius={2.6} color="#6366f1" />
        <TiltedRing />

        {/* Particles */}
        <CodeParticles count={100} />

        {/* Ground effects */}
        <GroundGlow />
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.25}
          scale={5}
          blur={3}
          far={1.5}
        />
      </Canvas>
    </div>
  );
}
