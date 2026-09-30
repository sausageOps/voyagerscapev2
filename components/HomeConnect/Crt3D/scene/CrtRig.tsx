"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CONTROLS, MOTION, SCREEN, STAGING } from "../proportions";
import { useCrtMaterials } from "../materials/materials";
import { TALLY_COLOR, type TallyState } from "../materials/palette";
import { Spring, clamp, damp } from "../motion/spring";
import type { PointerField } from "../motion/usePointerField";
import type { ChannelSignal } from "../motion/channelSignal";
import { ScreenSystem } from "../screen/ScreenSystem";
import { createCrtMaterial } from "../screen/crtMaterial";
import Housing from "./Housing";
import Screen from "./Screen";
import Controls from "./Controls";
import Base from "./Base";
import ContactShadow from "./ContactShadow";
import Lighting from "./Lighting";

/* Touch devices have no cursor, so they get a slow automatic sweep instead.
   Two degrees before device scaling: enough to reveal the object in depth,
   well below the desktop cursor range, slow enough not to read as a spin. */
const MOBILE_IDLE_YAW = (2 * Math.PI) / 180;
const MOBILE_IDLE_SPEED = 0.13;

interface RigProps {
  status: TallyState;
  /** True during the short window after a click. */
  pressed: boolean;
  /** Master motion switch. False = a completely static object. */
  idle: boolean;
  pointer: MutableRefObject<PointerField>;
  channel: MutableRefObject<ChannelSignal>;
  /** Amplitude of the continuous (non-cursor) motion, by device class. */
  motionScale: number;
  /** Touch-only devices get a restrained yaw drift in place of cursor hover. */
  mobileIdle: boolean;
  /** True only while a touch/pen is held on the object's button. */
  mobileInteracting: MutableRefObject<boolean>;
  /** Reports the current programme label to the DOM live region. */
  onLabel?: (label: string) => void;
}

/**
 * CRT RIG
 * =======
 *
 * The root of the scene, and the ONLY thing in the feature that writes to a
 * transform, a uniform or a material property at frame rate.
 *
 * MOTION ARCHITECTURE
 * -------------------
 * One `useFrame`. One set of springs. No GSAP below this line.
 *
 * That is not tidiness, it is the reason the channel-change knock works.
 * The obvious way to build it is `gsap.to(group.rotation, …)`, and it looks
 * fine until you click while moving the mouse: the tween and the cursor
 * tracking then both own `rotation.x`, and whichever writes last that frame
 * wins. The fix is not to sequence them more carefully — it is to make the
 * knock an IMPULSE, a one-off addition to the spring's velocity. After that
 * the knock and the cursor are the same motion, resolved by the same
 * integrator, and clicking mid-gesture produces the kick superimposed on
 * the turn, which is what a real object does.
 *
 * WEIGHT
 * ------
 * The brief's hardest requirement is that this thing feels like 18kg of
 * glass and steel. Three decisions do that work:
 *
 *   1. ζ ≈ 0.92 on the body springs. It arrives and stops. A light object
 *      overshoots; a heavy one does not.
 *   2. Small travel. ±7.5° of yaw where the previous hero had ±14°.
 *   3. The idle float is nearly nothing — 0.008 units, about one pixel. A
 *      monitor on a desk does not bob. It exists only so the object is
 *      never perfectly frozen, which reads as a still image.
 *
 * ONE STATE MACHINE
 * -----------------
 * Automatic cycling and a user click both go through `ScreenSystem.bump()`.
 * There is no second path, no competing timer and no way for a click to
 * land in the middle of an automatic change and leave two transitions
 * running. See screen/ScreenSystem.ts.
 *
 * SCROLL
 * ------
 * Nothing here reads `window.scrollY`, nothing is sticky, nothing is
 * fixed, and the object's world transform is independent of the document's
 * scroll position. It lives in normal document flow.
 */
