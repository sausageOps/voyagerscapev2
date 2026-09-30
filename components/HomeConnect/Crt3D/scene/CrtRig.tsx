"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CONTROLS, MOTION, SCREEN, UNIT } from "../proportions";
import { buildMonitor } from "../geometry/monitor";
import { useCrtMaterials } from "../materials/materials";
import { GLASS } from "../materials/glass";
import { TALLY_COLOR, type TallyState } from "../materials/palette";
import { Spring, clamp, damp } from "../motion/spring";
import type { PointerField } from "../motion/usePointerField";
import type { ChannelSignal } from "../motion/channelSignal";
import { ScreenSystem } from "../screen/ScreenSystem";
import { createCrtMaterial } from "../screen/crtMaterial";
import CrtUnit from "./CrtUnit";
import ContactShadow from "./ContactShadow";
import Lighting from "./Lighting";

/* Touch devices have no cursor, so they get a slow automatic sweep
   instead. Wider than the old two degrees now that the cursor range is
   wider — enough to show a flank and come back — but still slow enough
   that it reads as an object turning, not an object spinning. */
const MOBILE_IDLE_YAW = (7 * Math.PI) / 180;
const MOBILE_IDLE_SPEED = 0.16;

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
  /**
   * Scales the CURSOR-driven rotation. 1 on desktop; reduced-motion users
   * get a fraction of it rather than nothing, so the object still answers
   * the cursor without being animated at them.
   */
  cursorScale: number;
  /** Touch-only devices get an automatic sweep in place of cursor hover. */
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
 * The root of the scene, and the ONLY thing in the feature that writes to
 * a transform, a uniform or a material property at frame rate.
 *
 * THE INTERACTION, IN ONE SENTENCE
 * --------------------------------
 * The cursor's position in the viewport is an orbit control: it sets a
 * target orientation, and a heavily damped spring drags the monitor
 * toward it.
 *
 * ROTATION, NOT TRANSLATION
 * -------------------------
 * The cursor drives yaw and pitch. It does NOT drive position, beyond
 * about four pixels of parallax. This distinction is the whole design:
 * a hero that slides around under the cursor is a floating sticker, and
 * one that turns is an object on a table you are walking around. The
 * monitor is dead centre in its frame at rest and stays within a few
 * pixels of centre at every cursor position, while showing you a
 * different face at each one.
 *
 * The signs FOLLOW the cursor — the object leans the way the cursor
 * went, rather than away from it:
 *
 *   cursor left   ->  yaw negative   ->  the monitor turns toward the
 *                                        left of the viewport, leaning
 *                                        after the cursor
 *   cursor right  ->  yaw positive   ->  the mirror of the above
 *   cursor top    ->  pitch negative ->  its face tilts UP, toward the
 *                                        cursor
 *   cursor bottom ->  pitch positive ->  its face tilts DOWN, toward the
 *                                        cursor
 *
 * The pitch one is the easy one to get backwards. Positive `rotation.x`
 * swings the top face TOWARD the camera and the face DOWN, so tracking a
 * cursor whose y grows downward means pitch takes the cursor's y sign
 * directly. Yaw likewise takes the cursor's x sign directly. Only the
 * rotation mapping changed here: the few pixels of positional parallax
 * (`tx`/`ty`) already tracked the cursor and are untouched, as is the
 * small counter-`roll` weight cue.
 *
 * MOTION ARCHITECTURE
 * -------------------
 * One `useFrame`. One set of springs. No GSAP below this line.
 *
 * That is not tidiness, it is the reason the channel-change knock works.
 * The obvious way to build it is `gsap.to(group.rotation, …)`, and it
 * looks fine until you click while moving the mouse: the tween and the
 * cursor tracking then both own `rotation.x`, and whichever writes last
 * that frame wins. The fix is not to sequence them more carefully — it is
 * to make the knock an IMPULSE, a one-off addition to the spring's
 * velocity. After that the knock and the cursor are the same motion,
 * resolved by the same integrator, and clicking mid-gesture produces the
 * kick superimposed on the turn, which is what a real object does.
 *
 * SCROLL
 * ------
 * Nothing here reads `window.scrollY`, nothing is sticky, nothing is
 * fixed, and the object's world transform is independent of the
 * document's scroll position.
 */
