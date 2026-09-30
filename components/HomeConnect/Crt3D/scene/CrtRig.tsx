"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MOTION, SCREEN_STATES, STAGING } from "../proportions";
import { useCrtMaterials } from "../materials";
import { Spring, damp, clamp } from "@/components/HomeConnect/Camera3D/motion/spring";
import type { PointerField } from "@/components/HomeConnect/Camera3D/motion/usePointerField";
import { createScreenTexture, createReadoutTexture } from "./screenTexture";
import CrtBody from "./CrtBody";
import Screen from "./Screen";
import Controls, { type ControlRefs } from "./Controls";
import Signature from "./Signature";
import Lighting from "./Lighting";
import ContactShadow from "./ContactShadow";

const MOBILE_IDLE_YAW = (2.2 * Math.PI) / 180;
const MOBILE_IDLE_SPEED = 0.15;

interface RigProps {
  /** Index into SCREEN_STATES — the current terminal state. */
  stateIndex: number;
  /** Bumped on every activation, so the rig can react even if index wraps. */
  clickSeq: MutableRefObject<number>;
  idle: boolean;
  pointer: MutableRefObject<PointerField>;
  motionScale: number;
  mobileIdle: boolean;
  mobileInteracting: MutableRefObject<boolean>;
}

/**
 * CRT RIG
 * =======
 *
 * The single owner of every transform in the scene, driven by one `useFrame`
 * and a set of springs (reused from the camera hero). No GSAP below this line,
 * no document-scroll coupling.
 *
 *   body        yaw/pitch/roll spring   cursor + idle breathing + translate
 *   screen grp  nested parallax         depth separation
 *   signature   nested parallax         depth separation + slow gimbal spin
 *   fascia      nested parallax         depth separation
 *   knob 0      rotation spring         steps round one detent per activation
 *   button 0/1  press spring            depress on activation, spring back
 *   screen glow flicker                 restrained CRT breathing + refresh
 */
