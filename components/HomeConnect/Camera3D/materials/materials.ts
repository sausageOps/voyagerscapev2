"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";
import { createCameraTextures } from "./texture";

/**
 * MATERIAL SET
 * ============
 *
 * One memoised set per Canvas, shared by every mesh, disposed on unmount.
 *
 * Surface families, because "looks like a designed object" is mostly a
 * materials problem:
 *
 *  - painted castings (shell/deck) — mid-roughness cream with a soft
 *    procedural blotch in the roughness channel: a finish, not a flat value
 *  - moulded rubber (grip, gasket, focus ring) — matte, fine bump grain
 *  - leatherette — dark, with real speckle grain in the bump channel
 *  - turned metals (barrel bands, collars) — circumferential brushing in
 *    the roughness channel, so the lathe surfaces read as machined
 *  - glass — unchanged from Stage 2: dark, mostly specular, driven live by
 *    the rig through envMapIntensity
 *
 * Amplitude discipline (see texture.ts): the maps modulate roughness by
 * ±10% of base and bump by thousandths of a unit. Nothing here trends
 * glossy — the body stays premium-matte.
 *
 * LOCKED SURFACES: glass, glassInner, darkGlass, pink, yellow and tally are
 * byte-for-byte the Stage 2 materials — the rig mutates glass/glassInner
 * envMapIntensity and tally colour/emissive every frame, and the flash read
 * depends on their exact response.
 */
