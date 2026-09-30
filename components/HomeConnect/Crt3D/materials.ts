"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CRT } from "./palette";

/**
 * MATERIALS
 * =========
 *
 * One memoised set, disposed on unmount. Restrained industrial finishes:
 * matte bone shell, satin graphite recesses, a little brass on the signature.
 * No chrome, no RGB.
 */
export interface CrtMaterials {
  shell: THREE.MeshStandardMaterial;
  shellDeep: THREE.MeshStandardMaterial;
  bezel: THREE.MeshStandardMaterial;
  bezelInner: THREE.MeshStandardMaterial;
  graphite: THREE.MeshStandardMaterial;
  graphiteSoft: THREE.MeshStandardMaterial;
  satin: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  brassBright: THREE.MeshStandardMaterial;
  knobCap: THREE.MeshStandardMaterial;
  buttonPink: THREE.MeshStandardMaterial;
  buttonYellow: THREE.MeshStandardMaterial;
  ledPink: THREE.MeshStandardMaterial;
  ledYellow: THREE.MeshStandardMaterial;
  ledGreen: THREE.MeshStandardMaterial;
  phosphor: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  readout: THREE.MeshStandardMaterial;
  readoutGlass: THREE.MeshPhysicalMaterial;
  sphere: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function useCrtMaterials(): CrtMaterials {
  const materials = useMemo<CrtMaterials>(() => {
    const shell = new THREE.MeshStandardMaterial({
      color: CRT.shell,
      roughness: 0.62,
      metalness: 0.04,
      envMapIntensity: 0.72,
    });
    const shellDeep = new THREE.MeshStandardMaterial({
      color: CRT.shellDeep,
      roughness: 0.66,
      metalness: 0.04,
      envMapIntensity: 0.66,
    });
    const bezel = new THREE.MeshStandardMaterial({
      color: CRT.bezel,
      roughness: 0.5,
      metalness: 0.16,
      envMapIntensity: 0.55,
    });
    const bezelInner = new THREE.MeshStandardMaterial({
      color: CRT.bezelInner,
      roughness: 0.85,
      metalness: 0.05,
      envMapIntensity: 0.25,
    });
    const graphite = new THREE.MeshStandardMaterial({
      color: CRT.graphite,
      roughness: 0.55,
      metalness: 0.22,
      envMapIntensity: 0.5,
    });
    const graphiteSoft = new THREE.MeshStandardMaterial({
      color: CRT.graphiteSoft,
      roughness: 0.6,
      metalness: 0.16,
      envMapIntensity: 0.5,
    });
    const satin = new THREE.MeshStandardMaterial({
      color: CRT.satin,
      roughness: 0.42,
      metalness: 0.6,
      envMapIntensity: 0.85,
    });
    const metalDark = new THREE.MeshStandardMaterial({
      color: CRT.metalDark,
      roughness: 0.4,
      metalness: 0.7,
      envMapIntensity: 0.75,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: CRT.brass,
      roughness: 0.36,
      metalness: 0.82,
      envMapIntensity: 1.0,
    });
    const brassBright = new THREE.MeshStandardMaterial({
      color: CRT.brassBright,
      roughness: 0.26,
      metalness: 0.88,
      envMapIntensity: 1.1,
    });
    const knobCap = new THREE.MeshStandardMaterial({
      color: CRT.graphiteSoft,
      roughness: 0.44,
      metalness: 0.5,
      envMapIntensity: 0.8,
    });
    const buttonPink = new THREE.MeshStandardMaterial({
      color: CRT.pink,
      roughness: 0.4,
      metalness: 0.06,
      envMapIntensity: 0.7,
    });
    const buttonYellow = new THREE.MeshStandardMaterial({
      color: CRT.yellow,
      roughness: 0.42,
      metalness: 0.06,
      envMapIntensity: 0.68,
    });

    const led = (c: string) =>
      new THREE.MeshStandardMaterial({
        color: c,
        emissive: new THREE.Color(c),
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.0,
      });
    const ledPink = led(CRT.pink);
    const ledYellow = led(CRT.yellow);
    const ledGreen = led(CRT.green);

    // Phosphor face: dark glass whose emissive is driven by the screen canvas.
    const phosphor = new THREE.MeshStandardMaterial({
      color: "#04060a",
      roughness: 0.5,
      metalness: 0.0,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 1.0,
      envMapIntensity: 0.2,
    });

    // Curved glass overlay — the reflective front of the tube.
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#0a0d12",
      roughness: 0.08,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.22,
      envMapIntensity: 1.6,
      depthWrite: false,
    });

    const readout = new THREE.MeshStandardMaterial({
      color: "#040404",
      roughness: 0.6,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 1.0,
      metalness: 0.0,
      envMapIntensity: 0.2,
    });
    const readoutGlass = new THREE.MeshPhysicalMaterial({
      color: "#050505",
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.2,
      envMapIntensity: 1.2,
      depthWrite: false,
    });

    const sphere = new THREE.MeshStandardMaterial({
      color: CRT.sphere,
      emissive: new THREE.Color(CRT.lavender),
      emissiveIntensity: 0.9,
      roughness: 0.28,
      metalness: 0.0,
      envMapIntensity: 0.6,
    });

    const all: THREE.Material[] = [
      shell,
      shellDeep,
      bezel,
      bezelInner,
      graphite,
      graphiteSoft,
      satin,
      metalDark,
      brass,
      brassBright,
      knobCap,
      buttonPink,
      buttonYellow,
      ledPink,
      ledYellow,
      ledGreen,
      phosphor,
      glass,
      readout,
      readoutGlass,
      sphere,
    ];

    return {
      shell,
      shellDeep,
      bezel,
      bezelInner,
      graphite,
      graphiteSoft,
      satin,
      metalDark,
      brass,
      brassBright,
      knobCap,
      buttonPink,
      buttonYellow,
      ledPink,
      ledYellow,
      ledGreen,
      phosphor,
      glass,
      readout,
      readoutGlass,
      sphere,
      dispose: () => all.forEach((m) => m.dispose()),
    };
  }, []);

  useEffect(() => () => materials.dispose(), [materials]);

  return materials;
}
