"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import ConsoleRig from "./ConsoleRig";
import type { ConsoleMode } from "./types";
import { usePointerField, type PointerField } from "../Camera3D/motion/usePointerField";

interface ConsoleCanvasProps {
  container: HTMLElement | null;
  mode: ConsoleMode;
  turns: number;
  slider: number;
  armed: boolean;
  encoder: number;
  onContextLost: () => void;
  onMode: (mode: ConsoleMode) => void;
  onWheel: () => void;
  onSlider: () => void;
  onArm: () => void;
  onEncoder: () => void;
}

/** Stop the renderer when the hero is offscreen or the document is hidden. */
function useVisibility(el: HTMLElement | null) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!el) return;
    let onScreen = true;
    let documentVisible = !document.hidden;
    const sync = () => setVisible(onScreen && documentVisible);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);

    const onVisibilityChange = () => {
      documentVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [el]);

  return visible;
}

function CameraSetup() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    camera.position.set(0, 3.55, 6.9);
    camera.lookAt(0, 0.32, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function StudioLighting() {
  return (
    <>
      <hemisphereLight args={["#fffaf2", "#b9aa96", 0.7]} />
      <ambientLight color="#fffaf3" intensity={0.28} />
      <directionalLight color="#fffdf8" intensity={2.1} position={[-4.5, 6.8, 5]} />
      <directionalLight color="#f1b8e4" intensity={0.58} position={[5, 2.5, 4]} />
      <directionalLight color="#f3e5b5" intensity={0.8} position={[2.5, 4, -5]} />
      <pointLight color="#fffaf3" intensity={0.32} position={[-2, -1, 3]} distance={8} />
    </>
  );
}

function Scene({
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
}: Omit<ConsoleCanvasProps, "container" | "onContextLost"> & { pointer: MutableRefObject<PointerField> }) {
  return (
    <>
      <CameraSetup />
      <StudioLighting />
      <ConsoleRig
        mode={mode}
        turns={turns}
        slider={slider}
        armed={armed}
        encoder={encoder}
        pointer={pointer}
        onMode={onMode}
        onWheel={onWheel}
        onSlider={onSlider}
        onArm={onArm}
        onEncoder={onEncoder}
      />
    </>
  );
}

export default function ConsoleCanvas({ container, onContextLost, ...props }: ConsoleCanvasProps) {
  const visible = useVisibility(container);
  const pointer = usePointerField(container, true);
  const [maxDpr, setMaxDpr] = useState(1.6);

  useEffect(() => {
    const sync = () => {
      const compact = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
      setMaxDpr(compact ? 1.35 : 1.6);
    };
    sync();
    window.addEventListener("resize", sync, { passive: true });
    return () => window.removeEventListener("resize", sync);
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
      camera={{ fov: 29, near: 0.1, far: 40, position: [0, 3.55, 6.9] }}
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
      <Scene {...props} pointer={pointer} />
    </Canvas>
  );
}