export default function CrtRig({
  stateIndex,
  clickSeq,
  idle,
  pointer,
  motionScale,
  mobileIdle,
  mobileInteracting,
}: RigProps) {
  const materials = useCrtMaterials();

  const objectRef = useRef<THREE.Group>(null);
  const screenParallaxRef = useRef<THREE.Group | null>(null);
  const signatureParallaxRef = useRef<THREE.Group | null>(null);
  const fasciaParallaxRef = useRef<THREE.Group | null>(null);

  const glowRef = useRef<THREE.PointLight | null>(null);
  const phosphorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const ringRef = useRef<THREE.Group | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const haloRef = useRef<THREE.PointLight | null>(null);

  const controlRefs = useRef<ControlRefs>({
    knobs: { current: [] },
    buttons: { current: [] },
    leds: { current: [] },
  }).current;

  // Screen + readout textures — created once on the client.
  const screen = useMemo(() => createScreenTexture(), []);
  const readout = useMemo(() => createReadoutTexture(), []);
  useEffect(
    () => () => {
      screen.dispose();
      readout.dispose();
    },
    [screen, readout],
  );

  // Springs.
  const sp = useMemo(
    () => ({
      yaw: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      pitch: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      roll: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      tx: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      ty: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      knob: new Spring(0, MOTION.knob.stiffness, MOTION.knob.damping),
      btn: new Spring(0, MOTION.button.stiffness, MOTION.button.damping),
    }),
    [],
  );

  const smooth = useRef({ prox: 0 });
  const flicker = useRef({ until: 0, active: false });
  const lastSeq = useRef(0);
  const activeButton = useRef(0);

  // Redraw the screen whenever the state changes, and react physically.
  useEffect(() => {
    const idx = ((stateIndex % SCREEN_STATES.length) + SCREEN_STATES.length) % SCREEN_STATES.length;
    const state = SCREEN_STATES[idx];
    const warm = state === "CAPTURE" || state === "SIGNAL" ? 1 : 0;
    screen.draw(state, idx, { warm });
    readout.draw(idx);
  }, [stateIndex, screen, readout]);

  // React to activations: step the knob, press a button, kick a refresh flicker.
  useEffect(() => {
    if (clickSeq.current === lastSeq.current) return;
    // handled in frame loop via seq compare; nothing to do here directly.
  });

  // Snap to rest when motion is disabled.
  useEffect(() => {
    if (idle) return;
    sp.yaw.snap(0);
    sp.pitch.snap(0);
    sp.roll.snap(0);
    sp.tx.snap(0);
    sp.ty.snap(0);
    if (objectRef.current) {
      objectRef.current.position.set(0, 0, 0);
      objectRef.current.rotation.set(STAGING.pitch, STAGING.yaw, 0);
    }
    if (glowRef.current) glowRef.current.intensity = 0.5;
    if (phosphorMatRef.current) phosphorMatRef.current.emissiveIntensity = 1.0;
  }, [idle, sp]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const f = pointer.current;
    const group = objectRef.current;
    if (!group) return;

    /* ---- activation edge: knob detent + button press + refresh flicker ---- */
    if (clickSeq.current !== lastSeq.current) {
      lastSeq.current = clickSeq.current;
      sp.knob.target += MOTION.knob.turn;
      activeButton.current = clickSeq.current % 2;
      sp.btn.snap(0);
      sp.btn.target = 0; // press handled as an impulse below
      sp.btn.impulse(-6);
      flicker.current.until = t + 0.28;
      flicker.current.active = true;
    }

    if (!idle) {
      // Static pose already set in the effect; still draw nothing dynamic.
      return;
    }

    /* ---------------------------------------------------- cursor inputs ---- */
    const active = f.active ? 1 : 0;
    smooth.current.prox = damp(smooth.current.prox, f.proximity * active, 6.0, dt);
    const prox = smooth.current.prox;

    const mobileYaw =
      mobileIdle && !mobileInteracting.current
        ? Math.sin(t * MOBILE_IDLE_SPEED) * MOBILE_IDLE_YAW * motionScale
        : 0;

    sp.yaw.target = f.x * MOTION.maxYaw * active + mobileYaw;
    sp.pitch.target = f.y * MOTION.maxPitch * active;
    sp.roll.target = -f.x * MOTION.maxRoll * active;
    sp.tx.target = f.x * MOTION.translate.x * active;
    sp.ty.target = -f.y * MOTION.translate.y * active;

    sp.yaw.step(dt);
    sp.pitch.step(dt);
    sp.roll.step(dt);
    sp.tx.step(dt);
    sp.ty.step(dt);

    /* ------------------------------------------------------ idle breathing -- */
    const floatY =
      (Math.sin(t * 0.5) * MOTION.idle.floatY + Math.sin(t * 0.19 + 1.3) * MOTION.idle.floatY * 0.4) *
      motionScale;
    const floatZ =
      (Math.sin(t * 0.31 + 0.6) * MOTION.idle.floatZ + Math.sin(t * 0.12 + 2.1) * MOTION.idle.floatZ * 0.4) *
      motionScale;
    const driftYaw = Math.sin(t * 0.27) * MOTION.idle.driftYaw * motionScale;
    const driftPitch = Math.sin(t * 0.22 + 0.9) * MOTION.idle.driftPitch * motionScale;
    const driftRoll = Math.sin(t * 0.25) * MOTION.idle.driftRoll * motionScale;

    group.position.set(sp.tx.value, floatY + sp.ty.value, floatZ);
    group.rotation.set(
      STAGING.pitch + sp.pitch.value + driftPitch,
      STAGING.yaw + sp.yaw.value + driftYaw,
      sp.roll.value + driftRoll,
    );

    /* --------------------------------------------------- depth parallax ---- */
    const px = MOTION.parallax;
    if (screenParallaxRef.current) {
      screenParallaxRef.current.rotation.set(sp.pitch.value * px.screen, sp.yaw.value * px.screen, sp.roll.value * px.screen);
    }
    if (signatureParallaxRef.current) {
      signatureParallaxRef.current.rotation.set(
        sp.pitch.value * px.signature,
        sp.yaw.value * px.signature,
        sp.roll.value * px.signature,
      );
    }
    if (fasciaParallaxRef.current) {
      fasciaParallaxRef.current.rotation.set(sp.pitch.value * px.fascia, sp.yaw.value * px.fascia, sp.roll.value * px.fascia);
    }

    /* --------------------------------------------------------- knob turn --- */
    sp.knob.step(dt);
    const knob0 = controlRefs.knobs.current[0];
    if (knob0) knob0.rotation.z = sp.knob.value;
    // the other two knobs get a tiny hover lift toward the viewer
    for (let i = 1; i < controlRefs.knobs.current.length; i++) {
      const k = controlRefs.knobs.current[i];
      if (k) k.position.z = clamp(prox * MOTION.knob.hover, 0, MOTION.knob.hover);
    }

    /* ------------------------------------------------------ button press --- */
    sp.btn.step(dt);
    for (let i = 0; i < controlRefs.buttons.current.length; i++) {
      const b = controlRefs.buttons.current[i];
      if (!b) continue;
      const hover = prox * MOTION.button.hover;
      const press = i === activeButton.current ? clamp(sp.btn.value, -MOTION.button.press, 0.02) : 0;
      b.position.z = -hover + press;
    }

    /* --------------------------------------------------------------- LEDs -- */
    // gentle staggered pulse; brighten on proximity
    for (let i = 0; i < controlRefs.leds.current.length; i++) {
      const led = controlRefs.leds.current[i];
      if (!led) continue;
      const mat = led.material as THREE.MeshStandardMaterial;
      const pulse = 0.5 + 0.5 * Math.sin(t * (1.1 + i * 0.4) + i);
      mat.emissiveIntensity = 0.45 + pulse * 0.35 + prox * 0.4;
    }

    /* --------------------------------------------------- signature gimbal -- */
    if (ringRef.current) {
      ringRef.current.rotation.y = t * MOTION.signature.spin;
      ringRef.current.rotation.x = Math.sin(t * 0.4) * 0.3;
    }
    const breathe = 0.85 + 0.15 * Math.sin(t * MOTION.signature.breathe);
    if (sphereRef.current) {
      const s = 1 + 0.04 * Math.sin(t * MOTION.signature.breathe);
      sphereRef.current.scale.setScalar(s);
      (sphereRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + breathe * 0.5;
    }
    if (haloRef.current) haloRef.current.intensity = 0.5 + breathe * 0.4;

    /* --------------------------------------------------- screen breathing -- */
    // Extremely subtle idle flicker + a brief refresh flash on activation.
    let refresh = 0;
    if (flicker.current.active) {
      const remain = flicker.current.until - t;
      if (remain <= 0) {
        flicker.current.active = false;
      } else {
        // quick strobe during the refresh window
        refresh = Math.sin(remain * 60) * 0.12 + 0.1;
      }
    }
    const breatheScreen = 0.985 + 0.015 * Math.sin(t * 1.6) + 0.008 * Math.sin(t * 7.3);
    const emissive = clamp(breatheScreen + refresh, 0.6, 1.4);
    if (phosphorMatRef.current) phosphorMatRef.current.emissiveIntensity = emissive;
    if (glowRef.current) glowRef.current.intensity = 0.42 * emissive + prox * 0.12;
  });

  return (
    <>
      <Lighting />
      <ContactShadow />

      <group ref={objectRef} rotation={[STAGING.pitch, STAGING.yaw, 0]}>
        <CrtBody materials={materials} />

        <group ref={screenParallaxRef}>
          <Screen materials={materials} screen={screen} glowRef={glowRef} phosphorMatRef={phosphorMatRef} />
        </group>

        <group ref={signatureParallaxRef}>
          <Signature materials={materials} ringRef={ringRef} sphereRef={sphereRef} haloRef={haloRef} />
        </group>

        <group ref={fasciaParallaxRef}>
          <Controls materials={materials} readout={readout} refs={controlRefs} />
        </group>
      </group>
    </>
  );
}
