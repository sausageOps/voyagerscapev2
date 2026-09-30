"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Cylinder } from "@react-three/drei";
import type { MutableRefObject } from "react";
import type { TallyState } from "../materials/palette";
import type { PointerField } from "../motion/usePointerField";
import type { ShutterSignal } from "../motion/shutterSignal";
import Lighting from "./Lighting";
import ContactShadow from "./ContactShadow";

interface Props {
  status: TallyState;
  capture: boolean;
  idle: boolean;
  pointer: MutableRefObject<PointerField>;
  shutter: MutableRefObject<ShutterSignal>;
  motionScale: number;
  mobileIdle: boolean;
  mobileInteracting: MutableRefObject<boolean>;
}

const SHELL = new THREE.MeshStandardMaterial({ color: "#b8a99d", roughness: 0.72, metalness: 0.08 });
const EDGE = new THREE.MeshStandardMaterial({ color: "#d6c9bb", roughness: 0.56, metalness: 0.12 });
const DARK = new THREE.MeshStandardMaterial({ color: "#282a2b", roughness: 0.58, metalness: 0.22 });
const BEZEL = new THREE.MeshStandardMaterial({ color: "#171a1b", roughness: 0.4, metalness: 0.28 });
const SCREEN = new THREE.MeshStandardMaterial({ color: "#9bb9a5", emissive: "#5c826f", emissiveIntensity: 0.38, roughness: 0.3, metalness: 0.06 });
const ORANGE = new THREE.MeshStandardMaterial({ color: "#df774f", emissive: "#bf4e31", emissiveIntensity: 0.6, roughness: 0.36 });
const GREEN = new THREE.MeshStandardMaterial({ color: "#aac9a7", emissive: "#78b481", emissiveIntensity: 1.1 });

function Knob({ position, rotation = [Math.PI / 2, 0, 0], scale = 1, active = false }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number; active?: boolean }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Cylinder args={[0.16, 0.18, 0.12, 20]} material={DARK} />
      <Cylinder args={[0.105, 0.105, 0.13, 20]} position={[0, 0.07, 0]} material={active ? ORANGE : EDGE} />
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 5]} material={DARK}>
        <boxGeometry args={[0.018, 0.08, 0.012]} />
      </mesh>
    </group>
  );
}

function Button({ position, active = false }: { position: [number, number, number]; active?: boolean }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.2, 0.1, 0.08]} radius={0.025} smoothness={2} material={DARK} />
      <RoundedBox args={[0.12, 0.028, 0.04]} position={[0, 0.055, 0]} radius={0.012} smoothness={2} material={active ? ORANGE : EDGE} />
    </group>
  );
}

export default function CRTRig({ status, capture, idle, pointer, shutter, motionScale, mobileIdle, mobileInteracting }: Props) {
  const root = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(SCREEN);
  const press = useRef(0);
  const lastSeq = useRef(-1);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!root.current) return;
    const dt = Math.min(delta, 0.05);
    const f = pointer.current;
    if (shutter.current.seq !== lastSeq.current) {
      lastSeq.current = shutter.current.seq;
      press.current = 1;
    }
    press.current = THREE.MathUtils.damp(press.current, 0, 9, dt);
    const idleYaw = mobileIdle ? Math.sin(state.clock.elapsedTime * 0.22) * 0.025 : 0;
    const yaw = idle ? f.x * 0.07 * motionScale + idleYaw : 0;
    const pitch = idle ? -f.y * 0.045 * motionScale : 0;
    target.set(yaw, pitch, 0);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, target.y, 5, dt);
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, target.x, 5, dt);
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, idle ? Math.sin(state.clock.elapsedTime * 0.7) * 0.018 : 0, 4, dt);
    root.current.position.z = THREE.MathUtils.damp(root.current.position.z, -press.current * 0.045, 10, dt);
    screen.current.emissiveIntensity = THREE.MathUtils.damp(screen.current.emissiveIntensity, capture ? 0.9 : 0.38 + Math.sin(state.clock.elapsedTime * 1.2) * 0.035, 3, dt);
  });

  return (
    <>
      <Lighting />
      <ContactShadow />
      <group ref={root} rotation={[0.035, -0.08, 0]}>
        {/* one-piece sculptural housing and inset front face */}
        <RoundedBox args={[3.25, 2.12, 1.18]} radius={0.28} smoothness={4} material={SHELL} position={[0, 0, 0]} />
        <RoundedBox args={[3.04, 1.9, 0.16]} radius={0.2} smoothness={3} material={DARK} position={[0, 0.02, 0.62]} />
        {/* curved-glass illusion: layered rounded bezel and smaller luminous glass */}
        <RoundedBox args={[2.48, 1.34, 0.12]} radius={0.2} smoothness={6} material={BEZEL} position={[-0.12, 0.1, 0.72]} />
        <RoundedBox args={[2.27, 1.14, 0.055]} radius={0.16} smoothness={8} material={screen.current} position={[-0.12, 0.1, 0.81]} />
        {/* screen glass reflection and restrained scanline grooves */}
        <mesh position={[-0.12, 0.1, 0.845]} material={new THREE.MeshBasicMaterial({ color: "#d5ead4", transparent: true, opacity: 0.08 })}>
          <planeGeometry args={[2.05, 0.025]} />
        </mesh>
        <group position={[1.22, 0.16, 0.75]}>
          <RoundedBox args={[0.34, 0.92, 0.08]} radius={0.05} smoothness={2} material={BEZEL} />
          <RoundedBox args={[0.22, 0.23, 0.035]} radius={0.03} smoothness={2} material={GREEN} position={[0, 0.27, 0.05]} />
          <RoundedBox args={[0.18, 0.07, 0.035]} radius={0.015} smoothness={2} material={EDGE} position={[0, -0.02, 0.05]} />
          <RoundedBox args={[0.18, 0.07, 0.035]} radius={0.015} smoothness={2} material={EDGE} position={[0, -0.15, 0.05]} />
        </group>
        {/* tactile control bank */}
        <group position={[0, -0.78, 0.78]}>
          <Knob position={[-0.92, 0, 0]} active={status !== "idle"} />
          <Knob position={[-0.48, 0, 0]} scale={0.78} />
          <Button position={[0.3, 0, 0]} active={capture} />
          <Button position={[0.62, 0, 0]} />
          <Button position={[0.94, 0, 0]} />
        </group>
        {/* signature Voyagerscape component: an observatory fin / antenna loop */}
        <group position={[-1.06, 1.12, 0.08]} rotation={[0, 0, -0.18]}>
          <mesh material={ORANGE}>
            <torusGeometry args={[0.34, 0.045, 8, 24, Math.PI * 1.35]} />
          </mesh>
          <mesh position={[0.22, -0.21, 0]} material={DARK}>
            <boxGeometry args={[0.15, 0.28, 0.16]} />
          </mesh>
        </group>
        {/* side seams and cooling vents */}
        {[-0.38, -0.2, -0.02, 0.16, 0.34].map((x) => <mesh key={x} position={[1.63, x, 0.05]} rotation={[0, 0.2, 0]} material={DARK}><boxGeometry args={[0.03, 0.09, 0.52]} /></mesh>)}
        <mesh position={[-1.46, -0.42, -0.63]} material={DARK}><boxGeometry args={[0.62, 0.08, 0.08]} /></mesh>
      </group>
    </>
  );
}
