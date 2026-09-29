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
 * Direction notes:
 *  - The shell is deliberately mid-roughness (0.5+). Anything shinier reads as
 *    cheap injection-moulded plastic; the target is a warm painted/anodised
 *    finish that shows a broad soft gradient rather than a hard highlight.
 *  - Metal is restrained: only the collars, rings and detents are metallic,
 *    and their `envMapIntensity` is held down so nothing mirrors.
 *  - The glass is dark, not clear. Depth comes from a clearcoat highlight and
 *    a whisper of iridescence in the brand lavender, NOT from transmission —
 *    `transmission` costs an extra render pass per frame and buys nothing here.
 */
export interface CameraMaterials {
  shell: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  seam: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  metalMid: THREE.MeshStandardMaterial;
  metalBright: THREE.MeshStandardMaterial;
  lensBody: THREE.MeshStandardMaterial;
  lensInner: THREE.MeshStandardMaterial;
  lensStop: THREE.MeshStandardMaterial;
  blade: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  darkGlass: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  tally: THREE.MeshStandardMaterial;
  shadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function useCameraMaterials(shadowMap: THREE.Texture | null): CameraMaterials {
  const materials = useMemo<CameraMaterials>(() => {
    const shell = new THREE.MeshStandardMaterial({
      color: PALETTE.shell,
      roughness: 0.5,
      metalness: 0.04,
      envMapIntensity: 0.75,
    });

    const deck = new THREE.MeshStandardMaterial({
      color: PALETTE.deck,
      roughness: 0.4,
      metalness: 0.08,
      envMapIntensity: 0.9,
    });

    const leather = new THREE.MeshStandardMaterial({
      color: PALETTE.leather,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.35,
    });

    const seam = new THREE.MeshStandardMaterial({
      color: PALETTE.metalBright,
      roughness: 0.3,
      metalness: 0.7,
      envMapIntensity: 0.9,
    });

    const metalDark = new THREE.MeshStandardMaterial({
      color: PALETTE.metalDark,
      roughness: 0.4,
      metalness: 0.72,
      envMapIntensity: 0.7,
    });

    const metalMid = new THREE.MeshStandardMaterial({
      color: PALETTE.metalMid,
      roughness: 0.28,
      metalness: 0.82,
      envMapIntensity: 1.05,
    });

    const metalBright = new THREE.MeshStandardMaterial({
      color: PALETTE.metalBright,
      roughness: 0.26,
      metalness: 0.85,
      envMapIntensity: 0.95,
    });

    const lensBody = new THREE.MeshStandardMaterial({
      color: PALETTE.lensBody,
      roughness: 0.38,
      metalness: 0.6,
      envMapIntensity: 0.8,
    });

    // Not pure black: a lens interior that renders as #000 reads as a hole
    // punched in the object. A very dark blue-grey with a little environment
    // keeps the barrel legible as a tube with a far end.
    const lensInner = new THREE.MeshStandardMaterial({
      color: "#15181d",
      roughness: 0.78,
      metalness: 0.12,
      envMapIntensity: 0.35,
      side: THREE.BackSide,
    });

    // Blued steel rather than black, so the seven blades actually read as
    // seven blades through the glass.
    // Rear stop of the bore, facing the viewer. Deep but not black.
    const lensStop = new THREE.MeshStandardMaterial({
      color: "#0e1116",
      roughness: 0.62,
      metalness: 0.25,
      envMapIntensity: 0.55,
    });

    const blade = new THREE.MeshStandardMaterial({
      color: "#252b34",
      roughness: 0.34,
      metalness: 0.72,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    });

    // Dark coated glass. The depth cue is the specular crescent the dome
    // catches off the environment's horizon strip, plus a whisper of
    // iridescence in the brand lavender — NOT transmission, which would cost
    // an extra render pass per frame for no visible gain at this size.
    const glass = new THREE.MeshPhysicalMaterial({
      color: PALETTE.glass,
      roughness: 0.035,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.7,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [180, 620],
      envMapIntensity: 2.6,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const darkGlass = new THREE.MeshStandardMaterial({
      color: "#161c22",
      roughness: 0.16,
      metalness: 0.3,
      envMapIntensity: 1.0,
    });

    const pink = new THREE.MeshStandardMaterial({
      color: PALETTE.pink,
      roughness: 0.34,
      metalness: 0.05,
      envMapIntensity: 0.8,
    });

    const yellow = new THREE.MeshStandardMaterial({
      color: PALETTE.yellow,
      roughness: 0.42,
      metalness: 0.1,
      envMapIntensity: 0.7,
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
      leather,
      seam,
      metalDark,
      metalMid,
      metalBright,
      lensBody,
      lensInner,
      lensStop,
      blade,
      glass,
      darkGlass,
      pink,
      yellow,
      tally,
      shadow,
    ];

    return {
      shell,
      deck,
      leather,
      seam,
      metalDark,
      metalMid,
      metalBright,
      lensBody,
      lensInner,
      lensStop,
      blade,
      glass,
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
