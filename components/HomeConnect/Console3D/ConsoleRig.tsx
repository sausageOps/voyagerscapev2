"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { PointerField } from "../Camera3D/motion/usePointerField";
import { CONSOLE_MODES, MODE_COPY, type ConsoleMode } from "./types";

interface ConsoleRigProps {
  mode: ConsoleMode;
  turns: number;
  slider: number;
  armed: boolean;
  encoder: number;
  pointer: MutableRefObject<PointerField>;
  onMode: (mode: ConsoleMode) => void;
  onWheel: () => void;
  onSlider: () => void;
  onArm: () => void;
  onEncoder: () => void;
}

const SHELL = "#d9cebd";
const SHELL_LIGHT = "#eee6d8";
const BED = "#aaa092";
const BED_DARK = "#756d65";
const RUBBER = "#17181c";
const METAL = "#9a9184";
const METAL_BRIGHT = "#d1c7b7";
const INK = "#15161a";

const PAD_POSITIONS: [number, number, number][] = [
  [-0.34, 0.66, -0.28],
  [0, 0.66, -0.28],
  [0.34, 0.66, -0.28],
  [-0.34, 0.66, 0.04],
  [0, 0.66, 0.04],
  [0.34, 0.66, 0.04],
];

/** A small self-contained texture means the screen has crisp actual state copy
 * without loading a font, bitmap, or remote asset. */
function useScreenTexture(mode: ConsoleMode, turns: number, slider: number, armed: boolean) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");
    const copy = MODE_COPY[mode];

    if (ctx) {
      ctx.fillStyle = "#11191a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(213, 235, 224, 0.12)";
      ctx.lineWidth = 2;
      for (let x = 36; x < canvas.width; x += 78) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, 354);
        ctx.stroke();
      }
      for (let y = 40; y < canvas.height; y += 54) {
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(996, y);
        ctx.stroke();
      }

      ctx.fillStyle = copy.color;
      ctx.fillRect(40, 44, 12, 12);
      ctx.font = "500 26px monospace";
      ctx.letterSpacing = "2px";
      ctx.fillText(copy.channel, 74, 57);

      ctx.font = "600 82px monospace";
      ctx.fillStyle = "#f7f1e8";
      ctx.fillText(mode, 40, 168);

      ctx.font = "500 22px monospace";
      ctx.fillStyle = "#aeb7ae";
      ctx.fillText(copy.note, 42, 208);

      ctx.fillStyle = "#64706c";
      ctx.fillRect(42, 268, 720, 4);
      ctx.fillStyle = copy.color;
      ctx.fillRect(42, 268, 720 * (0.22 + slider * 0.72), 4);

      ctx.font = "500 19px monospace";
      ctx.fillStyle = "#aeb7ae";
      ctx.fillText(`WHEEL ${String((turns % 36) + 1).padStart(2, "0")}`, 42, 320);
      ctx.fillText(armed ? "LATCH ON" : "LATCH READY", 550, 320);

      for (let i = 0; i < 7; i += 1) {
        const h = 12 + ((turns * 17 + i * 31) % 42);
        ctx.fillStyle = i < 3 + Math.round(slider * 3) ? copy.color : "#40504c";
        ctx.fillRect(810 + i * 23, 323 - h, 12, h);
      }
    }

    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    next.needsUpdate = true;
    return next;
  }, [armed, mode, slider, turns]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function ContactShadow() {
  return (
    <mesh position={[0, -0.35, 0.18]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.8, 1.15, 1]}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial color="#5c5044" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  );
}