export interface CameraMaterials {
  shell: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  seamGap: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  satin: THREE.MeshStandardMaterial;
  bezel: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  metalMid: THREE.MeshStandardMaterial;
  metalBright: THREE.MeshStandardMaterial;
  lensBody: THREE.MeshStandardMaterial;
  lensInner: THREE.MeshStandardMaterial;
  lensStop: THREE.MeshStandardMaterial;
  blade: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  glassInner: THREE.MeshPhysicalMaterial;
  darkGlass: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  tally: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function useCameraMaterials(): CameraMaterials {
  const materials = useMemo<CameraMaterials>(() => {
    const tex = createCameraTextures();

    /* ------------------------------------------------ painted castings ---- */

    const shell = new THREE.MeshStandardMaterial({
      // Base sits slightly high; the noise map (0.84–1.0) pulls the working
      // range down to ~0.44–0.52, so the bevels still catch the key light
      // while the flats pick up a soft finish variation.
      color: PALETTE.shell,
      roughness: 0.52,
      metalness: 0.04,
      envMapIntensity: 0.82,
      roughnessMap: tex.shellNoise,
    });

    // The top plate is a separate casting, very slightly brighter and
    // smoother than the body, on a different noise seed.
    const deck = new THREE.MeshStandardMaterial({
      color: PALETTE.deck,
      roughness: 0.48,
      metalness: 0.06,
      envMapIntensity: 0.92,
      roughnessMap: tex.deckNoise,
    });

    // Sits inside the top-plate step. Matte and unlit-ish so it reads as a
    // shadowed gap rather than a painted stripe.
    const seamGap = new THREE.MeshStandardMaterial({
      color: PALETTE.seamGap,
      roughness: 0.98,
      metalness: 0.0,
      envMapIntensity: 0.18,
    });

    /* ---------------------------------------------------------- soft ------ */

    // Leatherette: the grain lives in the bump channel so it reads in the
    // catchlights, and the roughness stays uniformly high.
    const leather = new THREE.MeshStandardMaterial({
      color: PALETTE.leather,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.38,
      bumpMap: tex.leatherGrain,
      bumpScale: 0.006,
    });

    const rubber = new THREE.MeshStandardMaterial({
      // Slightly more environment than a real rubber would take. The grip,
      // gasket and focus ring sit ON dark surfaces, and at 0.16 they were
      // value-identical to them — the chamfers need something to catch.
      color: PALETTE.rubber,
      roughness: 0.9,
      metalness: 0.0,
      envMapIntensity: 0.32,
      bumpMap: tex.rubberGrain,
      bumpScale: 0.003,
    });

    /* --------------------------------------------------------- metal ------ */

    const satin = new THREE.MeshStandardMaterial({
      color: PALETTE.satin,
      roughness: 0.46,
      metalness: 0.62,
      envMapIntensity: 0.8,
      roughnessMap: tex.metalStreak,
    });

    const bezel = new THREE.MeshStandardMaterial({
      color: PALETTE.bezel,
      roughness: 0.36,
      metalness: 0.62,
      envMapIntensity: 0.85,
      roughnessMap: tex.metalStreak,
    });

    const trim = new THREE.MeshStandardMaterial({
      color: PALETTE.metalBright,
      roughness: 0.24,
      metalness: 0.78,
      envMapIntensity: 1.0,
    });

    const metalDark = new THREE.MeshStandardMaterial({
      color: PALETTE.metalDark,
      roughness: 0.4,
      metalness: 0.74,
      envMapIntensity: 0.72,
      roughnessMap: tex.metalStreak,
    });

    const metalMid = new THREE.MeshStandardMaterial({
      color: PALETTE.metalMid,
      roughness: 0.32,
      metalness: 0.8,
      envMapIntensity: 1.0,
      roughnessMap: tex.metalStreak,
    });

    const metalBright = new THREE.MeshStandardMaterial({
      color: PALETTE.metalBright,
      roughness: 0.22,
      metalness: 0.86,
      envMapIntensity: 1.05,
    });

    /* ---------------------------------------------------------- lens ------ */

    const lensBody = new THREE.MeshStandardMaterial({
      color: PALETTE.lensBody,
      roughness: 0.38,
      metalness: 0.64,
      envMapIntensity: 0.85,
      roughnessMap: tex.metalStreak,
    });

    // Not pure black: a lens interior that renders as #000 reads as a hole
    // punched in the object. A very dark blue-grey with a little environment
    // keeps the barrel legible as a tube with a far end.
    const lensInner = new THREE.MeshStandardMaterial({
      color: "#15181d",
      roughness: 0.8,
      metalness: 0.1,
      envMapIntensity: 0.32,
      side: THREE.BackSide,
    });

    // Rear stop of the bore, facing the viewer. Deep but not black.
    const lensStop = new THREE.MeshStandardMaterial({
      color: "#0d1015",
      roughness: 0.66,
      metalness: 0.22,
      envMapIntensity: 0.5,
    });

    // Blued steel rather than black, so the seven blades actually read as
    // seven blades through the glass.
    const blade = new THREE.MeshStandardMaterial({
      color: "#3b4450",
      roughness: 0.34,
      metalness: 0.55,
      envMapIntensity: 0.95,
      side: THREE.DoubleSide,
    });

    // Dark coated glass. The depth cue is the specular crescent the dome
    // catches off the environment's horizon strip — NOT transmission, which
    // would cost an extra render pass per frame for no visible gain here.
    // UNCHANGED from Stage 2 — the rig drives envMapIntensity live.
    const glass = new THREE.MeshPhysicalMaterial({
      color: PALETTE.glass,
      roughness: 0.03,
      metalness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.18,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [180, 500],
      // A transparent surface blends opacity*shaded + (1-opacity)*background,
      // so the specular has to be driven HARD to survive being halved.
      // Pushing the environment rather than the opacity keeps the iris
      // visible behind the glass, which is the whole point of it.
      envMapIntensity: 3.0,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    // Second element, concave, sitting behind the front one. Two curved
    // surfaces at different depths give two separate catchlights, and two
    // catchlights at different depths is what actually reads as "there is
    // glass in there". UNCHANGED from Stage 2.
    const glassInner = new THREE.MeshPhysicalMaterial({
      color: "#0e141b",
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.4,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const darkGlass = new THREE.MeshStandardMaterial({
      color: "#161c22",
      roughness: 0.14,
      metalness: 0.3,
      envMapIntensity: 1.05,
    });

    /* -------------------------------------------------------- accents ----- */

    const pink = new THREE.MeshStandardMaterial({
      color: PALETTE.pink,
      roughness: 0.32,
      metalness: 0.05,
      envMapIntensity: 0.82,
    });

    const yellow = new THREE.MeshStandardMaterial({
      color: PALETTE.yellow,
      roughness: 0.4,
      metalness: 0.1,
      envMapIntensity: 0.72,
    });

    const tally = new THREE.MeshStandardMaterial({
      color: PALETTE.tallyIdle,
      roughness: 0.3,
      metalness: 0.0,
      emissive: new THREE.Color(PALETTE.tallyIdle),
      emissiveIntensity: 0.25,
    });

    const all: THREE.Material[] = [
      shell,
      deck,
      seamGap,
      leather,
      rubber,
      satin,
      bezel,
      trim,
      metalDark,
      metalMid,
      metalBright,
      lensBody,
      lensInner,
      lensStop,
      blade,
      glass,
      glassInner,
      darkGlass,
      pink,
      yellow,
      tally,
    ];

    return {
      shell,
      deck,
      seamGap,
      leather,
      rubber,
      satin,
      bezel,
      trim,
      metalDark,
      metalMid,
      metalBright,
      lensBody,
      lensInner,
      lensStop,
      blade,
      glass,
      glassInner,
      darkGlass,
      pink,
      yellow,
      tally,
      dispose: () => {
        all.forEach((m) => m.dispose());
        tex.dispose();
      },
    };
  }, []);

  useEffect(() => () => materials.dispose(), [materials]);

  return materials;
}
