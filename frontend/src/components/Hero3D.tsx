import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Morphing Torus Knot ──────────────────────────────────────

function MorphingTorus() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // Store original positions to morph from
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh || !mat) return;
    const t = state.clock.elapsedTime;

    mesh.rotation.x = Math.sin(t * 0.1) * 0.2;
    mesh.rotation.y = t * 0.15;
    mesh.rotation.z = Math.sin(t * 0.08) * 0.1;

    const hue = ((Math.sin(t * 0.05) * 0.5 + 0.5) * 0.15 + 0.65);
    mat.color = new THREE.Color().setHSL(hue, 0.7, 0.4);
    mat.emissive = new THREE.Color().setHSL(hue, 0.8, 0.15);
    mat.emissiveIntensity = 0.3 + Math.sin(t * 0.3) * 0.15;
    mat.opacity = 0.4 + Math.sin(t * 0.2) * 0.1;

    // Morph vertices
    if (mesh.geometry) {
      const pos = mesh.geometry.attributes.position;
      if (pos && !geometryRef.current) {
        geometryRef.current = mesh.geometry.clone();
      }
      if (geometryRef.current) {
        const origPos = geometryRef.current.attributes.position;
        const array = pos.array as Float32Array;
        for (let i = 0; i < array.length; i += 3) {
          const x = origPos.array[i];
          const y = origPos.array[i + 1];
          const z = origPos.array[i + 2];
          const noise1 = Math.sin(x * 2 + t) * 0.08;
          const noise2 = Math.cos(y * 2 + t * 0.7) * 0.08;
          const noise3 = Math.sin(z * 2 + t * 0.5) * 0.08;
          array[i] = x + noise1;
          array[i + 1] = y + noise2;
          array[i + 2] = z + noise3;
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={1.8}>
      <torusKnotGeometry args={[1, 0.3, 180, 24]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#6366f1"
        emissive="#6366f1"
        emissiveIntensity={0.3}
        metalness={0.3}
        roughness={0.2}
        transparent
        opacity={0.5}
        wireframe={false}
        side={THREE.DoubleSide}
        clearcoat={0.2}
      />
    </mesh>
  );
}

// ─── Wireframe Outer Shell ────────────────────────────────────

function WireframeShell() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = Math.sin(t * 0.08 + 1) * 0.3;
    meshRef.current.rotation.y = -t * 0.1;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 0.15) * 0.03);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={2.6}>
      <icosahedronGeometry args={[1, 1]} />
      <meshPhysicalMaterial
        color="#a78bfa"
        emissive="#a78bfa"
        emissiveIntensity={0.1}
        wireframe
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Orbiting Particle Ring ───────────────────────────────────

function ParticleRing({ count = 200, radius = 3.2, color = "#6366f1", speed = 0.3 }) {
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      const r = radius + (Math.random() - 0.5) * 0.5;
      const yOffset = (Math.random() - 0.5) * 0.8;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = yOffset;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [count, radius]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += speed * 0.005;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.15;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Floating Energy Orbs ─────────────────────────────────────

function EnergyOrbs({ count = 30 }) {
  const groupRef = useRef<THREE.Group>(null);
  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      radius: 1.5 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.2,
      yOffset: (Math.random() - 0.5) * 3,
      phase: Math.random() * Math.PI * 2,
      size: 0.02 + Math.random() * 0.04,
      hue: 0.65 + Math.random() * 0.15,
    }));
  }, [count]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(count).fill(null));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    orbs.forEach((orb, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      const a = orb.angle + t * orb.speed;
      const r = orb.radius + Math.sin(t * 0.3 + orb.phase) * 0.3;
      m.position.x = Math.cos(a) * r;
      m.position.z = Math.sin(a) * r;
      m.position.y = orb.yOffset + Math.sin(t * 0.2 + orb.phase * 2) * 0.3;
      const s = orb.size * (1 + Math.sin(t * 0.5 + orb.phase) * 0.2);
      m.scale.setScalar(s * 10);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshPhysicalMaterial
            color={`hsl(${orb.hue * 360}, 80%, 60%)`}
            emissive={`hsl(${orb.hue * 360}, 80%, 60%)`}
            emissiveIntensity={1}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Floating Code Symbols ────────────────────────────────────

function CodeSymbols({ count = 30 }) {
  const groupRef = useRef<THREE.Group>(null);
  const symbols = useMemo(() => {
    const chars = ["{", "}", "<", ">", "/", "=", "→", "⚡", "★", "◆"];
    return Array.from({ length: count }, (_, i) => ({
      char: chars[i % chars.length],
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 6 - 2,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      color: `hsl(${220 + Math.random() * 60}, 80%, 60%)`,
    }));
  }, [count]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(count).fill(null));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    symbols.forEach((sym, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      m.position.y = sym.y + Math.sin(t * sym.speed + sym.phase) * 0.5;
      m.rotation.z = Math.sin(t * 0.5 + sym.phase) * 0.2;
      const s = 0.5 + Math.sin(t * sym.speed + sym.phase) * 0.2;
      m.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {symbols.map((sym, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[sym.x, sym.y, sym.z]}
        >
          <planeGeometry args={[0.15, 0.15]} />
          <meshPhysicalMaterial
            color={sym.color}
            emissive={sym.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Connecting Rays ──────────────────────────────────────────

function ConnectingRays() {
  const meshRef = useRef<THREE.LineSegments>(null);
  const positions = useMemo(() => {
    const points: number[] = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle1 = (i / count) * Math.PI * 2;
      const angle2 = ((i + 3) / count) * Math.PI * 2;
      const r1 = 2 + Math.random() * 0.5;
      const r2 = 2.5 + Math.random() * 0.5;
      // Line from point on inner circle to point on outer circle
      points.push(
        Math.cos(angle1) * r1, (Math.random() - 0.5) * 1.5, Math.sin(angle1) * r1,
        Math.cos(angle2) * r2, (Math.random() - 0.5) * 1.5, Math.sin(angle2) * r2,
      );
    }
    return new Float32Array(points);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.002;
  });

  return (
    <lineSegments ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#6366f1"
        transparent
        opacity={0.06}
      />
    </lineSegments>
  );
}

// ─── Main Background Component ────────────────────────────────

export default function Hero3D() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#6366f1" />
        <pointLight position={[-5, -3, 2]} intensity={0.8} color="#a78bfa" />
        <pointLight position={[0, 0, -5]} intensity={0.5} color="#f472b6" />

        {/* Main animated shapes */}
        <MorphingTorus />
        <WireframeShell />

        {/* Particles and effects */}
        <ParticleRing count={200} radius={3.2} color="#6366f1" speed={0.3} />
        <ParticleRing count={150} radius={3.8} color="#a78bfa" speed={-0.2} />
        <ParticleRing count={100} radius={2.5} color="#f472b6" speed={0.4} />

        {/* Energy orbs floating around */}
        <EnergyOrbs count={40} />

        {/* Code symbols */}
        <CodeSymbols count={25} />

        {/* Connecting rays */}
        <ConnectingRays />
      </Canvas>
    </div>
  );
}