function ModePad({ mode, index, active, onMode }: { mode: ConsoleMode; index: number; active: boolean; onMode: (mode: ConsoleMode) => void }) {
  const cap = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const [x, y, z] = PAD_POSITIONS[index];
  const color = MODE_COPY[mode].color;

  useFrame((_, delta) => {
    if (!cap.current) return;
    const targetY = (hover || active ? 0.026 : 0) + (active ? 0.012 : 0);
    cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, targetY, 18, delta);
    const targetScale = hover ? 1.08 : 1;
    cap.current.scale.x = THREE.MathUtils.damp(cap.current.scale.x, targetScale, 16, delta);
    cap.current.scale.z = THREE.MathUtils.damp(cap.current.scale.z, targetScale, 16, delta);
  });

  return (
    <group position={[x, y, z]}>
      <group
        ref={cap}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(event) => {
          event.stopPropagation();
          onMode(mode);
        }}
      >
        <RoundedBox args={[0.25, 0.09, 0.2]} radius={0.035} smoothness={3}>
          <meshStandardMaterial color={active ? color : "#4d4c4d"} roughness={0.44} metalness={0.1} emissive={active ? color : "#000000"} emissiveIntensity={active ? 0.13 : 0} />
        </RoundedBox>
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[0.11, 0.008, 0.028]} />
          <meshStandardMaterial color={active ? "#fff7ea" : "#948b7f"} roughness={0.32} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function ModeBank({ mode, onMode }: { mode: ConsoleMode; onMode: (mode: ConsoleMode) => void }) {
  return (
    <group position={[-1.18, 0, 0.46]}>
      <RoundedBox args={[1.27, 0.075, 0.93]} radius={0.08} smoothness={4} position={[0, 0.62, 0]}>
        <meshStandardMaterial color={BED_DARK} roughness={0.78} metalness={0.08} />
      </RoundedBox>
      {CONSOLE_MODES.map((item, index) => <ModePad key={item} mode={item} index={index} active={mode === item} onMode={onMode} />)}
    </group>
  );
}

function CentralWheel({ turns, mode, onWheel }: { turns: number; mode: ConsoleMode; onWheel: () => void }) {
  const wheel = useRef<THREE.Group>(null);
  const rotation = useRef(0);
  const seenTurns = useRef(turns);
  const pressStarted = useRef(-1);
  const [hover, setHover] = useState(false);
  const color = MODE_COPY[mode].color;

  useFrame((state, delta) => {
    const group = wheel.current;
    if (!group) return;
    if (seenTurns.current !== turns) {
      seenTurns.current = turns;
      pressStarted.current = state.clock.elapsedTime;
    }
    rotation.current = THREE.MathUtils.damp(rotation.current, turns * 0.48, 13, delta);
    group.rotation.z = rotation.current;
    const elapsed = Math.max(0, state.clock.elapsedTime - pressStarted.current);
    const press = elapsed < 0.32 ? Math.sin((elapsed / 0.32) * Math.PI) * 0.08 : 0;
    group.position.z = 1.33 - press + (hover ? 0.025 : 0);
    const scale = hover ? 1.025 : 1;
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, scale, 15, delta));
  });

  return (
    <group
      ref={wheel}
      position={[0, 0.43, 1.33]}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={(event) => {
        event.stopPropagation();
        onWheel();
      }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.18, 56]} />
        <meshStandardMaterial color={RUBBER} roughness={0.74} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <torusGeometry args={[0.62, 0.045, 8, 52]} />
        <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.78} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.49, 0.49, 0.06, 48]} />
        <meshStandardMaterial color="#303238" roughness={0.36} metalness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.16]}>
        <cylinderGeometry args={[0.345, 0.345, 0.075, 48]} />
        <meshStandardMaterial color="#847d70" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.19, 0.205]}>
        <boxGeometry args={[0.075, 0.21, 0.035]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.12} emissive={color} emissiveIntensity={0.16} />
      </mesh>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x = Math.cos(angle) * 0.735;
        const y = Math.sin(angle) * 0.735;
        return (
          <mesh key={index} position={[x, y, 0.125]} rotation={[0, 0, angle + Math.PI / 2]}>
            <boxGeometry args={[0.036, 0.13, 0.06]} />
            <meshStandardMaterial color={index % 4 === 0 ? METAL_BRIGHT : "#4b4c50"} roughness={0.42} metalness={0.42} />
          </mesh>
        );
      })}
    </group>
  );
}

