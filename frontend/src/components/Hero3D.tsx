import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

function FloatingShapes() {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
      {/* Main centerpiece - large icosahedron */}
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1.5}>
        <mesh scale={2.2} position={[0, 0, 0]}>
          <icosahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial
            color="#6366f1"
            emissive="#6366f1"
            emissiveIntensity={0.2}
            roughness={0.15}
            metalness={0.9}
            distort={0.3}
            speed={3}
          />
        </mesh>
      </Float>

      {/* Orbiting torus ring */}
      <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.8}>
        <mesh position={[2.8, 1.2, -1]} scale={0.9} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1, 0.15, 16, 48]} />
          <MeshDistortMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={0.1}
            roughness={0.3}
            metalness={0.6}
            distort={0.15}
            speed={2}
          />
        </mesh>
      </Float>

      {/* Small sphere */}
      <Float speed={1.8} rotationIntensity={0.3} floatIntensity={1.0}>
        <mesh position={[-2.5, -1.5, -1.5]} scale={0.6}>
          <sphereGeometry args={[1, 32, 32]} />
          <MeshDistortMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={0.15}
            roughness={0.2}
            metalness={0.7}
            distort={0.4}
            speed={2.5}
          />
        </mesh>
      </Float>

      {/* Small orbiting shape */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.6}>
        <mesh position={[1.8, -1.8, 1]} scale={0.4}>
          <dodecahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.1}
            roughness={0.3}
            metalness={0.5}
            distort={0.2}
            speed={1.5}
          />
        </mesh>
      </Float>

      {/* Extra distant ring */}
      <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.4}>
        <mesh position={[-1.5, 2.5, -2.5]} scale={0.5} rotation={[Math.PI / 4, Math.PI / 3, 0]}>
          <torusGeometry args={[1.2, 0.08, 16, 32]} />
          <meshStandardMaterial color="#6366f1" transparent opacity={0.3} wireframe />
        </mesh>
      </Float>
    </group>
  );
}

function ParticleField() {
  const count = 600;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = new THREE.Color().setHSL(0.65 + Math.random() * 0.15, 0.8, 0.5);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return col;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

function GridLines() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <gridHelper args={[20, 20, "#4f46e5", "#312e81"]} />
    </mesh>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#8b5cf6" />
        <pointLight position={[0, 3, 3]} intensity={0.5} color="#6366f1" />
        <Suspense fallback={null}>
          <FloatingShapes />
          <ParticleField />
          <GridLines />
        </Suspense>
      </Canvas>
    </div>
  );
}