export default function CrtRig({
  status,
  pressed,
  idle,
  pointer,
  channel,
  motionScale,
  mobileIdle,
  mobileInteracting,
  onLabel,
}: RigProps) {
  const objectRef = useRef<THREE.Group>(null);
  const powerRef = useRef<THREE.Group | null>(null);
  const ledRef = useRef<THREE.Mesh | null>(null);
  const spillRef = useRef<THREE.PointLight>(null);
  const shadowMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const materials = useCrtMaterials();
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  /* The screen. Created once; owns its canvas, its texture and the channel
     state machine. */
  const screen = useMemo(() => new ScreenSystem(), []);
  const crt = useMemo(() => createCrtMaterial(screen.texture), [screen]);

  useEffect(
    () => () => {
      crt.material.dispose();
      screen.dispose();
    },
    [crt, screen],
  );

  /**
   * SCANLINE NYQUIST GUARD
   * ----------------------
   * Scanlines below their sampling limit are not scanlines, they are
   * moiré — and on a phone the tube renders at a third of its desktop
   * size. So the raster's visibility is driven from how many device pixels
   * the tube actually occupies: full strength once each of the 200 lines
   * has roughly two pixels to itself, off entirely below about one.
   *
   * The tube is a little over half the framed height of the object, which
   * the fit solver packs to ~0.985 of the canvas.
   */
  useEffect(() => {
    const tubePx = size.height * dpr * (SCREEN.h / 3.5);
    crt.uniforms.uScanFade.value = clamp((tubePx - 210) / 230, 0, 1);
  }, [crt, size.height, dpr]);

  /* LED colour is state display, not interaction. */
  const tallyColor = TALLY_COLOR[status];
  materials.led.color.set(tallyColor);
  materials.led.emissive.set(tallyColor);

  /* One spring per degree of freedom. Created once; never re-allocated. */
  const sp = useMemo(
    () => ({
      yaw: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      pitch: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      roll: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      tx: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      ty: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      button: new Spring(0, MOTION.button.stiffness, MOTION.button.damping),
    }),
    [],
  );

  /* Non-spring scalars that must not overshoot. */
  const smooth = useRef({ proximity: 0, warm: 0, gain: 1, spill: 0 });
  const seq = useRef({ last: -1 });
  const lastLabel = useRef("");
  const mobileIdlePausedUntil = useRef(0);

  useFrame((state, rawDelta) => {
    const group = objectRef.current;
    if (!group) return;

    // A tab that has been backgrounded hands back a delta of many seconds.
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    /* -------------------------------------------------- channel input -- */
    const signal = channel.current;
    let bumped = false;
    if (seq.current.last === -1) {
      seq.current.last = signal.seq;
    } else if (signal.seq !== seq.current.last) {
      seq.current.last = signal.seq;
      screen.bump();
      bumped = true;
    }

    /* ------------------------------------------------------- the tube -- */
    const frame = screen.update(dt, !idle);
    crt.uniforms.uTime.value = t;
    crt.uniforms.uTrans.value = frame.transition;

    if (onLabel && frame.label !== lastLabel.current) {
      lastLabel.current = frame.label;
      onLabel(frame.label);
    }

    /* Warm-up: the raster opens out from a line, as a tube coming up does.
       Skipped entirely under reduced motion — the picture is simply there. */
    smooth.current.warm = idle ? damp(smooth.current.warm, 1, 3.4, dt) : 1;
    crt.uniforms.uWarm.value = Math.min(1, smooth.current.warm + 0.02);

    /* Brightness: a short dip on a channel change, on top of the shader's
       own fluctuation. Eased, not sprung — a brightness overshoot would
       read as a flash, which is a different piece of hardware behaviour. */
    if (bumped) smooth.current.gain = 0.55;
    smooth.current.gain = damp(smooth.current.gain, 1, 6, dt);
    crt.uniforms.uGain.value = idle ? smooth.current.gain : 1;

    /* The tube lighting its own bezel. */
    if (spillRef.current) {
      const target = 0.28 + frame.luma * 1.35 - frame.transition * 0.2;
      smooth.current.spill = damp(smooth.current.spill, Math.max(0, target), 5, dt);
      spillRef.current.intensity = smooth.current.spill;
    }

    /* The lamp. Brighter for a moment when the channel changes, because on
       a real set the standby lamp does flicker when the tube re-syncs. */
    materials.led.emissiveIntensity = 1.05 + (pressed ? 0.9 : 0) + frame.transition * 0.5;

    /* --------------------------------------------------- static branch -- */
    if (!idle) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, STAGING.yaw, STAGING.roll);
      if (shadowMatRef.current) shadowMatRef.current.uniforms.uLift.value = 0;
      if (powerRef.current) powerRef.current.position.z = CONTROLS.power.depth / 2 - 0.006;
      return;
    }

    const f = pointer.current;
    const active = f.active ? 1 : 0;

    /* Proximity is eased, not sprung: an overshoot here would push the
       glass highlight past its authored maximum. */
    smooth.current.proximity = damp(smooth.current.proximity, f.proximity * active, 6, dt);
    const prox = smooth.current.proximity;

    /* ------------------------------------------------------- targets --- */
    const ms = motionScale;

    /* Touch-only sweep, paused while a finger is down and for a beat after
       a tap, so the object is not drifting under the user's own gesture. */
    let touchYaw = 0;
    if (mobileIdle) {
      if (mobileInteracting.current) mobileIdlePausedUntil.current = t + 0.8;
      if (bumped) mobileIdlePausedUntil.current = t + 1.4;
      const gate = t > mobileIdlePausedUntil.current ? 1 : 0;
      touchYaw = Math.sin(t * MOBILE_IDLE_SPEED) * MOBILE_IDLE_YAW * ms * gate;
    }

    /* Idle drift. Two incommensurate periods per channel so the loop never
       lines up with itself — a single sine is immediately readable as a
       loop, which is what makes a hero object look like a screensaver. */
    const driftYaw =
      (Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.083) * 0.4) * MOTION.idle.driftYaw * ms;
    const driftPitch =
      (Math.sin(t * 0.17) * 0.6 + Math.sin(t * 0.061) * 0.4) * MOTION.idle.driftPitch * ms;
    const driftRoll = Math.sin(t * 0.13) * MOTION.idle.driftRoll * ms;

    sp.yaw.target = -f.x * MOTION.maxYaw * active + driftYaw + touchYaw;
    sp.pitch.target = f.y * MOTION.maxPitch * active + driftPitch;
    /* Roll AWAY from the cursor: a heavy object pushed sideways leans into
       the push at its base, so its top goes the other way. Very small — at
       1.1° it is felt as weight rather than seen as a tilt. */
    sp.roll.target = -f.x * MOTION.maxRoll * active + driftRoll;
    sp.tx.target = f.x * MOTION.translate.x * active;
    sp.ty.target = -f.y * MOTION.translate.y * active;

    if (bumped) {
      sp.pitch.impulse(MOTION.knock.pitch);
      sp.yaw.impulse(MOTION.knock.yaw);
      sp.button.snap(0);
      sp.button.impulse(2.6);
    }
    sp.button.target = pressed ? MOTION.button.press : 0;

    /* ------------------------------------------------------ integrate -- */
    sp.yaw.step(dt);
    sp.pitch.step(dt);
    sp.roll.step(dt);
    sp.tx.step(dt);
    sp.ty.step(dt);
    sp.button.step(dt);

    const floatY = Math.sin(t * 0.46) * MOTION.idle.floatY * ms;
    const floatZ = Math.sin(t * 0.31) * MOTION.idle.floatZ * ms;

    group.rotation.set(sp.pitch.value, STAGING.yaw + sp.yaw.value, STAGING.roll + sp.roll.value);
    group.position.set(sp.tx.value, sp.ty.value + floatY, floatZ);

    /* The contact shadow loosens a hair as the body rises. */
    if (shadowMatRef.current) {
      shadowMatRef.current.uniforms.uLift.value = clamp(floatY / MOTION.idle.floatY || 0, -1, 1);
    }

    /* The power switch: a real travel along −Z, clamped so the cap can
       never sink through its own surround. */
    if (powerRef.current) {
      const travel = clamp(sp.button.value, 0, MOTION.button.press * 1.6);
      powerRef.current.position.z = CONTROLS.power.depth / 2 - 0.006 - travel;
    }

    /* The glass picks up more of the room as the cursor approaches, which
       is the close-range cue for this object — the equivalent of a lens
       catching a highlight. Modulated around the authored resting value so
       it cannot compound frame after frame. */
    materials.glass.envMapIntensity = 2.7 + prox * 0.55;
  });

  return (
    <>
      <Lighting ref={spillRef} />
      <ContactShadow materialRef={shadowMatRef} />
      <group ref={objectRef} rotation={[0, STAGING.yaw, STAGING.roll]}>
        <Housing materials={materials} />
        <Screen materials={materials} crtMaterial={crt.material} />
        <Controls materials={materials} powerRef={powerRef} ledRef={ledRef} />
        <Base materials={materials} />
      </group>
    </>
  );
}
