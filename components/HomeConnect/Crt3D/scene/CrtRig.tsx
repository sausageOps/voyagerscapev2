"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CONTROLS,
  MOTION,
  SCREEN,
  standY,
  type Composition,
  type UnitSpec,
} from "../proportions";
import { buildMonitor } from "../geometry/monitor";
import { useCrtMaterials, type CrtMaterials } from "../materials/materials";
import { TALLY_COLOR, type TallyState } from "../materials/palette";
import { Spring, clamp, damp } from "../motion/spring";
import type { PointerField } from "../motion/usePointerField";
import type { ChannelSignal } from "../motion/channelSignal";
import { ScreenSystem } from "../screen/ScreenSystem";
import { createCrtMaterial, type CrtUniforms } from "../screen/crtMaterial";
import CrtUnit from "./CrtUnit";
import ContactShadow from "./ContactShadow";
import Lighting from "./Lighting";

/* Touch devices have no cursor, so they get a slow automatic sweep instead.
   Two degrees before device scaling: enough to reveal the object in depth,
   well below the desktop cursor range, slow enough not to read as a spin. */
const MOBILE_IDLE_YAW = (2 * Math.PI) / 180;
const MOBILE_IDLE_SPEED = 0.13;

interface RigProps {
  /** The composition to stand the two machines in. Swaps at the breakpoint. */
  composition: Composition;
  status: TallyState;
  /** True during the short window after a click. */
  pressed: boolean;
  /** Master motion switch. False = a completely static scene. */
  idle: boolean;
  pointer: MutableRefObject<PointerField>;
  channel: MutableRefObject<ChannelSignal>;
  /** Amplitude of the continuous (non-cursor) motion, by device class. */
  motionScale: number;
  /** Touch-only devices get a restrained yaw drift in place of cursor hover. */
  mobileIdle: boolean;
  /** True only while a touch/pen is held on the object's button. */
  mobileInteracting: MutableRefObject<boolean>;
  /** Reports the two programme labels to the DOM live region. */
  onLabels?: (primary: string, secondary: string) => void;
}

/**
 * Everything that has to be stepped for one machine, in one object.
 *
 * Bundling it this way is what lets the rig run two monitors off a single
 * `useFrame` without the update code turning into two parallel copies
 * that drift apart the first time one of them is tuned.
 */
interface Unit {
  group: MutableRefObject<THREE.Group | null>;
  power: MutableRefObject<THREE.Group | null>;
  spill: MutableRefObject<THREE.PointLight | null>;
  shadowMat: MutableRefObject<THREE.ShaderMaterial | null>;
  materials: CrtMaterials;
  screen: ScreenSystem;
  uniforms: CrtUniforms;
  crtMaterial: THREE.ShaderMaterial;
  springs: {
    yaw: Spring;
    pitch: Spring;
    roll: Spring;
    tx: Spring;
    ty: Spring;
    button: Spring;
  };
  smooth: { warm: number; gain: number; spill: number };
  lastSeq: number;
  lastLabel: string;
  /** Phase offsets so the two units' idle drifts never line up. */
  phase: number;
}

/**
 * CRT RIG
 * =======
 *
 * The root of the scene, and the ONLY thing in the feature that writes to
 * a transform, a uniform or a material property at frame rate.
 *
 * TWO MACHINES, ONE LOOP
 * ----------------------
 * There is still exactly one `useFrame`. It steps an array of units.
 *
 * The alternative — a `useFrame` inside each unit component — would have
 * been less code and is the obvious React answer, and it is wrong here
 * for the same reason the knock is an impulse rather than a tween: the
 * moment two loops exist, their order is an implementation detail of the
 * renderer, and anything that has to be consistent between the machines
 * (the channel peer check, the shared clock the drifts are derived from,
 * the pointer sample) becomes a race that shows up as a one-frame
 * disagreement. One loop, one clock, one pointer read, both units.
 *
 * MOTION ARCHITECTURE
 * -------------------
 * One set of springs per unit. No GSAP below this line.
 *
 * That is not tidiness, it is the reason the channel-change knock works.
 * The obvious way to build it is `gsap.to(group.rotation, …)`, and it
 * looks fine until you click while moving the mouse: the tween and the
 * cursor tracking then both own `rotation.x`, and whichever writes last
 * that frame wins. The fix is not to sequence them more carefully — it is
 * to make the knock an IMPULSE, a one-off addition to the spring's
 * velocity. After that the knock and the cursor are the same motion,
 * resolved by the same integrator.
 *
 * THE TWO UNITS DO NOT MOVE ALIKE
 * -------------------------------
 * The secondary's cursor response is 46% of the primary's and its springs
 * are slower, so it trails. That difference is doing real work: two
 * objects that respond identically to the same input read as one rigid
 * body seen twice, however different they look. Parallax between them —
 * the near one leading, the far one lagging — is most of what sells them
 * as separate things standing at different distances.
 *
 * WEIGHT
 * ------
 * ζ ≈ 0.92 on the body springs: it arrives and stops. Small travel,
 * ±7.5° of yaw. And the idle float is nearly nothing — 0.008 units, about
 * one pixel — because a monitor on a desk does not bob. It exists only so
 * the scene is never perfectly frozen, which reads as a still image.
 *
 * SCROLL
 * ------
 * Nothing here reads `window.scrollY`, nothing is sticky, nothing is
 * fixed, and neither object's world transform is coupled to the
 * document's scroll position.
 */
