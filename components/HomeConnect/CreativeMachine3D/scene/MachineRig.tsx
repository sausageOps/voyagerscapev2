"use client";

import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { PointerField } from "../../Camera3D/motion/usePointerField";
import { useMachineMaterials } from "../materials/MachineMaterials";
import MachineAssembly from "./MachineAssembly";

export type MachineStatus = "idle" | "rec" | "wait" | "play" | "err";

export interface MachineActionSignal {
  seq: number;
}

interface MachineRigProps {
  status: MachineStatus;
  level: number;
  pointer: MutableRefObject<PointerField>;
  controlHover: MutableRefObject<boolean>;
  action: MutableRefObject<MachineActionSignal>;
  animate: boolean;
  mobileIdle: boolean;
}

const STATUS_COLORS: Record<MachineStatus, string> = {
  idle: "#c7bca9",
  rec: "#f078a7",
  wait: "#ebbd56",
  play: "#68c8ae",
  err: "#df625b",
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const damp = (current: number, target: number, rate: number, dt: number) =>
  target + (current - target) * Math.exp(-rate * dt);

/**
 * The machine gets one render-loop owner for all motion. The old hero's
 * camera model is not reused: this rig owns a new, slower set of motions for
 * the chassis, control dial, sensor mast and display meters.
 */
export default function MachineRig({
  status,
  level,
  pointer,
  controlHover,
  action,
  animate,
  mobileIdle,
}: MachineRigProps) {
  const objectRef = useRef<THREE.Group>(null);
  const dialRef = useRef<THREE.Group | null>(null);
  const armRef = useRef<THREE.Group | null>(null);
  const meterRefs = useRef<Array<THREE.Group | null>>([]);
  const pulseLightRef = useRef<THREE.PointLight>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const materials = useMachineMaterials();

  const motion = useMemo(
    () => ({
      yaw: 0,
      pitch: 0,
      x: 0,
      y: 0,
      dialSpin: 0,
      lastAction: -1,
      pulse: -1,
    }),
    [],
  );

  useFrame((state, rawDelta) => {
    const object = objectRef.current;
    if (!object) return;

    const dt = Math.min(rawDelta, 0.05);
    const time = state.clock.elapsedTime;
    const signal = action.current;
    if (motion.lastAction === -1) {
      motion.lastAction = signal.seq;
    } else if (motion.lastAction !== signal.seq) {
      motion.lastAction = signal.seq;
      motion.pulse = 0;
      motion.dialSpin += Math.PI * 0.86;
    }
    if (motion.pulse >= 0) {
      motion.pulse += dt;
      if (motion.pulse > 0.82) motion.pulse = -1;
    }

    const pulse = motion.pulse < 0 ? 0 : Math.exp(-motion.pulse * 4.8);
    const clickTravel =
      motion.pulse >= 0 && motion.pulse < 0.33
        ? Math.sin((motion.pulse / 0.33) * Math.PI) * 0.105
        : 0;
    const statusColor = STATUS_COLORS[status];

    materials.signal.color.set(statusColor);
    materials.signal.emissive.set(statusColor);
    materials.signal.emissiveIntensity = status === "idle" ? 0.24 + pulse * 0.8 : 0.72 + pulse * 1.6;
    materials.screen.emissive.set(statusColor);
    materials.screen.emissiveIntensity = 0.28 + pulse * 0.72 + (status === "rec" || status === "play" ? 0.24 : 0);
    materials.scan.emissiveIntensity = 0.5 + pulse * 1.2;

    if (!animate) {
      object.position.set(0, 0, 0);
      object.rotation.set(-0.035, -0.37, 0.012);
      if (dialRef.current) {
        dialRef.current.position.z = 0.69;
        dialRef.current.rotation.z = 0;
      }
      if (armRef.current) armRef.current.rotation.z = 0;
      meterRefs.current.forEach((meter) => {
        if (meter) meter.scale.y = 0.62;
      });
      if (pulseLightRef.current) pulseLightRef.current.intensity = 0;
      return;
    }

    const field = pointer.current;
    const touchDrift = mobileIdle && !field.active ? Math.sin(time * 0.18) * 0.026 : 0;
    motion.yaw = damp(motion.yaw, field.active ? field.x * 0.16 : touchDrift, 5.2, dt);
    motion.pitch = damp(motion.pitch, field.active ? -field.y * 0.1 : 0, 5.2, dt);
    motion.x = damp(motion.x, field.active ? field.x * 0.045 : 0, 4.8, dt);
    motion.y = damp(motion.y, field.active ? -field.y * 0.028 : 0, 4.8, dt);

    const idleLift = Math.sin(time * 0.42) * 0.026 + Math.sin(time * 0.17 + 1.5) * 0.011;
    object.position.set(motion.x, idleLift + motion.y, pulse * 0.016);
    object.rotation.set(
      -0.035 + motion.pitch + Math.sin(time * 0.24 + 0.6) * 0.009,
      -0.37 + motion.yaw + Math.sin(time * 0.29) * 0.012,
      0.012 - motion.yaw * 0.18,
    );

    motion.dialSpin = damp(motion.dialSpin, controlHover.current ? 0.09 : 0, 6.2, dt);
    if (dialRef.current) {
      dialRef.current.rotation.z = motion.dialSpin;
      dialRef.current.position.z = 0.69 + (controlHover.current ? 0.028 : 0) - clickTravel;
    }
    if (armRef.current) {
      armRef.current.rotation.z = damp(
        armRef.current.rotation.z,
        controlHover.current ? -0.035 - pulse * 0.14 : -pulse * 0.11,
        7.5,
        dt,
      );
    }

    const activeLevel = status === "rec" || status === "play" ? clamp(level, 0.08, 1) : 0.17 + pulse * 0.8;
    meterRefs.current.forEach((meter, index) => {
      if (!meter) return;
      const wobble = Math.sin(time * (2.8 + index * 0.6) + index * 1.8) * 0.11;
      meter.scale.y = clamp(0.45 + activeLevel * (0.75 + index * 0.1) + wobble * activeLevel, 0.4, 1.42);
    });

    if (shadowRef.current) {
      const scale = 1 - idleLift * 1.4 + pulse * 0.025;
      shadowRef.current.scale.set(scale, scale * 0.44, 1);
      shadowRef.current.position.x = -motion.x * 1.8;
    }
    if (pulseLightRef.current) pulseLightRef.current.intensity = pulse * 2.3;
  });

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[-3.6, 5.1, 6]} intensity={3.1} color="#fffaf1" />
      <directionalLight position={[4.2, 1.2, 4]} intensity={1.15} color="#f1b8e4" />
      <pointLight position={[-2.3, -1.1, 3.5]} intensity={0.75} color="#f3e5b5" />
      <pointLight ref={pulseLightRef} position={[0.05, 0.12, 3.2]} distance={5} color="#d8ccff" />

      <mesh ref={shadowRef} position={[0, -1.43, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.shadow}>
        <circleGeometry args={[1.62, 40]} />
      </mesh>

      <group ref={objectRef} rotation={[-0.035, -0.37, 0.012]}>
        <MachineAssembly materials={materials} dialRef={dialRef} armRef={armRef} meterRefs={meterRefs} />
      </group>
    </>
  );
}
