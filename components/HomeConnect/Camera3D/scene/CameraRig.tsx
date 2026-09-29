"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { IRIS, MOTION, STAGING } from "../proportions";
import { useCameraMaterials } from "../materials/materials";
import { TALLY_COLOR, type TallyState } from "../materials/palette";
import { Spring, damp, clamp } from "../motion/spring";
import type { PointerField } from "../motion/usePointerField";
import type { ShutterSignal } from "../motion/shutterSignal";
import CameraBody from "./CameraBody";
import LensAssembly, { setIrisOpening } from "./LensAssembly";
import Controls from "./Controls";
import ContactShadow from "./ContactShadow";
import Lighting from "./Lighting";

interface RigProps {
  status: TallyState;
  /** True during the short capture readout window. */
  capture: boolean;
  /** Master motion switch. False = a completely static object. */
  idle: boolean;
  pointer: MutableRefObject<PointerField>;
  shutter: MutableRefObject<ShutterSignal>;
  /** Amplitude of the continuous (non-cursor) motion. 1 desktop, less on
   *  tablet, less again on phones. Cursor response is unaffected. */
  motionScale: number;
}

/**
 * CAMERA RIG
 * ==========
 *
 * The root of the scene, and — importantly — the ONLY thing in the codebase
 * that writes to any transform inside it.
 *
 * MOTION ARCHITECTURE
 * -------------------
 * One `useFrame`. One set of springs. No GSAP anywhere below this line.
 *
 * That is not stylistic tidiness, it is the reason the shutter recoil works.
 * The obvious way to build a recoil is `gsap.to(group.rotation, {x: ...})`,
 * and it looks fine until you click while moving the mouse: the tween and the
 * cursor tracking then both own `rotation.x`, and whichever writes last that
 * frame wins. You get a camera that snaps between two poses for the duration
 * of the tween and then jumps back. The fix is not to sequence them more
 * carefully — it is to make the recoil an *impulse*, a one-off addition to
 * the spring's velocity. After that the recoil and the cursor are the same
 * motion, resolved by the same integrator, and clicking mid-gesture produces
 * the kick superimposed on the turn, which is what a real object does.
 *
 * Springs, not lerps: a lerp cannot overshoot and cannot carry an impulse.
 * See motion/spring.ts.
 *
 * WHAT MOVES
 * ----------
 *   body         yaw/pitch spring        100%    cursor + idle drift
 *   lens housing nested group            115%    depth parallax
 *   focus ring   nested group            125%    parallax + axial rotation
 *   controls     nested group             92%    depth parallax
 *   iris         instance matrices               proximity + shutter
 *   button       group translate                 proximity + press
 *   glass        envMapIntensity                 proximity
 *
 * The parallax groups are rotations about the OBJECT's origin, not about each
 * part's own centre — rotating a part about itself tilts it, which reads as a
 * component coming loose. Rotating about the shared origin translates it, in
 * proportion to how far forward it sits, which is what parallax is. Values
 * are deliberately tiny: at full deflection the focus ring shifts about 1.5px
 * against the barrel at hero size.
 *
 * REDUCED MOTION / TOUCH
 * ----------------------
 * `idle=false` freezes everything at the resting pose in a single branch, so
 * there is no partially-animated state to reason about. On a coarse pointer
 * the pointer field never activates, so the cursor terms are all zero and
 * only the idle float runs — no cursor is faked from touch positions.
 */
