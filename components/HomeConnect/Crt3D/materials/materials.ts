"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";
import { createPlasticRoughness } from "./env";

/**
 * MATERIAL SET
 * ============
 *
 * One instance of each, created once per mount and shared by every mesh that
 * uses it. The object is welded by material (see geometry/shapes.ts), so the
 * count here is also very nearly the draw-call count.
 *
 * The governing rule for a 1990s monitor: NOTHING is glossy. Consumer ABS of
 * the period was a satin-to-matte moulding, roughness 0.7 and up. The only
 * surfaces allowed a real specular are the tube face, the LED lens and the
 * tiny chamfers on the buttons. Get that wrong and the object immediately
 * reads as a modern rendering of a monitor rather than a monitor.
 *
 * Roughness VARIATION is what sells it, though, so every shell material
 * shares one procedural roughness map (fine pebble + moulding blotch) at
 * different repeats. A uniformly-rough surface is as synthetic-looking as a
 * uniformly-smooth one.
 */
export interface CrtMaterials {
  shell: THREE.MeshStandardMaterial;
  shellRear: THREE.MeshStandardMaterial;
  bezel: THREE.MeshStandardMaterial;
  bezelInner: THREE.MeshStandardMaterial;
  seam: THREE.MeshStandardMaterial;
  vent: THREE.MeshStandardMaterial;
  button: THREE.MeshStandardMaterial;
  buttonPower: THREE.MeshStandardMaterial;
  buttonWell: THREE.MeshStandardMaterial;
  tubeMask: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  led: THREE.MeshStandardMaterial;
  ledLens: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

/**
 * ATMOSPHERIC PERSPECTIVE, DONE AS MATERIAL
 * -----------------------------------------
 * `dim` pulls every shell colour a fraction of the way toward the page
 * cream and trims the environment response with it. It is how the second
 * machine reads as further away rather than merely smaller.
 *
 * Tinting toward the BACKGROUND rather than toward grey or black is the
 * whole trick. Distance does not darken an object in a lit room, it
 * washes it toward whatever is behind it — here, a cream page — and
 * lowers its contrast. Darkening would have made the secondary unit look
 * like it was standing in a shadow, which raises the question of what is
 * casting it.
 */
function toward(hex: string, target: string, k: number): THREE.Color {
  const c = new THREE.Color(hex);
  return k <= 0 ? c : c.lerp(new THREE.Color(target), k);
}

export function useCrtMaterials(dim = 0): CrtMaterials {
  const materials = useMemo<CrtMaterials>(() => {
    const rough = createPlasticRoughness();
    /* Contrast falls faster than value with distance, so the dimming is
       applied at 0.62 strength to the already-dark parts — otherwise the
       buttons and vents wash out before the shell does and the unit goes
       flat. */
    const tint = (hex: string, soft = 1) => toward(hex, PALETTE.page, dim * soft);
    const env = (v: number) => v * (1 - dim * 0.45);

    /* ------------------------------------------------------- shell ------ */

    const shell = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.shell),
      roughness: 0.78,
      metalness: 0.0,
      // Old plastic still picks up the room; it just does it very softly.
      envMapIntensity: env(0.34),
      roughnessMap: rough ?? undefined,
    });

    const shellRear = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.shellRear),
      roughness: 0.84,
      metalness: 0.0,
      envMapIntensity: env(0.26),
      roughnessMap: rough ?? undefined,
    });

    /* The front moulding. Slightly smoother than the body — it is the face
       that was wiped every week for a decade. */
    const bezel = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.bezel),
      roughness: 0.7,
      metalness: 0.0,
      envMapIntensity: env(0.4),
      roughnessMap: rough ?? undefined,
    });

    const bezelInner = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.bezelInner, 0.62),
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: env(0.16),
      side: THREE.DoubleSide,
    });

    const seam = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.seam, 0.62),
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: env(0.1),
    });

    const vent = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.vent, 0.5),
      roughness: 0.97,
      metalness: 0.0,
      envMapIntensity: env(0.06),
      side: THREE.DoubleSide,
    });

    /* ----------------------------------------------------- controls ----- */

    // Charcoal rubber/ABS. Deliberately NOT black: a true black button on a
    // cream face renders as a hole, and the chamfers that prove the button
    // has depth need a value to fall away from.
    const button = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.button, 0.5),
      roughness: 0.62,
      metalness: 0.0,
      envMapIntensity: env(0.5),
    });

    const buttonPower = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.buttonPower, 0.5),
      roughness: 0.55,
      metalness: 0.0,
      envMapIntensity: env(0.6),
    });

    // Inside of the moulded wells the buttons sit in — in shadow, matte.
    const buttonWell = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.buttonWell, 0.5),
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: env(0.12),
      side: THREE.DoubleSide,
    });

    /* --------------------------------------------------------- tube ----- */

    // The unlit border inside the aperture, around the lit phosphor area.
    const tubeMask = new THREE.MeshStandardMaterial({
      color: tint(PALETTE.tubeMask, 0.4),
      roughness: 0.42,
      metalness: 0.0,
      envMapIntensity: env(0.55),
      side: THREE.DoubleSide,
    });

    /**
     * The tube face.
     *
     * A transparent surface blends opacity·shaded + (1−opacity)·background,
     * so every optical property has to be driven hard to survive being
     * halved. The specular is what carries the whole illusion here: without
     * a visible reflection of the environment window the screen reads as a
     * printed image, no matter how good the CRT shader behind it is.
     *
     * Transmission is deliberately NOT used — it costs an extra render pass
     * per frame, and there is nothing behind this surface to see through to
     * except the emissive screen, which is already being composited by
     * blending.
     */
    const glass = new THREE.MeshPhysicalMaterial({
      color: tint(PALETTE.glass, 0.35),
      roughness: 0.055,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      // Pushing the environment rather than the opacity: the reflection has
      // to read while the game behind it stays legible.
      envMapIntensity: env(2.7),
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    const led = new THREE.MeshStandardMaterial({
      color: PALETTE.ledIdle,
      roughness: 0.3,
      metalness: 0.0,
      emissive: new THREE.Color(PALETTE.ledIdle),
      emissiveIntensity: 1.1,
    });

    // The moulded lens cap over the LED — slightly translucent, so the lamp
    // has a body rather than being a painted dot.
    const ledLens = new THREE.MeshPhysicalMaterial({
      color: "#cfd8d4",
      roughness: 0.18,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: env(1.4),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    const all: THREE.Material[] = [
      shell,
      shellRear,
      bezel,
      bezelInner,
      seam,
      vent,
      button,
      buttonPower,
      buttonWell,
      tubeMask,
      glass,
      led,
      ledLens,
    ];

    return {
      shell,
      shellRear,
      bezel,
      bezelInner,
      seam,
      vent,
      button,
      buttonPower,
      buttonWell,
      tubeMask,
      glass,
      led,
      ledLens,
      dispose: () => {
        all.forEach((m) => m.dispose());
        rough?.dispose();
      },
    };
  }, [dim]);

  useEffect(() => () => materials.dispose(), [materials]);

  return materials;
}
