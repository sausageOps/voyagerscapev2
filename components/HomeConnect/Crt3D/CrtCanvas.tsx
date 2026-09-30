"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { MOTION, OBJECT_HULL, STAGING } from "./proportions";
import type { PointerField } from "@/components/HomeConnect/Camera3D/motion/usePointerField";
import CrtRig from "./scene/CrtRig";

/** Hull corners swept across the rotation range, so the fit never clips mid-gesture. */
const CORNERS: THREE.Vector3[] = (() => {
  const pts: THREE.Vector3[] = [];
  const yawSweep = MOTION.maxYaw + MOTION.idle.driftYaw;
  const pitchSweep = MOTION.maxPitch + MOTION.idle.driftPitch;
  const slackX = MOTION.translate.x;
  const slackY = MOTION.idle.floatY + MOTION.translate.y;

  for (const box of OBJECT_HULL) {
    for (const dy of [-yawSweep, 0, yawSweep]) {
      for (const dp of [-pitchSweep, 0, pitchSweep]) {
        const q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(STAGING.pitch + dp, STAGING.yaw + dy, 0),
        );
        for (const x of [box.min[0] - slackX, box.max[0] + slackX]) {
          for (const y of [box.min[1] - slackY, box.max[1] + slackY]) {
            for (const z of [box.min[2], box.max[2]]) {
              pts.push(new THREE.Vector3(x, y, z).applyQuaternion(q));
            }
          }
        }
      }
    }
  }
  return pts;
})();

/**
 * FIT-TO-FRAME — projects the swept hull corners and iterates camera distance
 * until the widest corner lands on the target fill, so the machine occupies a
 * constant, dominant fraction of the frame at every breakpoint.
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
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
    };

    let d = 11;
    for (let pass = 0; pass < 6; pass++) {
      place(d);
      let maxNdc = 0;
      const v = new THREE.Vector3();
      for (const c of CORNERS) {
        v.copy(c).project(cam);
        maxNdc = Math.max(maxNdc, Math.abs(v.x), Math.abs(v.y));
      }
      if (maxNdc < 0.001) break;
      d *= maxNdc / STAGING.fill;
      d = THREE.MathUtils.clamp(d, 4, 40);
    }
    place(d);
  }, [camera, size]);

  return null;
}

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
  stateIndex: number;
  clickSeq: MutableRefObject<number>;
  onContextLost: () => void;
  container: HTMLElement | null;
  reducedMotion: boolean;
  pointer: MutableRefObject<PointerField>;
  mobileInteracting: MutableRefObject<boolean>;
}

export default function CrtCanvas({
  stateIndex,
  clickSeq,
  onContextLost,
  container,
  reducedMotion,
  pointer,
  mobileInteracting,
}: CanvasProps) {
  const visible = useVisibility(container);

  const [maxDpr, setMaxDpr] = useState(1.75);
  const [touchIdle, setTouchIdle] = useState(false);
  const [motionScale, setMotionScale] = useState(1);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const tablet = window.matchMedia("(max-width: 1023px)").matches;
    setMaxDpr(coarse || small ? 1.5 : 1.75);
    setMotionScale(small ? 0.45 : coarse || tablet ? 0.7 : 1);
  }, []);

  useEffect(() => {
    const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)");
    const sync = () => setTouchIdle(touchOnly.matches);
    sync();
    touchOnly.addEventListener("change", sync);
    return () => touchOnly.removeEventListener("change", sync);
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
      camera={{ fov: STAGING.fov, near: 0.1, far: 80, position: [0, 1.4, 11] }}
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
      <CrtRig
        stateIndex={stateIndex}
        clickSeq={clickSeq}
        idle={!reducedMotion}
        pointer={pointer}
        motionScale={motionScale}
        mobileIdle={touchIdle && !reducedMotion}
        mobileInteracting={mobileInteracting}
      />
    </Canvas>
  );
}
