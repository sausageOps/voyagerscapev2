"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import styles from "./CRTExperiment.module.css";

const SIGNALS = ["EXPLORE", "IMAGE", "SIGNAL", "UNKNOWN", "CAPTURE", "SCAN", "OBSERVE"];

function Shell({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const targetX = state.pointer.y * 0.12;
    const targetY = state.pointer.x * 0.18;
    if (!group.current) return;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.045;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.045;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.025;
  });
  return (
    <group ref={group} onClick={onActivate}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[4.8, 3.15, 1.38]} />
        <meshStandardMaterial color="#b8b0a1" roughness={0.68} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 0.78]}>
        <boxGeometry args={[4.3, 2.62, 0.16]} />
        <meshStandardMaterial color="#413e38" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0.9]}>
        <sphereGeometry args={[1, 32, 18, 0, Math.PI * 2, 0.28, Math.PI * 0.44]} />
        <meshStandardMaterial color={active ? "#c7eea2" : "#71836f"} emissive={active ? "#7e9f5c" : "#29352d"} emissiveIntensity={active ? 1.7 : 0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, -1.08, 0.84]}>
        <boxGeometry args={[4.05, 0.24, 0.12]} />
        <meshStandardMaterial color="#292722" roughness={0.8} />
      </mesh>
      {[[-1.52, -1.1], [-1.08, -1.1], [-0.64, -1.1]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.97]} onClick={(e) => { e.stopPropagation(); onActivate(); }}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 20]} />
          <meshStandardMaterial color={i === 1 && active ? "#d8c089" : "#918978"} roughness={0.3} metalness={0.45} />
        </mesh>
      ))}
      <mesh position={[1.2, -1.08, 0.97]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onActivate(); }}>
        <torusGeometry args={[0.28, 0.1, 12, 28]} />
        <meshStandardMaterial color="#6c6253" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[2.15, 0.34, 0.78]}>
        <boxGeometry args={[0.22, 0.52, 0.09]} />
        <meshStandardMaterial color="#191b18" roughness={0.35} emissive="#87a76d" emissiveIntensity={0.25} />
      </mesh>
      {/* Signature component: an offset observatory fin */}
      <mesh castShadow position={[1.74, 1.72, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color="#d0c8b8" roughness={0.62} />
      </mesh>
      {[ -1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].map((x) => (
        <mesh key={x} position={[x, -1.28, 0.72]}>
          <boxGeometry args={[0.2, 0.1, 0.12]} />
          <meshStandardMaterial color="#555047" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function CRTExperiment() {
  const [signal, setSignal] = useState(0);
  const [active, setActive] = useState(false);
  const activate = () => { setSignal((value) => (value + 1) % SIGNALS.length); setActive(true); };
  return (
    <section className={styles.experiment} aria-labelledby="crt-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>VS / VISUAL RESEARCH TERMINAL / 01</span>
        <h1 className={styles.title} id="crt-title">VOYAGERSCAPE <i>CRT</i></h1>
        <p className={styles.description}>A creative instrument for looking further. Press the machine to change its signal.</p>
      </div>
      <div className={styles.machine}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0.2, 8], fov: 32 }}>
          <ambientLight intensity={1.3} />
          <directionalLight position={[-4, 6, 7]} intensity={3.4} castShadow />
          <pointLight position={[0, 0, 4]} color="#b7d09a" intensity={active ? 2.4 : 1.1} distance={6} />
          <Shell active={active} onActivate={activate} />
        </Canvas>
        <div className={`${styles.screenCopy} ${active ? styles.live : ""}`} aria-live="polite">
          <span className={styles.screenLabel}>CHANNEL 07 / {String(signal + 1).padStart(2, "0")}</span>
          <strong>{SIGNALS[signal]}</strong>
          <span className={styles.screenLine}>NO IMAGE / FINDING FORM</span>
        </div>
        <button className={styles.machineButton} onClick={activate} aria-label="Change terminal signal">
          ACTUATE <span>↗</span>
        </button>
      </div>
      <div className={styles.footnote}><span>ANALOG IMAGE EXPLORATION DEVICE</span><span>TOUCH / CLICK TO SCAN</span></div>
    </section>
  );
}
