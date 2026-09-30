"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";
import { createPlasticRoughness, createRoomReflection } from "./env";
import { createGlassMaterial } from "./glass";

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
  shell: THREE.MeshPhysicalMaterial;
  shellRear: THREE.MeshPhysicalMaterial;
  bezel: THREE.MeshPhysicalMaterial;
  bezelInner: THREE.MeshStandardMaterial;
  seam: THREE.MeshStandardMaterial;
  vent: THREE.MeshStandardMaterial;
  button: THREE.MeshStandardMaterial;
  buttonPower: THREE.MeshStandardMaterial;
  buttonWell: THREE.MeshStandardMaterial;
  tubeMask: THREE.MeshStandardMaterial;
  glass: THREE.ShaderMaterial;
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
    /**
     * ONE ROUGHNESS TEXTURE, THREE MOULDINGS.
     *
     * The three shell parts share a single 256px noise upload and differ
     * only in how it is tiled. `clone()` shares the texture's `source`,
     * so this is one GPU upload with three sets of sampler parameters —
     * and because the tiling differs, the front bezel, the body and the
     * back shell do not repeat the same blotch pattern at the same
     * scale, which is the thing that makes a shared map read as one
     * uniform surface wrapped around everything.
     *
     * Centred near 1.0 on purpose: three MULTIPLIES `roughness` by this
     * channel. The previous map sat at 0.66, which quietly turned every
     * authored roughness into two thirds of itself — the shell was
     * running at an effective 0.51 while claiming 0.78.
     */
    const rough = createPlasticRoughness({ centre: 0.93, spread: 0.075 });
    const tiled = (u: number, ox = 0, oy = 0) => {
      if (!rough) return undefined;
      const t = rough.clone();
      t.repeat.set(u, u);
      t.offset.set(ox, oy);
      t.needsUpdate = true;
      return t;
    };
    /* Contrast falls faster than value with distance, so the dimming is
       applied at 0.62 strength to the already-dark parts — otherwise the
       buttons and vents wash out before the shell does and the unit goes
       flat. */
    const tint = (hex: string, soft = 1) => toward(hex, PALETTE.page, dim * soft);
    const env = (v: number) => v * (1 - dim * 0.45);

    /* ------------------------------------------------------- shell ------ */

    /**
     * MOULDED ABS
     * ===========
     *
     * Three things make a matte cream object read as plastic rather than
     * as a flat fill, and only one of them is the colour.
     *
     * 1. THE ROOM DOES THE MODELLING. `envMapIntensity` went from 0.34
     *    to 0.53 — a 56% increase, landed by measuring the object's
     *    histogram rather than by eye; past about 0.6 the top deck and
     *    the base start clamping to white again and the gain is thrown
     *    away. The studio environment is a vertical gradient — bright
     *    ceiling, dark floor — with a window and an overhead softbox in
     *    it, so a matte dielectric sampling it gets "up-facing surfaces
     *    brighter, down-facing darker, sides in between" for free, and
     *    gets it as a smooth gradient across a curved bevel rather than
     *    as a Lambert step between two flat planes. This is by far the
     *    biggest single contributor, and it is the one the first pass was
     *    starving: at 0.34 the plastic was lit almost entirely by six
     *    directional lamps, which is why it looked like six flat tones.
     *
     * 2. A BROAD SPECULAR LOBE. Old ABS is matte but it is not Lambert —
     *    it has a wide, weak sheen that slides across the surface as the
     *    object turns. `specularIntensity` is held well below the
     *    dielectric default so it stays a suggestion, not a shine.
     *
     * 3. SHEEN, at a very low amount. This is the retroreflective
     *    brightening at grazing angles that every piece of moulded
     *    plastic has, and it is specifically what makes the ROUNDED
     *    CORNERS catch light — the brief's bevel requirement. A corner
     *    is grazing from almost every viewpoint, so sheen lights it from
     *    whatever direction the object happens to be facing, which a
     *    specular highlight cannot do on its own.
     *
     * The fourth thing it must NOT have is gloss. Effective roughness
     * stays between 0.55 and 0.73 across the three mouldings — matte
     * enough that no light source ever resolves into a hard reflection.
     */
    const shell = new THREE.MeshPhysicalMaterial({
      color: tint(PALETTE.shell),
      roughness: 0.66,
      metalness: 0.0,
      envMapIntensity: env(0.53),
      roughnessMap: tiled(5),
      specularIntensity: 0.62,
      specularColor: new THREE.Color("#fffaf0"),
      sheen: 0.16,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color("#fff6e6"),
    });

    /* The back shell is the roughest of the three and tiled coarsest.
       On real sets it was the same resin in a more heavily textured tool,
       because nobody looks at the back — and giving it a visibly
       different finish is most of what stops the body reading as one
       continuous moulding. */
    const shellRear = new THREE.MeshPhysicalMaterial({
      color: tint(PALETTE.shellRear),
      roughness: 0.78,
      metalness: 0.0,
      envMapIntensity: env(0.45),
      roughnessMap: tiled(3.1, 0.37, 0.11),
      specularIntensity: 0.48,
      specularColor: new THREE.Color("#fffaf0"),
      sheen: 0.13,
      sheenRoughness: 0.9,
      sheenColor: new THREE.Color("#fff6e6"),
    });

    /* The front moulding. Slightly smoother than the body — it is the face
       that was wiped every week for a decade. */
    /* The face that was wiped every week for a decade: smoothest of the
       three, finest tiling, and the strongest environment response — it
       is the surface the light actually travels across as the monitor
       turns. */
    const bezel = new THREE.MeshPhysicalMaterial({
      color: tint(PALETTE.bezel),
      roughness: 0.58,
      metalness: 0.0,
      envMapIntensity: env(0.55),
      roughnessMap: tiled(7, 0.13, 0.62),
      specularIntensity: 0.66,
      specularColor: new THREE.Color("#fffaf0"),
      sheen: 0.18,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color("#fff6e6"),
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
    /* The tube face. All of its reasoning lives in materials/glass.ts —
       it is a custom shader now rather than a PBR material, because a
       transparent PBR material welds the reflection's strength to the
       picture's opacity and the brief's final rule is that the picture
       wins. */
    const glassEnv = createRoomReflection();
    const glassPair = createGlassMaterial(glassEnv);
    const glass = glassPair.material;

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
        /* The clones share `source` with `rough`, so disposing the
           original releases the single upload; the clones' own wrappers
           are released with their materials. */
        [shell, shellRear, bezel].forEach((m) => {
          (m.roughnessMap as THREE.Texture | null)?.dispose();
        });
        rough?.dispose();
        glassEnv?.dispose();
      },
    };
  }, [dim]);

  useEffect(() => () => materials.dispose(), [materials]);

  return materials;
}