export default function CameraRig({ status, capture, idle, pointer, shutter, motionScale }: RigProps) {
  const objectRef = useRef<THREE.Group>(null);
  const lensParallaxRef = useRef<THREE.Group | null>(null);
  const focusParallaxRef = useRef<THREE.Group | null>(null);
  const controlsParallaxRef = useRef<THREE.Group | null>(null);
  const focusRingRef = useRef<THREE.Group | null>(null);
  const irisRef = useRef<THREE.InstancedMesh | null>(null);
  const buttonRef = useRef<THREE.Group | null>(null);
  const flashRef = useRef<THREE.DirectionalLight>(null);

  const shadowMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const shadowGroupRef = useRef<THREE.Group | null>(null);
  const materials = useCameraMaterials();

  /* Tally lamp is state display, not interaction. */
  const tallyColor = TALLY_COLOR[status];
  materials.tally.color.set(tallyColor);
  materials.tally.emissive.set(tallyColor);
  materials.tally.emissiveIntensity = status === "idle" ? 0.2 : 0.75;

  /* Baselines for the optical highlights, captured once so proximity always
     modulates around the signed-off resting values rather than compounding on
     itself frame after frame. The inner element gets its own restrained lift:
     two highlights at two depths make the lens read as glass in a barrel. */
  const glassBase = useRef(materials.glass.envMapIntensity);
  const glassInnerBase = useRef(materials.glassInner.envMapIntensity);
  useEffect(() => {
    glassBase.current = materials.glass.envMapIntensity;
    glassInnerBase.current = materials.glassInner.envMapIntensity;
  }, [materials]);

  /* One spring per degree of freedom. Created once; never re-allocated. */
  const sp = useMemo(
    () => ({
      yaw: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      pitch: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      roll: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      tx: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      ty: new Spring(0, MOTION.rotation.stiffness, MOTION.rotation.damping),
      push: new Spring(0, MOTION.recoil.push.stiffness, MOTION.recoil.push.damping),
      focus: new Spring(0, MOTION.focusRing.stiffness, MOTION.focusRing.damping),
      iris: new Spring(IRIS.open, MOTION.aperture.stiffness, MOTION.aperture.damping),
      button: new Spring(0, MOTION.shutterButton.stiffness, MOTION.shutterButton.damping),
    }),
    [],
  );

  /* Non-spring scalars that must not overshoot. */
  const smooth = useRef({ proximity: 0, hover: 0, lastIris: IRIS.open as number });

  /* Shutter sequence bookkeeping. `t` is seconds since the click, or -1. */
  const seq = useRef({ last: -1, t: -1 });
  const hovering = useRef(false);

  useFrame((state, rawDelta) => {
    const group = objectRef.current;
    if (!group) return;

    /* --------------------------------------------------- static branch -- */
    if (!idle) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, STAGING.yaw, STAGING.roll);
      if (shadowGroupRef.current) shadowGroupRef.current.position.set(0, 0, 0);
      if (shadowMatRef.current) shadowMatRef.current.uniforms.uLift.value = 0;
      if (lensParallaxRef.current) lensParallaxRef.current.position.z = 0;
      if (focusParallaxRef.current) focusParallaxRef.current.rotation.set(0, 0, 0);
      if (controlsParallaxRef.current) controlsParallaxRef.current.rotation.set(0, 0, 0);
      if (focusRingRef.current) {
        focusRingRef.current.position.z = 0;
        focusRingRef.current.rotation.z = 0;
      }
      if (buttonRef.current) buttonRef.current.position.y = 0;
      sp.iris.snap(IRIS.open);
      if (irisRef.current && smooth.current.lastIris !== IRIS.open) {
        setIrisOpening(irisRef.current, IRIS.open);
        smooth.current.lastIris = IRIS.open;
      }
      materials.glass.envMapIntensity = glassBase.current;
      materials.glassInner.envMapIntensity = glassInnerBase.current;
      // Reduced-motion capture keeps only a tiny, static warm glint for the
      // short display-state window; normal motion uses the existing impulse
      // flash envelope below.
      if (flashRef.current) flashRef.current.intensity = capture ? 0.08 : 0;
      return;
    }

    // A tab that has been backgrounded hands back a delta of many seconds.
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const f = pointer.current;

    /* ------------------------------------------------ shutter sequence -- */
    const signal = shutter.current;
    if (seq.current.last === -1) {
      seq.current.last = signal.seq;
    } else if (signal.seq !== seq.current.last) {
      seq.current.last = signal.seq;
      seq.current.t = 0;
      // The recoil, as velocity added to the springs the cursor is driving.
      sp.pitch.impulse(MOTION.recoil.pitch);
      sp.yaw.impulse(MOTION.recoil.yaw);
      sp.push.impulse(MOTION.recoil.push.impulse);
    }
    if (seq.current.t >= 0) {
      seq.current.t += dt;
      if (seq.current.t > 1.2) seq.current.t = -1;
    }
    const firing = seq.current.t >= 0 && seq.current.t < MOTION.shutter.closeFor;

    /* ---------------------------------------------------------- inputs -- */
    const active = f.active ? 1 : 0;
    // Proximity and hover are eased, not sprung: an overshooting proximity
    // would make the lens flinch past its target every time you approached.
    smooth.current.proximity = damp(
      smooth.current.proximity,
      f.proximity * active,
      6.5,
      dt,
    );
    smooth.current.hover = damp(
      smooth.current.hover,
      hovering.current && f.active ? 1 : 0,
      11,
      dt,
    );
    const prox = smooth.current.proximity;

    /* ------------------------------------------------- body: the spring -- */
    // Cursor right → yaw right; cursor down → nose down. Both fall to zero
    // when the pointer leaves the window, so the object returns to its
    // staged pose rather than freezing wherever it was last looking.
    sp.yaw.target = f.x * MOTION.maxYaw * active;
    sp.pitch.target = f.y * MOTION.maxPitch * active;
    // Lean away from the side the cursor is on, like a hung mass being
    // pushed. Same spring constants as yaw/pitch, so it settles in company
    // with them instead of arriving separately.
    sp.roll.target = -f.x * MOTION.maxRoll * active;
    // Translation. The object drifts the way you are looking, which is what
    // stops the rotation reading as a turntable bolted to the page. Runs on
    // the same springs as the rotation so position and angle arrive together
    // rather than as two separate movements.
    sp.tx.target = f.x * MOTION.translate.x * active;
    sp.ty.target = -f.y * MOTION.translate.y * active;
    sp.push.target = 0;

    sp.yaw.step(dt);
    sp.pitch.step(dt);
    sp.roll.step(dt);
    sp.tx.step(dt);
    sp.ty.step(dt);
    sp.push.step(dt);

    // Idle drift: incommensurate periods on every channel so no two ever
    // line up and the loop stays unreadable. Amplitudes are ~0.6° and ~0.02
    // units — the object should look suspended, not animated.
    const floatY =
      (Math.sin(t * 0.46) * MOTION.idle.floatY +
        Math.sin(t * 0.181 + 1.7) * MOTION.idle.floatY * 0.35 +
        Math.sin(t * 0.0971 + 0.4) * MOTION.idle.floatY * 0.22) *
      motionScale;
    // Depth breathes on its own periods so y and z never resolve into a
    // circle — that is what would read as an orbit instead of a drift.
    const floatZ =
      (Math.sin(t * 0.283 + 0.6) * MOTION.idle.floatZ +
        Math.sin(t * 0.117 + 2.3) * MOTION.idle.floatZ * 0.4 +
        Math.sin(t * 0.0613 + 1.1) * MOTION.idle.floatZ * 0.25) *
      motionScale;
    const driftYaw =
      (Math.sin(t * 0.33) * MOTION.idle.driftYaw +
        Math.sin(t * 0.127) * MOTION.idle.driftYaw * 0.4) *
      motionScale;
    const driftPitch = Math.sin(t * 0.239 + 0.9) * MOTION.idle.driftPitch * motionScale;
    const driftRoll = Math.sin(t * 0.27) * MOTION.idle.driftRoll * motionScale;

    // FINAL COMPOSE. Every channel is additive and every one of them is
    // written here, once, from this single useFrame. Document scrolling is
    // intentionally not part of the world transform: page position belongs
    // to the hero layout, while the camera's motion belongs to this rig.
    const bodyZ = floatZ + sp.push.value;
    group.position.set(sp.tx.value, floatY + sp.ty.value, bodyZ);

    // The shadow stays on the ground but tracks the object in depth, and
    // loosens as it rises: an object that floats up without its contact
    // softening looks pasted on. Outside the staging yaw, so this z is the
    // same world z the body uses.
    // Shadow tracks the object across the floor in both axes but never
    // leaves it: y stays on the ground, height is expressed as density.
    if (shadowGroupRef.current) shadowGroupRef.current.position.set(sp.tx.value, 0, bodyZ);
    if (shadowMatRef.current) {
      shadowMatRef.current.uniforms.uLift.value = floatY / (MOTION.idle.floatY || 1);
    }

    group.rotation.set(
      sp.pitch.value + driftPitch,
      STAGING.yaw + sp.yaw.value + driftYaw,
      STAGING.roll + driftRoll + sp.roll.value,
    );

    /* ------------------------------------------------ depth parallax ----- */
    // Additive fractions of the body rotation, about the object origin.
    const px = MOTION.parallax;
    if (lensParallaxRef.current) {
      lensParallaxRef.current.rotation.set(
        sp.pitch.value * px.lens,
        sp.yaw.value * px.lens,
        sp.roll.value * px.lens,
      );
      // The front group eases toward the viewer as the cursor closes on it.
      // A fraction of a millimetre at model scale — it separates the lens
      // from the body in depth without unseating it from the panel.
      lensParallaxRef.current.position.z = prox * MOTION.lensNear;
    }
    if (focusParallaxRef.current) {
      focusParallaxRef.current.rotation.set(
        sp.pitch.value * px.focusRing,
        sp.yaw.value * px.focusRing,
        sp.roll.value * px.focusRing,
      );
    }
    if (controlsParallaxRef.current) {
      controlsParallaxRef.current.rotation.set(
        sp.pitch.value * px.controls,
        sp.yaw.value * px.controls,
        sp.roll.value * px.controls,
      );
    }

    /* ------------------------------------------------------- focus ring -- */
    // Turns toward the cursor, but only once the cursor is near the lens,
    // and only within a bounded travel.
    //
    // Driven by the OBJECT-local offset, not the viewport one. The first
    // version used the viewport offset and the ring barely moved: that term
    // is only large when the cursor is far away, which is exactly when
    // `prox` has gone to zero, so the product was pinned near nothing at
    // every cursor position. Measured travel was under a third of the
    // permitted maximum. See PointerField.lx.
    //
    // Mapping the ring to the cursor's ANGLE around the lens was considered
    // and rejected: circling the pointer would spin the ring continuously,
    // which is the "animated wheel" the brief rules out. A bounded rotation
    // from a linear offset gives a control that is turned, and then stops.
    sp.focus.target = -f.lx * MOTION.focusRing.max * prox * active;
    sp.focus.step(dt);
    if (focusRingRef.current) {
      focusRingRef.current.rotation.z = sp.focus.value;
      // A fractional forward separation gives the moving ring its own
      // highlight while leaving the barrel mechanically seated.
      focusRingRef.current.position.z = prox * MOTION.focusRingNear;
    }

    /* ------------------------------------------------------------ iris --- */
    // The aperture has one resting state: fully open. Proximity still
    // drives the lens ring, glass and depth response, but it must not leave
    // the iris stopped down after a shutter cycle.
    sp.iris.target = firing ? IRIS.shut : IRIS.open;
    sp.iris.step(dt);
    const opening = clamp(sp.iris.value, IRIS.shut * 0.6, IRIS.open * 1.04);
    // Seven matrix writes per frame is nothing, but skipping them while the
    // iris is parked keeps the instance buffer off the upload path entirely.
    if (irisRef.current && Math.abs(opening - smooth.current.lastIris) > 0.00015) {
      setIrisOpening(irisRef.current, opening);
      smooth.current.lastIris = opening;
    }

    /* ---------------------------------------------------- glass specular -- */
    // Driven through envMapIntensity, never opacity. A transparent material
    // composites opacity*shaded + (1-opacity)*background, so fading opacity
    // to "brighten" the glass fades the specular out with it.
    materials.glass.envMapIntensity =
      glassBase.current * (1 + prox * 0.22 + smooth.current.hover * 0.06);
    materials.glassInner.envMapIntensity = glassInnerBase.current * (1 + prox * 0.1);

    /* --------------------------------------------------- shutter button -- */
    const btn = MOTION.shutterButton;
    sp.button.target = firing
      ? -btn.press
      : -(btn.hover * (0.35 * prox + 0.65 * smooth.current.hover));
    sp.button.step(dt);
    if (buttonRef.current) {
      buttonRef.current.position.y = clamp(sp.button.value, -btn.press * 1.15, btn.hover * 0.4);
    }

    /* --------------------------------------------------------- flash ----- */
    if (flashRef.current) {
      const s = seq.current.t;
      let env = 0;
      if (s >= 0) {
        env =
          s < MOTION.flash.attack
            ? s / MOTION.flash.attack
            : Math.max(0, 1 - (s - MOTION.flash.attack) / MOTION.flash.decay);
      }
      flashRef.current.intensity = env * env * MOTION.flash.peak;
    }
  });

  return (
    <>
      <Lighting />

      {/* Shutter flash. A dedicated light at zero intensity rather than a
          modulation of the key light, so the base lighting rig stays exactly
          as Stage 1B left it and the effect cannot drift the resting look. */}
      <directionalLight ref={flashRef} intensity={0} position={[-3.2, 2.6, 5.2]} color="#fff6ee" />

      {/* Ground shadow lives outside the object's roll so it stays level. */}
      <group ref={shadowGroupRef}>
        <group rotation={[0, STAGING.yaw, 0]}>
          <ContactShadow materialRef={shadowMatRef} />
        </group>
      </group>

      <group ref={objectRef} rotation={[0, STAGING.yaw, STAGING.roll]}>
        <CameraBody materials={materials} capture={capture} />

        <group ref={lensParallaxRef}>
          <LensAssembly
            materials={materials}
            focusRingRef={focusRingRef}
            focusParallaxRef={focusParallaxRef}
            irisRef={irisRef}
          />
        </group>

        <group ref={controlsParallaxRef}>
          <Controls
            materials={materials}
            buttonRef={buttonRef}
            onShutterHover={(over) => {
              hovering.current = over;
            }}
          />
        </group>
      </group>
    </>
  );
}
