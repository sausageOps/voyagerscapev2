"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

export type ExplorerState = "idle" | "scanning" | "found" | "ready";

interface SceneProps {
  mode: ExplorerState;
  hovered: boolean;
  reducedMotion: boolean;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  onContextLost: () => void;
}

const cream = "#e9dfca";
const creamLight = "#f6eddb";
const graphite = "#242429";
const metal = "#8d8578";
const lavender = "#cbbcff";

function StatusDisplay({ mode }: { mode: ExplorerState }) {
  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = 512;
    el.height = 220;
    return el;
  }, []);
  const texture = useMemo(() => {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearFilter;
    return map;
  }, [canvas]);

  useLayoutEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#17201d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(208,235,207,.18)";
    for (let x = 30; x < 490; x += 46) ctx.fillRect(x, 62, 1, 126);
    ctx.fillStyle = "#dcebd8";
    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.fillText("VS / FIELD 01", 32, 48);
    ctx.font = '600 52px "JetBrains Mono", monospace';
    const label = mode === "idle" ? "LOOK CLOSER" : mode === "scanning" ? "SCANNING" : mode === "found" ? "SIGNAL FOUND" : "READY";
    ctx.fillText(label, 32, 128);
    ctx.fillStyle = mode === "scanning" ? "#e7c963" : mode === "idle" ? "#9faaa0" : "#78d2a5";
    const width = mode === "idle" ? 112 : mode === "scanning" ? 298 : 432;
    ctx.fillRect(32, 166, width, 12);
    texture.needsUpdate = true;
  }, [canvas, mode, texture]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[1.17, 0.24, 0.594]} rotation={[0, 0, -0.015]}>
      <planeGeometry args={[1.24, 0.53]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function OpticalAssembly({ ringRef }: { ringRef: React.MutableRefObject<THREE.Group | null> }) {
  const teeth = useMemo(() => Array.from({ length: 32 }), []);
  return (
    <group position={[-1.02, 0.02, 0.62]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.04, 1.04, 0.18, 64]} />
        <meshStandardMaterial color="#6e675c" metalness={0.68} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.91, 0.94, 0.22, 64]} />
        <meshStandardMaterial color={graphite} metalness={0.5} roughness={0.23} />
      </mesh>
      <group ref={ringRef} position={[0, 0, 0.29]}>
        <mesh>
          <torusGeometry args={[0.82, 0.105, 14, 64]} />
          <meshStandardMaterial color="#b5ac9d" metalness={0.72} roughness={0.22} />
        </mesh>
        {teeth.map((_, i) => {
          const a = (i / teeth.length) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.925, Math.sin(a) * 0.925, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.035, 0.1, 0.12]} />
              <meshStandardMaterial color="#4b4947" roughness={0.5} />
            </mesh>
          );
        })}
        <mesh position={[0, 0, 0.025]}>
          <torusGeometry args={[0.63, 0.026, 10, 64]} />
          <meshStandardMaterial color={lavender} emissive="#816daf" emissiveIntensity={0.16} roughness={0.25} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.335]}>
        <circleGeometry args={[0.62, 64]} />
        <meshPhysicalMaterial color="#101822" roughness={0.04} metalness={0.2} clearcoat={1} clearcoatRoughness={0.03} />
      </mesh>
      <mesh position={[-0.17, 0.2, 0.351]} scale={[1.1, 0.6, 1]}>
        <circleGeometry args={[0.22, 40]} />
        <meshBasicMaterial color="#94b9d0" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0.2, -0.2, 0.353]}>
        <circleGeometry args={[0.34, 40]} />
        <meshBasicMaterial color="#a98ed1" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ExplorerModel({ mode, hovered, reducedMotion, pointer }: Omit<SceneProps, "onContextLost">) {
  const root = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const ringAngle = useRef(0);
  const isScanning = mode === "scanning";
  const signal = mode === "found" || mode === "ready";

  useFrame((state, delta) => {
    if (!root.current || !ring.current) return;
    const dt = Math.min(delta, 0.05);
    const px = reducedMotion ? 0 : pointer.current.x;
    const py = reducedMotion ? 0 : pointer.current.y;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, -0.18 + px * 0.12, 4.8, dt);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, 0.08 - py * 0.075, 4.8, dt);
    root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, px * -0.018, 4.8, dt);
    root.current.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.75) * 0.025;

    const speed = isScanning ? 3.7 : hovered ? 0.55 : 0.08;
    if (!reducedMotion) ringAngle.current += dt * speed;
    ring.current.rotation.z = ringAngle.current;
    const lift = isScanning ? 0.14 : hovered ? 0.075 : 0;
    ring.current.position.z = THREE.MathUtils.damp(ring.current.position.z, 0.29 + lift, 7, dt);
    if (beam.current) {
      const material = beam.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.damp(material.opacity, isScanning ? 0.13 : 0, 8, dt);
      beam.current.rotation.z += isScanning && !reducedMotion ? dt * 1.6 : 0;
    }
  });

  const lamp = isScanning ? "#e7bd51" : signal ? "#52c58c" : "#8e877c";

  return (
    <group ref={root} rotation={[0.08, -0.18, 0]}>
      {/* broad asymmetric chassis: a field instrument, not a camera rectangle */}
      <RoundedBox args={[3.45, 1.65, 1.0]} radius={0.2} smoothness={5} position={[0.18, -0.03, 0]}>
        <meshStandardMaterial color={cream} roughness={0.58} metalness={0.08} />
      </RoundedBox>
      <RoundedBox args={[1.42, 1.25, 0.1]} radius={0.12} smoothness={4} position={[1.15, 0.08, 0.54]}>
        <meshStandardMaterial color="#3b3938" roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.38, 1.15, 1.08]} radius={0.12} smoothness={4} position={[1.78, -0.08, -0.02]}>
        <meshStandardMaterial color={creamLight} roughness={0.52} />
      </RoundedBox>
      <OpticalAssembly ringRef={ring} />
      <StatusDisplay mode={mode} />

      {/* recessed navigation cluster */}
      <mesh position={[0.76, -0.48, 0.604]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#171719" roughness={0.45} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[0.76 + Math.cos(a) * 0.13, -0.48 + Math.sin(a) * 0.13, 0.616]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.065, 0.028, 0.024]} />
            <meshBasicMaterial color="#d8ccff" />
          </mesh>
        );
      })}
      <mesh position={[1.22, -0.47, 0.612]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#efb7df" roughness={0.36} />
      </mesh>

      {/* status lamps, deliberately physical and small */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.53, 0.56 - i * 0.16, 0.61]}>
          <sphereGeometry args={[0.04, 18, 12]} />
          <meshStandardMaterial color={i === 0 ? lamp : i === 1 && signal ? "#52c58c" : "#6e675f"} emissive={i === 0 ? lamp : "#000000"} emissiveIntensity={isScanning || signal ? 0.75 : 0.08} />
        </mesh>
      ))}

      {/* antenna/signal fin, integrated into the top silhouette */}
      <group position={[1.38, 0.82, -0.08]} rotation={[0, 0, -0.13]}>
        <RoundedBox args={[0.16, 0.77, 0.15]} radius={0.06} smoothness={3} position={[0, 0.33, 0]}>
          <meshStandardMaterial color={graphite} roughness={0.4} metalness={0.38} />
        </RoundedBox>
        <mesh position={[0, 0.76, 0]}>
          <sphereGeometry args={[0.11, 24, 16]} />
          <meshStandardMaterial color={lavender} roughness={0.3} />
        </mesh>
      </group>

      {/* lower rail and sensor window */}
      <RoundedBox args={[1.06, 0.19, 0.16]} radius={0.06} smoothness={3} position={[-0.02, -0.9, -0.12]}>
        <meshStandardMaterial color={metal} metalness={0.58} roughness={0.34} />
      </RoundedBox>
      <mesh position={[-1.58, 0.58, 0.52]}>
        <circleGeometry args={[0.12, 28]} />
        <meshStandardMaterial color="#12191c" metalness={0.45} roughness={0.16} />
      </mesh>

      {/* restrained scanning sheet, only visible during the action */}
      <mesh ref={beam} position={[-1.02, 0.02, 1.02]}>
        <ringGeometry args={[0.08, 1.15, 64, 1, 0, 0.3]} />
        <meshBasicMaterial color="#d8ccff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CameraFit() {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const size = useThree((state) => state.size);
  useEffect(() => {
    camera.aspect = size.width / size.height;
    camera.position.set(0, 0.38, size.width / size.height < 1.25 ? 7.2 : 6.35);
    camera.lookAt(0.05, 0.05, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function ExplorerCanvas(props: SceneProps) {
  return (
    <Canvas
      flat
      dpr={[1, 1.65]}
      camera={{ fov: 38, near: 0.1, far: 40, position: [0, 0.3, 6.4] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          props.onContextLost();
        }, { once: true });
      }}
    >
      <CameraFit />
      <ambientLight intensity={1.4} />
      <directionalLight position={[-3, 5, 6]} intensity={3.5} color="#fff9ef" />
      <directionalLight position={[5, 1, 3]} intensity={1.4} color="#f1b8e4" />
      <directionalLight position={[-4, -2, 1]} intensity={0.8} color="#d8ccff" />
      <ExplorerModel {...props} />
    </Canvas>
  );
}