function RangeSlider({ slider, onSlider }: { slider: number; onSlider: () => void }) {
  const knob = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useFrame((_, delta) => {
    if (!knob.current) return;
    knob.current.position.z = THREE.MathUtils.damp(knob.current.position.z, (slider - 0.5) * 0.77, 16, delta);
    knob.current.position.y = THREE.MathUtils.damp(knob.current.position.y, hover ? 0.075 : 0.045, 18, delta);
  });

  return (
    <group position={[1.58, 0.64, -0.13]}>
      <RoundedBox args={[0.48, 0.075, 1.26]} radius={0.07} smoothness={4}>
        <meshStandardMaterial color={BED_DARK} roughness={0.78} metalness={0.08} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.08, 0.018, 0.98]} />
        <meshStandardMaterial color="#25262a" roughness={0.55} metalness={0.52} />
      </mesh>
      <group
        ref={knob}
        position={[0, 0.045, (slider - 0.5) * 0.77]}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(event) => {
          event.stopPropagation();
          onSlider();
        }}
      >
        <RoundedBox args={[0.33, 0.11, 0.19]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#d6cab8" roughness={0.35} metalness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.16, 0.01, 0.02]} />
          <meshStandardMaterial color="#343338" roughness={0.32} metalness={0.56} />
        </mesh>
      </group>
    </group>
  );
}

function SignalLatch({ armed, onArm }: { armed: boolean; onArm: () => void }) {
  const lever = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useFrame((_, delta) => {
    if (!lever.current) return;
    lever.current.rotation.z = THREE.MathUtils.damp(lever.current.rotation.z, armed ? -0.62 : 0.4, 16, delta);
    lever.current.position.y = THREE.MathUtils.damp(lever.current.position.y, hover ? 0.032 : 0, 16, delta);
  });

  return (
    <group position={[-1.48, 0.69, 0.82]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
        <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.7} />
      </mesh>
      <group
        ref={lever}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(event) => {
          event.stopPropagation();
          onArm();
        }}
      >
        <RoundedBox args={[0.11, 0.08, 0.43]} radius={0.035} smoothness={3} position={[0, 0.11, 0.12]}>
          <meshStandardMaterial color={armed ? "#f1b8e4" : "#34353a"} roughness={0.34} metalness={0.44} />
        </RoundedBox>
      </group>
    </group>
  );
}

function FineEncoder({ encoder, onEncoder }: { encoder: number; onEncoder: () => void }) {
  const dial = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useFrame((_, delta) => {
    if (!dial.current) return;
    dial.current.rotation.y = THREE.MathUtils.damp(dial.current.rotation.y, encoder * 0.56, 14, delta);
    dial.current.position.y = THREE.MathUtils.damp(dial.current.position.y, hover ? 0.035 : 0, 16, delta);
  });

  return (
    <group position={[1.52, 0.7, 0.82]}>
      <group
        ref={dial}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(event) => {
          event.stopPropagation();
          onEncoder();
        }}
      >
        <mesh>
          <cylinderGeometry args={[0.28, 0.31, 0.16, 36]} />
          <meshStandardMaterial color="#292a2f" roughness={0.46} metalness={0.54} />
        </mesh>
        <mesh position={[0, 0.087, 0]}>
          <cylinderGeometry args={[0.215, 0.215, 0.025, 36]} />
          <meshStandardMaterial color="#777169" roughness={0.28} metalness={0.76} />
        </mesh>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index / 10) * Math.PI * 2;
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.18, 0.105, Math.sin(angle) * 0.18]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[0.022, 0.012, 0.06]} />
              <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.68} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Display({ mode, turns, slider, armed }: { mode: ConsoleMode; turns: number; slider: number; armed: boolean }) {
  const texture = useScreenTexture(mode, turns, slider, armed);
  const color = MODE_COPY[mode].color;

  return (
    <group position={[0.07, 0.65, -0.56]}>
      <RoundedBox args={[2.48, 0.11, 1.14]} radius={0.1} smoothness={5}>
        <meshStandardMaterial color="#3c3c3d" roughness={0.32} metalness={0.73} />
      </RoundedBox>
      <RoundedBox args={[2.29, 0.045, 0.95]} radius={0.055} smoothness={4} position={[0, 0.07, 0]}>
        <meshStandardMaterial color="#0b0f11" roughness={0.23} metalness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.097, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.12, 0.78]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[1.03, 0.11, -0.37]}>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.28} />
      </mesh>
      <mesh position={[1.18, 0.11, -0.37]}>
        <sphereGeometry args={[0.04, 18, 18]} />
        <meshStandardMaterial color="#7c786f" emissive="#7c786f" emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ShellDetails() {
  return (
    <>
      {/* rear hinges: the one intentionally legible mechanical seam */}
      {[-1.52, 1.52].map((x) => (
        <group key={x} position={[x, 0.59, -1.18]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.42, 24]} />
            <meshStandardMaterial color="#625c54" roughness={0.35} metalness={0.68} />
          </mesh>
          <mesh position={[0, 0.215, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.025, 24]} />
            <meshStandardMaterial color={METAL_BRIGHT} roughness={0.27} metalness={0.78} />
          </mesh>
        </group>
      ))}

      {/* recessed ports, deliberately quiet on the left flank */}
      {[0.3, 0.66].map((z) => (
        <group key={z} position={[-2.38, 0.01, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.11, 0.11, 0.03, 24]} />
            <meshStandardMaterial color="#4f4b47" roughness={0.34} metalness={0.62} />
          </mesh>
          <mesh position={[0, 0.021, 0]}>
            <cylinderGeometry args={[0.064, 0.064, 0.035, 20]} />
            <meshStandardMaterial color="#111216" roughness={0.74} metalness={0.08} />
          </mesh>
        </group>
      ))}

      {/* framing screws: only four, so the object stays calm */}
      {[[-2.06, 1.02], [2.06, 1.02], [-2.06, -1.04], [2.06, -1.04]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.59, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.022, 18]} />
          <meshStandardMaterial color="#6d665d" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
    </>
  );
}