export default function CrtRig({
  composition,
  status,
  pressed,
  idle,
  pointer,
  channel,
  motionScale,
  mobileIdle,
  mobileInteracting,
  onLabels,
}: RigProps) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  /* One set of buffers for both machines. */
  const geometry = useMemo(() => buildMonitor(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  /* Material tint is fixed at mount from the wide composition's values.
     Rebuilding materials on a breakpoint change would recompile shaders
     during a resize for a difference of five percent of one colour. */
  const primaryMaterials = useCrtMaterials(composition.primary.dim);
  const secondaryMaterials = useCrtMaterials(composition.secondary.dim);

  /* Live composition, read inside the frame loop. */
  const specs = useRef(composition);
  specs.current = composition;

  /* Refs, declared flat because hooks cannot be called in a loop. */
  const pGroup = useRef<THREE.Group | null>(null);
  const pPower = useRef<THREE.Group | null>(null);
  const pSpill = useRef<THREE.PointLight | null>(null);
  const pShadow = useRef<THREE.ShaderMaterial | null>(null);
  const sGroup = useRef<THREE.Group | null>(null);
  const sPower = useRef<THREE.Group | null>(null);
  const sSpill = useRef<THREE.PointLight | null>(null);
  const sShadow = useRef<THREE.ShaderMaterial | null>(null);

  const units = useMemo<Unit[]>(() => {
    const mkSprings = (soft: number) => ({
      yaw: new Spring(0, MOTION.rotation.stiffness * soft, MOTION.rotation.damping * soft),
      pitch: new Spring(0, MOTION.rotation.stiffness * soft, MOTION.rotation.damping * soft),
      roll: new Spring(0, MOTION.rotation.stiffness * soft, MOTION.rotation.damping * soft),
      tx: new Spring(0, MOTION.rotation.stiffness * soft, MOTION.rotation.damping * soft),
      ty: new Spring(0, MOTION.rotation.stiffness * soft, MOTION.rotation.damping * soft),
      button: new Spring(0, MOTION.button.stiffness, MOTION.button.damping),
    });

    /* The peer callbacks are wired after both systems exist, so neither
       can read a half-built object during construction. */
    let primary: ScreenSystem | null = null;
    let secondary: ScreenSystem | null = null;

    primary = new ScreenSystem({
      startIndex: 0,
      peer: () => secondary?.channel ?? -1,
    });
    /* A different dwell, not merely a different phase. Equal dwells with
       an offset stay exactly out of step forever, which is its own kind
       of mechanical; 11.3 against 9.5 never repeats inside the time
       anybody looks at a homepage. The lower repaint rate is a saving the
       smaller tube can afford — it occupies about half the pixels. */
    secondary = new ScreenSystem({
      startIndex: 2,
      dwell: 11.3,
      phase: 4.1,
      fps: 18,
      gain: composition.secondary.gain,
      peer: () => primary?.channel ?? -1,
    });

    const make = (
      materials: CrtMaterials,
      screen: ScreenSystem,
      refs: {
        group: MutableRefObject<THREE.Group | null>;
        power: MutableRefObject<THREE.Group | null>;
        spill: MutableRefObject<THREE.PointLight | null>;
        shadowMat: MutableRefObject<THREE.ShaderMaterial | null>;
      },
      softSprings: number,
      phase: number,
    ): Unit => {
      const crt = createCrtMaterial(screen.texture);
      return {
        ...refs,
        materials,
        screen,
        uniforms: crt.uniforms,
        crtMaterial: crt.material,
        springs: mkSprings(softSprings),
        smooth: { warm: 0, gain: 1, spill: 0 },
        lastSeq: -1,
        lastLabel: "",
        phase,
      };
    };

    return [
      make(
        primaryMaterials,
        primary,
        { group: pGroup, power: pPower, spill: pSpill, shadowMat: pShadow },
        1,
        0,
      ),
      /* 0.74 on stiffness and damping keeps ζ identical — it is the same
         quality of movement, just heavier and later. Changing only the
         stiffness would have made the far machine bouncier, which is
         exactly backwards. */
      make(
        secondaryMaterials,
        secondary,
        { group: sGroup, power: sPower, spill: sSpill, shadowMat: sShadow },
        0.74,
        11.7,
      ),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryMaterials, secondaryMaterials]);

  useEffect(
    () => () => {
      units.forEach((u) => {
        u.crtMaterial.dispose();
        u.screen.dispose();
      });
    },
    [units],
  );

  /**
   * SCANLINE NYQUIST GUARD
   * ----------------------
   * Scanlines below their sampling limit are not scanlines, they are
   * moiré — and on a phone the tube renders at a fraction of its desktop
   * size. So the raster's visibility is driven from how many device
   * pixels each tube actually occupies: full strength once each of the
   * 200 lines has roughly two pixels to itself, off entirely below about
   * one.
   *
   * Computed per unit, because the secondary is 70% the size and 2.1
   * units further back — it crosses the threshold on a laptop that the
   * primary clears comfortably, and giving them the same value would put
   * visible interference on exactly the machine that can least afford it.
   */
  useEffect(() => {
    /* The arrangement is roughly 6.6 units wide against a frame the fit
       solver packs to ~0.95, so one world unit is about this many device
       pixels. */
    const pxPerUnit = (size.width * dpr) / 7.4;
    units.forEach((u, i) => {
      const spec = i === 0 ? composition.primary : composition.secondary;
      const tubePx = SCREEN.h * spec.scale * pxPerUnit;
      u.uniforms.uScanFade.value = clamp((tubePx - 150) / 190, 0, 1);
    });
  }, [units, composition, size.width, dpr]);

  /* LED colour is state display, not interaction. Both machines report
     the same device state — they are one recorder, not two. */
  const tallyColor = TALLY_COLOR[status];
  units.forEach((u) => {
    u.materials.led.color.set(tallyColor);
    u.materials.led.emissive.set(tallyColor);
  });

  const smoothProximity = useRef(0);
  const mobileIdlePausedUntil = useRef(0);
  /* Rig-level, not per-unit: the touch drift is one behaviour applied to
     the whole arrangement, so the tap that pauses it has to be observed
     once rather than once per machine. */
  const rigSeq = useRef(-1);

  useFrame((state, rawDelta) => {
    // A tab that has been backgrounded hands back a delta of many seconds.
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    const signal = channel.current;
    const f = pointer.current;
    const active = f.active ? 1 : 0;

    /* Proximity is eased, not sprung: an overshoot here would push the
       glass highlight past its authored maximum. */
    smoothProximity.current = damp(smoothProximity.current, f.proximity * active, 6, dt);
    const prox = smoothProximity.current;

    /* Touch-only sweep, paused while a finger is down and for a beat after
       a tap, so the objects are not drifting under the user's own gesture. */
    if (rigSeq.current === -1) {
      rigSeq.current = signal.seq;
    } else if (signal.seq !== rigSeq.current) {
      rigSeq.current = signal.seq;
      // Settle the automatic drift for a beat after a tap, so the knock
      // is not competing with a sweep the user did not ask for.
      mobileIdlePausedUntil.current = t + 1.4;
    }

    let touchYaw = 0;
    if (mobileIdle && idle) {
      if (mobileInteracting.current) mobileIdlePausedUntil.current = t + 0.8;
      const gate = t > mobileIdlePausedUntil.current ? 1 : 0;
      touchYaw = Math.sin(t * MOBILE_IDLE_SPEED) * MOBILE_IDLE_YAW * motionScale * gate;
    }

    for (let i = 0; i < units.length; i += 1) {
      const u = units[i];
      const group = u.group.current;
      if (!group) continue;
      /* Read live rather than captured: the composition swaps at the
         breakpoint, and rebuilding the units for that would throw away
         two canvases, two textures and both channel schedules mid-cycle. */
      const spec = i === 0 ? specs.current.primary : specs.current.secondary;
      const primary = i === 0;

      /* ---------------------------------------------- channel input -- */
      let bumped = false;
      if (u.lastSeq === -1) {
        u.lastSeq = signal.seq;
      } else if (signal.seq !== u.lastSeq) {
        u.lastSeq = signal.seq;
        /* A click is aimed at the primary. The second machine keeps its
           own schedule — it is a different piece of equipment, not a
           slave display — but it does get the physical knock, because a
           desk that one monitor is being prodded on is a desk the other
           one is standing on. */
        if (primary) {
          u.screen.bump();
          bumped = true;
        } else {
          u.springs.yaw.impulse(MOTION.knock.yaw * 0.16);
        }
      }

      /* --------------------------------------------------- the tube -- */
      const frame = u.screen.update(dt, !idle);
      u.uniforms.uTime.value = t + u.phase;
      u.uniforms.uTrans.value = frame.transition;

      if (frame.label !== u.lastLabel) {
        u.lastLabel = frame.label;
        if (onLabels) onLabels(units[0].lastLabel, units[1].lastLabel);
      }

      /* Warm-up: the raster opens out from a line, as a tube coming up
         does. The second machine comes up a beat later — two sets of
         mains-powered electronics do not agree on anything. Skipped
         entirely under reduced motion; the picture is simply there. */
      const warmRate = primary ? 3.4 : 2.3;
      u.smooth.warm = idle ? damp(u.smooth.warm, 1, warmRate, dt) : 1;
      u.uniforms.uWarm.value = Math.min(1, u.smooth.warm + 0.02);

      /* Brightness: a short dip on a channel change, on top of the
         shader's own fluctuation. Eased, not sprung — a brightness
         overshoot would read as a flash, which is different hardware
         behaviour. */
      if (frame.transition > 0.5 && u.smooth.gain > 0.9) u.smooth.gain = 0.55;
      u.smooth.gain = damp(u.smooth.gain, 1, 6, dt);
      u.uniforms.uGain.value = (idle ? u.smooth.gain : 1) * spec.gain;

      /* The tube lighting its own bezel. */
      if (u.spill.current) {
        const target = (0.28 + frame.luma * 1.35 - frame.transition * 0.2) * spec.glow;
        u.smooth.spill = damp(u.smooth.spill, Math.max(0, target), 5, dt);
        u.spill.current.intensity = u.smooth.spill;
      }

      /* The lamp. Brighter for a moment when the channel changes: on a
         real set the standby lamp does flicker when the tube re-syncs. */
      u.materials.led.emissiveIntensity =
        (1.05 + (pressed && primary ? 0.9 : 0) + frame.transition * 0.5) * (primary ? 1 : 0.8);

      /* --------------------------------------------- static branch --- */
      if (!idle) {
        group.position.set(spec.x, standY(spec.scale), spec.z);
        group.rotation.set(0, spec.yaw, spec.roll);
        if (u.shadowMat.current) u.shadowMat.current.uniforms.uLift.value = 0;
        if (u.power.current) u.power.current.position.z = CONTROLS.power.depth / 2 - 0.006;
        continue;
      }

      /* ------------------------------------------------- targets ----- */
      const ms = motionScale * spec.motion;
      const sp = u.springs;
      const ph = u.phase;

      /* Idle drift. Two incommensurate periods per channel so the loop
         never lines up with itself, plus a per-unit phase so the two
         machines never drift in sympathy — synchronised idle is the tell
         that turns two objects back into one. */
      const driftYaw =
        (Math.sin((t + ph) * 0.21) * 0.6 + Math.sin((t + ph) * 0.083) * 0.4) *
        MOTION.idle.driftYaw *
        ms;
      const driftPitch =
        (Math.sin((t + ph) * 0.17) * 0.6 + Math.sin((t + ph) * 0.061) * 0.4) *
        MOTION.idle.driftPitch *
        ms;
      const driftRoll = Math.sin((t + ph) * 0.13) * MOTION.idle.driftRoll * ms;

      sp.yaw.target = -f.x * MOTION.maxYaw * active * spec.motion + driftYaw + touchYaw * spec.motion;
      sp.pitch.target = f.y * MOTION.maxPitch * active * spec.motion + driftPitch;
      /* Roll AWAY from the cursor: a heavy object pushed sideways leans
         into the push at its base, so its top goes the other way. Very
         small — at 1.1° it is felt as weight rather than seen as a tilt. */
      sp.roll.target = -f.x * MOTION.maxRoll * active * spec.motion + driftRoll;
      sp.tx.target = f.x * MOTION.translate.x * active * spec.motion;
      sp.ty.target = -f.y * MOTION.translate.y * active * spec.motion;

      if (bumped) {
        sp.pitch.impulse(MOTION.knock.pitch);
        sp.yaw.impulse(MOTION.knock.yaw);
        sp.button.snap(0);
        sp.button.impulse(2.6);
      }
      sp.button.target = pressed && primary ? MOTION.button.press : 0;

      /* ------------------------------------------------ integrate ---- */
      sp.yaw.step(dt);
      sp.pitch.step(dt);
      sp.roll.step(dt);
      sp.tx.step(dt);
      sp.ty.step(dt);
      sp.button.step(dt);

      const floatY = Math.sin((t + ph) * 0.46) * MOTION.idle.floatY * ms;
      const floatZ = Math.sin((t + ph) * 0.31) * MOTION.idle.floatZ * ms;

      group.rotation.set(sp.pitch.value, spec.yaw + sp.yaw.value, spec.roll + sp.roll.value);
      group.position.set(
        spec.x + sp.tx.value,
        standY(spec.scale) + sp.ty.value + floatY,
        spec.z + floatZ,
      );

      /* The contact shadow loosens a hair as the body rises. */
      if (u.shadowMat.current) {
        u.shadowMat.current.uniforms.uLift.value = clamp(
          MOTION.idle.floatY ? floatY / MOTION.idle.floatY : 0,
          -1,
          1,
        );
      }

      /* The power switch: a real travel along −Z, clamped so the cap can
         never sink through its own surround. */
      if (u.power.current) {
        const travel = clamp(sp.button.value, 0, MOTION.button.press * 1.6);
        u.power.current.position.z = CONTROLS.power.depth / 2 - 0.006 - travel;
      }

      /* The glass picks up more of the room as the cursor approaches.
         Modulated around the authored resting value so it cannot compound
         frame after frame, and scaled by the unit's response so the far
         machine does not light up as hard as the near one. */
      u.materials.glass.envMapIntensity = 2.7 + prox * 0.55 * spec.motion;
    }
  });

  const p = composition.primary;
  const s = composition.secondary;

  return (
    <>
      <Lighting />

      {/* Shadows are siblings of the units, not children: they belong to
          the desk, not to the objects, so they must not inherit a unit's
          scale, pitch or float. Each is placed under its own machine and
          given that machine's yaw, so the pool turns with the body. */}
      <ContactShadow
        materialRef={pShadow}
        position={[p.x, 0, p.z]}
        rotationY={p.yaw}
        scale={p.scale}
        strength={p.shadow}
      />
      <ContactShadow
        materialRef={sShadow}
        position={[s.x, 0, s.z]}
        rotationY={s.yaw}
        scale={s.scale}
        strength={s.shadow}
        /* Further away and smaller: its contact reads softer and its pool
           spreads. */
        softness={1.35}
      />

      <group ref={pGroup} position={[p.x, standY(p.scale), p.z]} rotation={[0, p.yaw, p.roll]}>
        <group scale={p.scale}>
          <CrtUnit
            geometry={geometry}
            materials={primaryMaterials}
            crtMaterial={units[0].crtMaterial}
            powerRef={pPower}
            spillRef={pSpill}
          />
        </group>
      </group>

      <group ref={sGroup} position={[s.x, standY(s.scale), s.z]} rotation={[0, s.yaw, s.roll]}>
        <group scale={s.scale}>
          <CrtUnit
            geometry={geometry}
            materials={secondaryMaterials}
            crtMaterial={units[1].crtMaterial}
            powerRef={sPower}
            spillRef={sSpill}
            spillDistance={2.3}
          />
        </group>
      </group>
    </>
  );
}
