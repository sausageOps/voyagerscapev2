"use client";

import { useEffect, useMemo, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import {
  COMPOSITIONS,
  GROUND_Y,
  MOTION,
  SHADOW,
  STAGING,
  standY,
  type LayoutName,
  type UnitSpec,
} from "./proportions";
import { hullPoints } from "./geometry/monitor";
import type { TallyState } from "./materials/palette";
import type { PointerField } from "./motion/usePointerField";
import type { ChannelSignal } from "./motion/channelSignal";
import CrtRig from "./scene/CrtRig";

/**
 * Points to fit: both machines' measured silhouette envelopes, placed at
 * their composition transforms and swept across their range of motion.
 *
 * Fitting only the resting pose is wrong the moment the objects can turn:
 * at full yaw a silhouette is measurably wider than at rest, so a frame
 * packed to 95% clips a corner of the casting exactly when the cursor
 * reaches the edge of the screen. That is a bug no static screenshot can
 * catch, so the extremes of yaw, pitch and roll are swept alongside the
 * rest pose and the union is what the solver packs.
 *
 * Everything that TRANSLATES a unit is folded in as slack; everything
 * that ROTATES it is swept. The envelope itself comes from
 * `hullPoints()` — measured from the built meshes, never declared. See
 * geometry/monitor.ts for why that distinction was worth the code.
 *
 * `framed` IS THE MOBILE COMPOSITION
 * ----------------------------------
 * On a narrow screen the two monitors side by side would each have to
 * shrink to about 40% of the frame width, and the result is two small
 * objects rather than one dominant one — precisely the failure mode the
 * brief warns about. So on mobile the secondary is dropped from the fit.
 * It is still fully rendered, still animating, still a real machine; it
 * simply runs off the left edge of the drawing surface, which is exactly
 * what a partially visible object behind the subject should do. The
 * primary then gets the frame to itself and stays dominant.
 */
function fitPoints(specs: UnitSpec[]): THREE.Vector3[] {
  const slackY = MOTION.idle.floatY * 1.3 + MOTION.translate.y;
  const slackX = MOTION.translate.x;

  const out: THREE.Vector3[] = [];
  const p = new THREE.Vector3();

  for (const spec of specs) {
    const yawSweep = (MOTION.maxYaw + MOTION.idle.driftYaw * 1.2) * spec.motion;
    const pitchSweep = (MOTION.maxPitch + MOTION.idle.driftPitch * 1.2) * spec.motion;
    const rollSweep = (MOTION.maxRoll + MOTION.idle.driftRoll * 1.2) * spec.motion;
    const baseY = standY(spec.scale);

    for (const dy of [-yawSweep, 0, yawSweep]) {
      for (const dp of [-pitchSweep, pitchSweep]) {
        for (const dr of [-rollSweep, rollSweep]) {
          const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(dp, spec.yaw + dy, spec.roll + dr),
          );
          for (const src of hullPoints()) {
            p.copy(src).multiplyScalar(spec.scale).applyQuaternion(q);
            out.push(
              new THREE.Vector3(
                spec.x + p.x + Math.sign(p.x) * slackX * spec.motion,
                baseY + p.y + Math.sign(p.y) * slackY * spec.motion,
                spec.z + p.z,
              ),
            );
          }
        }
      }
    }

    /* The contact shadow does not rotate with the object — it lies on the
       ground plane — but it does have to be inside the frame, so its
       inked extent is added once, unswept. */
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push(
          new THREE.Vector3(
            spec.x + sx * SHADOW.halfW * SHADOW.ink * spec.scale,
            GROUND_Y,
            spec.z + sz * SHADOW.halfD * SHADOW.ink * spec.scale,
          ),
        );
      }
    }
  }
  return out;
}

/**
 * FIT-TO-FRAME
 * ============
 *
 * Solves the camera so the monitor fills a constant fraction of its box at
 * every breakpoint, whether that box is 568px wide or 290px. CSS alone
 * would re-crop the composition as the box shrank.
 *
 * Solving width and height against the object's extents is not enough:
 * this object is 2.4 units deep and staged at an angle, so its front
 * casting sits much closer to the camera than its centroid and magnifies.
 * So the measured hull is projected and the camera distance iterated until
 * the widest point lands on the target fill.
 *
 * IT ALSO CENTRES, AND THAT IS THE HALF THAT IS USUALLY MISSED
 * -----------------------------------------------------------
 * A solver that only scales will faithfully fit an object that is sitting
 * off to one side. This one measures the projected centre of the hull and
 * walks the look-at target until it is zero, then re-fits — the two
 * interact, because moving the target changes the perspective that changed
 * the extents.
 *
 * It is worth the extra ten lines. Before centring, the monitor's
 * silhouette ran from −0.97 to +0.66 vertically: it was pinned to the
 * bottom of its box with 17% of the frame left empty above it, and the fit
 * was "correct" the whole time. The asymmetry comes from the base hanging
 * below a body whose mass is above it, and from looking down at 20° — it
 * is not something you can cancel with a hand-tuned target height, because
 * it changes with the aspect ratio of the box.
 *
 * The camera stays on the z axis and only its TARGET moves, which gives a
 * mildly off-axis frustum — the standard way to shift a composition
 * without changing the perspective that makes the object look the way it
 * does.
 */