export default function ConsoleRig({
  mode,
  turns,
  slider,
  armed,
  encoder,
  pointer,
  onMode,
  onWheel,
  onSlider,
  onArm,
  onEncoder,
}: ConsoleRigProps) {
  const consoleRef = useRef<THREE.Group>(null);

  /* The body follows the existing shared pointer field. It only responds while
     a fine pointer is live; touch gets the controls and no fake hover. */
  useFrame((state, delta) => {
    const group = consoleRef.current;
    if (!group) return;
    const field = pointer.current;
    const proximity = field.active ? field.proximity : 0;
    const idle = field.active ? 0 : Math.sin(state.clock.elapsedTime * 0.34) * 0.008;
    const targetYaw = -0.22 + field.x * 0.1 * proximity;
    const targetPitch = field.y * -0.055 * proximity;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetYaw, 4.8, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetPitch, 4.8, delta);
    group.position.x = THREE.MathUtils.damp(group.position.x, field.x * 0.045 * proximity, 4.8, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, idle + field.y * -0.02 * proximity, 4.8, delta);
  });

  return (
    <>
      <ContactShadow />
      <group ref={consoleRef} rotation={[0, -0.22, 0]}>
        {/* soft matte base, then a separate powder-coated upper shell */}
        <RoundedBox args={[4.78, 0.62, 2.62]} radius={0.22} smoothness={6} position={[0, 0, 0]}>
          <meshStandardMaterial color={SHELL} roughness={0.52} metalness={0.04} envMapIntensity={0.55} />
        </RoundedBox>
        <RoundedBox args={[4.48, 0.32, 2.38]} radius={0.19} smoothness={6} position={[0, 0.39, 0]}>
          <meshStandardMaterial color={SHELL_LIGHT} roughness={0.43} metalness={0.06} envMapIntensity={0.74} />
        </RoundedBox>
        <RoundedBox args={[4.18, 0.07, 2.08]} radius={0.14} smoothness={5} position={[0, 0.585, 0]}>
          <meshStandardMaterial color={BED} roughness={0.6} metalness={0.11} envMapIntensity={0.38} />
        </RoundedBox>

        <Display mode={mode} turns={turns} slider={slider} armed={armed} />
        <ModeBank mode={mode} onMode={onMode} />
        <RangeSlider slider={slider} onSlider={onSlider} />
        <SignalLatch armed={armed} onArm={onArm} />
        <FineEncoder encoder={encoder} onEncoder={onEncoder} />
        <CentralWheel turns={turns} mode={mode} onWheel={onWheel} />
        <ShellDetails />
      </group>
    </>
  );
}
