"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";

function ExtinguisherMesh() {
  return (
    <group position={[0, -0.55, 0]}>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.18, 24]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.25, 16]} />
        <meshStandardMaterial color="#b91c1c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 1.35, 32]} />
        <meshStandardMaterial color="#dc2626" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0.22, 0.7, 0.2]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.04]} />
        <meshStandardMaterial color="#f4f4f5" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.15, 0.34]}>
        <torusGeometry args={[0.12, 0.02, 12, 32]} />
        <meshStandardMaterial color="#e4e4e7" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function ExtinguisherScene() {
  return (
    <div className="h-[320px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0d]">
      <Canvas camera={{ position: [1.6, 1.1, 2.2], fov: 42 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#0d0d0d"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <ExtinguisherMesh />
          <Environment preset="city" />
          <ContactShadows opacity={0.45} scale={8} blur={2.5} far={4} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.7}
          minDistance={1.8}
          maxDistance={3.4}
        />
      </Canvas>
    </div>
  );
}
