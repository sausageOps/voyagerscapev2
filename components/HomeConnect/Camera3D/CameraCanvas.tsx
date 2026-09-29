"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { STAGING, OBJECT_HULL, MOTION } from "./proportions";
import type { TallyState } from "./materials/palette";
import type { PointerField } from "./motion/usePointerField";
import type { ShutterSignal } from "./motion/shutterSignal";
import CameraRig from "./scene/CameraRig";

/**
 * Points to fit: the hull corners, swept across the object's range of motion.
 *
 * Two fixes over Stage 1, both of which only show up in motion:
 *
 * 1. A hull of four boxes instead of one. See OBJECT_HULL — the single box
 *    reserved a large empty corner and cost ~15% of the object's size.
 *
 * 2. The sweep. Fitting only the resting pose is wrong the moment the object
 *    can turn: at full yaw the silhouette is ~3% wider than at rest, so a
 *    frame packed to 94% clips a body corner exactly when the cursor reaches
 *    the edge of the screen. That is a bug no static screenshot can catch, so
 *    the extremes of yaw and pitch are fitted alongside the rest pose and the
 *    union is what the solver packs. Each part is swept at its own parallax
 *    factor rather than all of them at the largest one.
 */
const CORNERS: THREE.Vector3[] = (() => {
  // Idle float translates the object; fold it into the box rather than the
  // rotation sweep. Recoil push is along Z and does not change the silhouette.
  // Everything that translates the object is folded into the box as slack;
  // everything that rotates it is swept. Cursor translation is included so
  // the object does not clip when the cursor reaches a corner of the screen.
  const slackY = MOTION.idle.floatY * 1.2 + MOTION.translate.y;
  const slackX = MOTION.translate.x;
  const pts: THREE.Vector3[] = [];

  for (const box of OBJECT_HULL) {
    const yawSweep = MOTION.maxYaw * box.p + MOTION.idle.driftYaw * 1.15;
    const pitchSweep = MOTION.maxPitch * box.p + MOTION.idle.driftPitch * 1.15;
    const rollSweep = MOTION.maxRoll * box.p + MOTION.idle.driftRoll * 1.15;

    for (const dy of [-yawSweep, 0, yawSweep]) {
      for (const dp of [-pitchSweep, 0, pitchSweep]) {
        for (const dr of [-rollSweep, 0, rollSweep]) {
          const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(dp, STAGING.yaw + dy, STAGING.roll + dr),
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
  pointer: MutableRefObject<PointerField>;
  shutter: MutableRefObject<ShutterSignal>;
}

export default function CameraCanvas({
  status,
  onContextLost,
  container,
  reducedMotion,
  pointer,
  shutter,
}: CanvasProps) {
  const visible = useVisibility(container);

  /* Coarse pointers are the phones/tablets: hold the pixel ratio down. */
  const [maxDpr, setMaxDpr] = useState(1.75);

  /* Amplitude of the continuous idle motion, by device class. There is no
     cursor on a touch device, so the float is the ONLY motion there and a
     desktop amplitude reads as drifting rather than suspended — and on a
     small screen the same world-space travel is a larger share of the
     object. Cursor-driven rotation is not scaled by this. */
  const [motionScale, setMotionScale] = useState(1);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const tablet = window.matchMedia("(max-width: 1023px)").matches;
    setMaxDpr(coarse || small ? 1.5 : 1.75);
    setMotionScale(small ? 0.4 : coarse || tablet ? 0.65 : 1);
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
      <CameraRig
        status={status}
        idle={!reducedMotion}
        pointer={pointer}
        shutter={shutter}
        motionScale={motionScale}
      />
    </Canvas>
  );
}
