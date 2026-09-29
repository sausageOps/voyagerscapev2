"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * MATERIAL SET
 * ============
 *
 * One memoised set per Canvas, shared by every mesh, disposed on unmount.
 *
 * Stage 1B direction notes:
 *
 *  - Four clearly separated surface families, because "looks like a designed
 *    object" is mostly a materials problem: painted casting (shell/deck),
 *    moulded rubber (grip, focus ring), machined metal (collars, rings,
 *    hardware), and glass. Stage 1 had metal and paint sitting at similar
 *    roughness, so the parts blended into one mass.
 *  - Rubber is the new one and it earns its place: roughness 0.95 with almost
 *    no environment response, which reads as genuinely soft next to the
 *    satin barrel sections and stops the lens being one black cylinder.
 *  - The shell is deliberately mid-roughness. Anything shinier reads as cheap
 *    injection-moulded plastic; the target is a warm painted finish showing a
 *    broad soft gradient rather than a hard highlight.
 *  - Glass is dark and mostly specular. The iridescence is now a whisper
 *    (0.18, down from 0.7): at hero size the stronger setting tinted the
 *    whole element and made the aperture behind it read as a cut gemstone
 *    rather than as blades seen through coated glass.
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
  shadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function useCameraMaterials(shadowMap: THREE.Texture | null): CameraMaterials {
  const materials = useMemo<CameraMaterials>(() => {
    /* ------------------------------------------------ painted castings ---- */

    const shell = new THREE.MeshStandardMaterial({
      // Tightened from 0.52. The bevels are the whole reason this does not
      // read as a box, and at higher roughness their highlight spread so
      // wide that the edges went soft and the form went with them.
      color: PALETTE.shell,
      roughness: 0.46,
      metalness: 0.04,
      envMapIntensity: 0.82,
    });

    // The top plate is a separate casting, so it is allowed to be very
    // slightly brighter and smoother than the body. That difference plus the
    // seam groove is what sells the two-part construction.
    const deck = new THREE.MeshStandardMaterial({
      color: PALETTE.deck,
      roughness: 0.4,
      metalness: 0.06,
      envMapIntensity: 0.92,
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

    const leather = new THREE.MeshStandardMaterial({
      color: PALETTE.leather,
      roughness: 0.84,
      metalness: 0.0,
      envMapIntensity: 0.38,
    });

    const rubber = new THREE.MeshStandardMaterial({
      // Slightly more environment than a real rubber would take. The grip
      // and the focus ring sit ON dark leatherette, and at 0.16 they were
      // value-identical to it — three different parts reading as one black
      // shape. The chamfers need something to catch.
      color: PALETTE.rubber,
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.32,
    });

    /* --------------------------------------------------------- metal ------ */

    const satin = new THREE.MeshStandardMaterial({
      color: PALETTE.satin,
      roughness: 0.46,
      metalness: 0.62,
      envMapIntensity: 0.8,
    });

    const bezel = new THREE.MeshStandardMaterial({
      color: PALETTE.bezel,
      roughness: 0.36,
      metalness: 0.62,
      envMapIntensity: 0.85,
    });

    const trim = new THREE.MeshStandardMaterial({
      color: PALETTE.metalBright,
      roughness: 0.24,
      metalness: 0.78,
      envMapIntensity: 1.0,
    });

    const metalDark = new THREE.MeshStandardMaterial({
      color: PALETTE.metalDark,
      roughness: 0.38,
      metalness: 0.74,
      envMapIntensity: 0.72,
    });

    const metalMid = new THREE.MeshStandardMaterial({
      color: PALETTE.metalMid,
      roughness: 0.3,
      metalness: 0.8,
      envMapIntensity: 1.0,
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
      roughness: 0.34,
      metalness: 0.64,
      envMapIntensity: 0.85,
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
      // so the specular has to be driven HARD to survive being halved — at
      // 1.5 the element reflected the studio horizon as a barely-there grey
      // smear. Pushing the environment rather than the opacity keeps the
      // iris visible behind the glass, which is the whole point of it.
      envMapIntensity: 3.0,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    // Second element, concave, sitting behind the front one. Two curved
    // surfaces at different depths give two separate catchlights, and two
    // catchlights at different depths is what actually reads as "there is
    // glass in there" rather than "the hole has a shiny lid". Kept very
    // transparent so the iris behind it still reads.
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

    const shadow = new THREE.MeshBasicMaterial({
      color: PALETTE.shadow,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      alphaMap: shadowMap ?? undefined,
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
      shadow,
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
      shadow,
      dispose: () => all.forEach((m) => m.dispose()),
    };
  }, [shadowMap]);

  useEffect(() => () => materials.dispose(), [materials]);

  return materials;
}