function FitCamera({ framed }: { framed: UnitSpec[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!size.width || !size.height) return;

    const corners = fitPoints(framed);

    cam.aspect = size.width / size.height;

    let d = 9;
    let tx = 0;
    let ty = STAGING.targetY;

    const place = () => {
      cam.position.set(0, d * STAGING.lookDown + ty, d);
      cam.lookAt(tx, ty, 0);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
    };

    const v = new THREE.Vector3();

    for (let i = 0; i < 16; i += 1) {
      place();

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of corners) {
        v.copy(p).project(cam);
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }

      /* Recentre. One NDC unit is this many world units at the target
         plane; damped, because the target and the distance are solving
         against each other. */
      const worldPerNdcY = d * Math.tan((STAGING.fov * Math.PI) / 360);
      /* Sign: raising the camera pushes the object DOWN the frame, so a
         centre that is above zero needs the camera to rise. */
      ty += ((minY + maxY) / 2) * worldPerNdcY * 0.9;
      tx += ((minX + maxX) / 2) * worldPerNdcY * cam.aspect * 0.9;

      const half = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
      const over = half / STAGING.fill;
      if (Math.abs(over - 1) < 0.002 && Math.abs(minY + maxY) < 0.004) break;
      // Damped, so a point crossing behind the near plane cannot oscillate.
      d *= 1 + (over - 1) * 0.85;
      d = Math.min(Math.max(d, 4), 50);
    }

    place();
  }, [camera, size, framed]);

  return null;
}

/** Pauses rendering whenever the hero is off screen or the tab is hidden. */
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
  pressed: boolean;
  /** Raised when the GL context is lost so the host can fall back. */
  onContextLost: () => void;
  container: HTMLElement | null;
  reducedMotion: boolean;
  pointer: MutableRefObject<PointerField>;
  channel: MutableRefObject<ChannelSignal>;
  mobileInteracting: MutableRefObject<boolean>;
  onLabels?: (primary: string, secondary: string) => void;
}

export default function CrtCanvas({
  status,
  pressed,
  onContextLost,
  container,
  reducedMotion,
  pointer,
  channel,
  mobileInteracting,
  onLabels,
}: CanvasProps) {
  const visible = useVisibility(container);

  /* Coarse pointers are the phones/tablets: hold the pixel ratio down. */
  const [maxDpr, setMaxDpr] = useState(1.75);
  /* Narrow viewports restack the arrangement rather than shrinking it —
     see COMPOSITIONS in proportions.ts. */
  const [layout, setLayout] = useState<LayoutName>("wide");
  /* A touch-only primary pointer has no cursor path. Hybrid desktops keep
     their existing hover interaction even when they also have a screen. */
  const [touchIdle, setTouchIdle] = useState(false);
  const [motionScale, setMotionScale] = useState(1);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const tablet = window.matchMedia("(max-width: 1023px)").matches;
    setMaxDpr(coarse || small ? 1.5 : 1.75);
    setMotionScale(small ? 0.5 : coarse || tablet ? 0.7 : 1);
  }, []);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 899px)");
    const sync = () => setLayout(narrow.matches ? "narrow" : "wide");
    sync();
    narrow.addEventListener("change", sync);
    return () => narrow.removeEventListener("change", sync);
  }, []);

  const composition = COMPOSITIONS[layout];
  const framed = useMemo(
    () => [composition.primary, composition.secondary],
    [composition],
  );

  useEffect(() => {
    const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)");
    const sync = () => setTouchIdle(touchOnly.matches);
    sync();
    touchOnly.addEventListener("change", sync);
    return () => touchOnly.removeEventListener("change", sync);
  }, []);

  return (
    <Canvas
      /* NoToneMapping. ACESFilmic (the R3F default) visibly desaturates the
         pale pink and pale yellow and drags the cream toward grey — the
         whole palette goes off-brand. `flat` renders the authored sRGB
         values, and it matters twice as much here because the phosphor
         canvas is authored in sRGB too. */
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
      camera={{ fov: STAGING.fov, near: 0.1, far: 80, position: [0, 1.4, 9] }}
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
      <FitCamera framed={framed} />
      <CrtRig
        composition={composition}
        status={status}
        pressed={pressed}
        idle={!reducedMotion}
        pointer={pointer}
        channel={channel}
        motionScale={motionScale}
        mobileIdle={touchIdle && !reducedMotion}
        mobileInteracting={mobileInteracting}
        onLabels={onLabels}
      />
    </Canvas>
  );
}
