"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import type { PointerField } from "../Camera3D/motion/usePointerField";
import MachineRig, { type MachineActionSignal, type MachineStatus } from "./scene/MachineRig";

function CameraAim() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    camera.position.set(0, 0.4, 8.65);
    camera.lookAt(0, 0.05, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

/** Stop the draw loop when the hero leaves the viewport or tab. */
function useVisibility(element: HTMLElement | null) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!element) return;
    let inView = true;
    let tabVisible = !document.hidden;
    const sync = () => setVisible(inView && tabVisible);

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [element]);

  return visible;
}

interface CreativeMachineCanvasProps {
  status: MachineStatus;
  level: number;
  onContextLost: () => void;
  container: HTMLElement | null;
  reducedMotion: boolean;
  pointer: MutableRefObject<PointerField>;
  controlHover: MutableRefObject<boolean>;
  action: MutableRefObject<MachineActionSignal>;
}

export default function CreativeMachineCanvas({
  status,
  level,
  onContextLost,
  container,
  reducedMotion,
  pointer,
  controlHover,
  action,
}: CreativeMachineCanvasProps) {
  const visible = useVisibility(container);
  const [maxDpr, setMaxDpr] = useState(1.75);
  const [mobileIdle, setMobileIdle] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const small = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setMaxDpr(coarse.matches || small.matches ? 1.5 : 1.75);
      setMobileIdle(coarse.matches && window.matchMedia("(hover: none)").matches);
    };
    sync();
    coarse.addEventListener("change", sync);
    small.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      small.removeEventListener("change", sync);
    };
  }, []);

  return (
    <Canvas
      flat
      dpr={[1, maxDpr]}
      frameloop={visible ? "always" : "never"}
      shadows={false}
      gl={{
        alpha: true,
        antialias: true,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      camera={{ fov: 31, near: 0.1, far: 40, position: [0, 0.4, 8.65] }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 120 } }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            onContextLost();
          },
          { once: true },
        );
      }}
    >
      <CameraAim />
      <MachineRig
        status={status}
        level={level}
        pointer={pointer}
        controlHover={controlHover}
        action={action}
        animate={!reducedMotion}
        mobileIdle={!reducedMotion && mobileIdle}
      />
    </Canvas>
  );
}
