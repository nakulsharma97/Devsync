import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Text3D, Center, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/** Floating code symbols around the laptop */
function CodeParticles({ count = 40 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4 + 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
    }
    return pos;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        positions[i * 3] + Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.2,
        positions[i * 3 + 1] + Math.cos(state.clock.elapsedTime * 0.4 + i) * 0.2,
        positions[i * 3 + 2] + Math.sin(state.clock.elapsedTime * 0.2 + i) * 0.2,
      );
      dummy.scale.setScalar(0.02 + Math.sin(state.clock.elapsedTime + i) * 0.005);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 0.1]} />
      <meshStandardMaterial
        color="#6366f1"
        emissive="#6366f1"
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
}

/** The 3D Laptop model */
function Laptop() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Base / Keyboard */}
      <mesh position={[0, -0.2, 0]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[2, 0.06, 1.35]} />
        <meshPhysicalMaterial
          color="#1e1e2e"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      {/* Keyboard surface */}
      <mesh position={[0, -0.15, 0.05]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.7, 0.01, 1]} />
        <meshPhysicalMaterial color="#2a2a3e" metalness={0.5} roughness={0.8} />
      </mesh>
      {/* Screen bezel */}
      <mesh position={[0, 0.55, -0.82]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[2.1, 1.3, 0.04]} />
        <meshPhysicalMaterial
          color="#111118"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* Screen (glowing) */}
      <mesh position={[0, 0.55, -0.79]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[1.9, 1.1]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          emissive="#6366f1"
          emissiveIntensity={0.15}
          metalness={0}
          roughness={0.1}
        />
      </mesh>
      {/* Screen glow */}
      <mesh position={[0, 0.55, -0.78]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[2.2, 1.4]} />
        <meshPhysicalMaterial
          color="#6366f1"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Code lines on screen */}
      {[
        { y: 0.7, width: 1.2 },
        { y: 0.55, width: 0.8 },
        { y: 0.4, width: 1.4 },
        { y: 0.25, width: 0.6 },
        { y: 0.1, width: 1.0 },
        { y: -0.05, width: 0.5 },
      ].map((line, i) => (
        <mesh
          key={i}
          position={[-0.85 + line.width / 2, 0.55 + line.y, -0.77]}
          rotation={[0.15, 0, 0]}
        >
          <planeGeometry args={[line.width, 0.025]} />
          <meshPhysicalMaterial
            color={["#6366f1", "#a78bfa", "#f59e0b", "#10b981", "#6366f1", "#f472b6"][i]}
            emissive={["#6366f1", "#a78bfa", "#f59e0b", "#10b981", "#6366f1", "#f472b6"][i]}
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      {/* Cursor blink */}
      <mesh position={[0.5, 0.55 - 0.05, -0.77]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[0.03, 0.15]} />
        <meshPhysicalMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="w-full h-[400px] md:h-[500px] relative">
      {/* Soft gradient behind the 3D scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
      <Canvas
        camera={{ position: [0, 1, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[2, 3, 2]} angle={0.3} penumbra={0.8} intensity={1.5} color="#6366f1" />
        <spotLight position={[-2, 1, -2]} angle={0.3} penumbra={0.8} intensity={0.5} color="#a78bfa" />
        <pointLight position={[0, 0, 2]} intensity={0.3} />
        <pointLight position={[0, 2, -1]} intensity={0.8} color="#6366f1" />
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
          <Laptop />
        </Float>
        <CodeParticles count={50} />
        <ContactShadows
          position={[0, -0.4, 0]}
          opacity={0.3}
          scale={4}
          blur={2}
          far={1}
        />
      </Canvas>
    </div>
  );
}
