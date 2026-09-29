"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { STAGING, OBJECT_BOUNDS } from "./proportions";
import type { TallyState } from "./materials/palette";
import CameraRig from "./scene/CameraRig";

/**
 * The eight corners of the object's bounding box, pre-rotated by the staging
 * orientation. Computed once at module scope.
 */
const CORNERS: THREE.Vector3[] = (() => {
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, STAGING.yaw, STAGING.roll),
  );
  const [minX, minY, minZ] = OBJECT_BOUNDS.min;
  const [maxX, maxY, maxZ] = OBJECT_BOUNDS.max;
  const pts: THREE.Vector3[] = [];
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [minZ, maxZ]) {
        pts.push(new THREE.Vector3(x, y, z).applyQuaternion(q));
      }
    }
  }
  return pts;
})();

/**
 * FIT-TO-FRAME
 * ============
 *
 * The container is locked to the SVG hero's 340:300 aspect at every
 * breakpoint, so the object must occupy a constant fraction of the frame
 * whether the box is 452px or 256px wide. Relying on CSS alone would re-crop
 * the composition as the box shrinks.
 *
 * Solving width/height against the object's extents is NOT enough here: the
 * lens protrudes more than half the body depth toward the camera, so it
 * magnifies and blows out of frame. Instead we project the eight corners of
 * the rotated bounding box and iterate the distance until the widest corner
 * lands on the target fill. Converges in three or four passes and is immune to
 * any later change in the geometry.
 *
 * The camera also sits above the object and looks down ~11°, which is what
 * opens up the top deck and turns the ground plane into a foreshortened
 * contact shadow.
 */
function FitCamera() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!size.width || !size.height) return;

    cam.aspect = size.width / size.height;

    const place = (d: number) => {
      cam.position.set(0, d * STAGING.lookDown, d);
      cam.lookAt(0, STAGING.targetY, 0);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    };

    const v = new THREE.Vector3();
    let d = 7;

    for (let i = 0; i < 12; i += 1) {
      place(d);
      let worst = 0;
      for (const p of CORNERS) {
        v.copy(p).project(cam);
        worst = Math.max(worst, Math.abs(v.x), Math.abs(v.y));
      }
      const over = worst / STAGING.fill;
      if (Math.abs(over - 1) < 0.003) break;
      // Damped so a corner crossing behind the near plane cannot oscillate.
      d *= 1 + (over - 1) * 0.85;
      d = Math.min(Math.max(d, 3), 40);
    }

    place(d);
  }, [camera, size]);

  return null;
}

/** Pauses rendering whenever the hero is not on screen or the tab is hidden. */
function useVisibility(el: HTMLElement | null) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!el) return;
    let onScreen = true;
    let tabVisible = !document.hidden;
    const sync = () => setVisible(onScreen && tabVisible);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    io.observe(el);

    const onVis = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [el]);

  return visible;
}

interface CanvasProps {
  status: TallyState;
  /** Raised when the GL context is lost so the host can fall back to the SVG. */
  onContextLost: () => void;
  container: HTMLElement | null;
  reducedMotion: boolean;
}

export default function CameraCanvas({
  status,
  onContextLost,
  container,
  reducedMotion,
}: CanvasProps) {
  const visible = useVisibility(container);

  /* Coarse pointers are the phones/tablets: hold the pixel ratio down. */
  const [maxDpr, setMaxDpr] = useState(1.75);
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    setMaxDpr(coarse || small ? 1.5 : 1.75);
  }, []);

  return (
    <Canvas
      /* NoToneMapping. ACESFilmic (the R3F default) visibly desaturates the
         pale pink and pale yellow and drags the cream toward grey — the whole
         palette goes off-brand. `flat` renders the authored sRGB values. */
      flat
      dpr={[1, maxDpr]}
      frameloop={visible ? "always" : "never"}
      shadows={false}
      gl={{
        alpha: true, // the page cream must show through
        antialias: true,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      camera={{ fov: STAGING.fov, near: 0.1, far: 60, position: [0, 0.8, 7] }}
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
      <FitCamera />
      <CameraRig status={status} idle={!reducedMotion} />
    </Canvas>
  );
}