export default function CrtRig({
  status,
  pressed,
  idle,
  pointer,
  channel,
  motionScale,
  cursorScale,
  mobileIdle,
  mobileInteracting,
  onLabel,
}: RigProps) {
  const objectRef = useRef<THREE.Group>(null);
  const powerRef = useRef<THREE.Group | null>(null);
  const spillRef = useRef<THREE.PointLight | null>(null);
  const shadowMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => buildMonitor(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const materials = useCrtMaterials();

  /* The screen. Created once; owns its canvas, its texture and the
     channel state machine. */
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
   * size. So the raster's visibility is driven from how many device
   * pixels the tube actually occupies: full strength once each of the 200
   * lines has roughly two pixels to itself, off entirely below about one.
   */
  useEffect(() => {
    /* The object is about 3.4 units tall against a frame the fit solver
       packs to ~0.87 across the motion sweep, so at rest one world unit
       is roughly this many device pixels. */
    const pxPerUnit = (size.height * dpr) / 4.4;
    crt.uniforms.uScanFade.value = clamp((SCREEN.h * pxPerUnit - 200) / 230, 0, 1);
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
      mobileIdlePausedUntil.current = t + 1.4;
    }

    /* ------------------------------------------------------- the tube -- */
    const frame = screen.update(dt, !idle);
    crt.uniforms.uTime.value = t;
    crt.uniforms.uTrans.value = frame.transition;

    if (onLabel && frame.label !== lastLabel.current) {
      lastLabel.current = frame.label;
      onLabel(frame.label);
    }

    /* Warm-up: the raster opens out from a line, as a tube coming up
       does. Skipped entirely under reduced motion — the picture is
       simply there. */
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
      const target = 0.3 + frame.luma * 1.45 - frame.transition * 0.2;
      smooth.current.spill = damp(smooth.current.spill, Math.max(0, target), 5, dt);
      spillRef.current.intensity = smooth.current.spill;
    }

    /* The lamp. Brighter for a moment when the channel changes, because on
       a real set the standby lamp does flicker when the tube re-syncs. */
    materials.led.emissiveIntensity = 1.05 + (pressed ? 0.9 : 0) + frame.transition * 0.5;

    const f = pointer.current;
    const active = f.active ? 1 : 0;

    /* Proximity is eased, not sprung: an overshoot here would push the
       glass highlight past its authored maximum. */
    smooth.current.proximity = damp(smooth.current.proximity, f.proximity * active, 6, dt);
    const prox = smooth.current.proximity;

    /* ------------------------------------------------------- targets --- */
    const ms = motionScale;
    const cs = cursorScale;

    /* Touch-only sweep, paused while a finger is down and for a beat
       after a tap, so the object is not drifting under the user's own
       gesture. */
    let touchYaw = 0;
    if (mobileIdle && idle) {
      if (mobileInteracting.current) mobileIdlePausedUntil.current = t + 0.8;
      const gate = t > mobileIdlePausedUntil.current ? 1 : 0;
      touchYaw = Math.sin(t * MOBILE_IDLE_SPEED) * MOBILE_IDLE_YAW * ms * gate;
    }

    /* Idle drift. Two incommensurate periods per channel so the loop never
       lines up with itself — a single sine is immediately readable as a
       loop, which is what makes a hero object look like a screensaver.
       Almost imperceptible on purpose: it is a breath, not a behaviour,
       and the cursor's ±20° swamps it the moment a cursor exists. */
    const driftYaw =
      (Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.083) * 0.4) * MOTION.idle.driftYaw * ms;
    const driftPitch =
      (Math.sin(t * 0.17) * 0.6 + Math.sin(t * 0.061) * 0.4) * MOTION.idle.driftPitch * ms;
    const driftRoll = Math.sin(t * 0.13) * MOTION.idle.driftRoll * ms;

    /* THE FOLLOW. Yaw with the cursor's x, pitch with its y. */
    sp.yaw.target = f.x * MOTION.maxYaw * active * cs + driftYaw + touchYaw;
    sp.pitch.target = f.y * MOTION.maxPitch * active * cs + driftPitch;
    /* Roll AWAY from the cursor: a heavy object pushed sideways leans into
       the push at its base, so its top goes the other way. Small — it is
       felt as weight rather than seen as a tilt. */
    sp.roll.target = -f.x * MOTION.maxRoll * active * cs + driftRoll;
    sp.tx.target = f.x * MOTION.translate.x * active * cs;
    sp.ty.target = -f.y * MOTION.translate.y * active * cs;

    /* ------------------------------------------------- static branch --- */
    if (!idle) {
      /* Reduced motion: no drift, no float, no warm-up — but the cursor
         still turns the object, at a fraction of the range, because
         "reduced motion" means do not animate AT the user, not remove
         the ability to look at the thing. The springs still run, so the
         response is smooth rather than stepped. */
      sp.yaw.target = f.x * MOTION.maxYaw * active * cs;
      sp.pitch.target = f.y * MOTION.maxPitch * active * cs;
      sp.roll.target = 0;
      sp.tx.target = 0;
      sp.ty.target = 0;
      sp.yaw.step(dt);
      sp.pitch.step(dt);

      group.position.set(0, 0, 0);
      group.rotation.set(sp.pitch.value, sp.yaw.value, 0);
      if (shadowMatRef.current) {
        shadowMatRef.current.uniforms.uLift.value = 0;
        shadowMatRef.current.uniforms.uYaw.value = sp.yaw.value;
      }
      if (powerRef.current) powerRef.current.position.z = CONTROLS.power.depth / 2 - 0.006;
      return;
    }

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

    group.rotation.set(sp.pitch.value, UNIT.yaw + sp.yaw.value, sp.roll.value);
    group.position.set(sp.tx.value, sp.ty.value + floatY, floatZ);

    /* The shadow turns with the body and loosens a hair as it rises. A
       pool that stays put while the object above it rotates is the single
       fastest way to make a rendered object look pasted onto the page. */
    if (shadowMatRef.current) {
      const u = shadowMatRef.current.uniforms;
      u.uLift.value = clamp(MOTION.idle.floatY ? floatY / MOTION.idle.floatY : 0, -1, 1);
      u.uYaw.value = sp.yaw.value;
      u.uPitch.value = sp.pitch.value;
    }

    /* The power switch: a real travel along −Z, clamped so the cap can
       never sink through its own surround. */
    if (powerRef.current) {
      const travel = clamp(sp.button.value, 0, MOTION.button.press * 1.6);
      powerRef.current.position.z = CONTROLS.power.depth / 2 - 0.006 - travel;
    }

    /* The glass picks up more of the room as the cursor approaches, which
       is the close-range cue for this object — the equivalent of a lens
       catching a highlight. Modulated around the authored resting value
       so it cannot compound frame after frame. */
    materials.glass.uniforms.uReflect.value = GLASS.reflect + prox * GLASS.reflectHover;
  });

  return (
    <>
      <Lighting />
      <ContactShadow materialRef={shadowMatRef} />
      <group ref={objectRef}>
        <CrtUnit
          geometry={geometry}
          materials={materials}
          crtMaterial={crt.material}
          powerRef={powerRef}
          spillRef={spillRef}
        />
      </group>
    </>
  );
}
