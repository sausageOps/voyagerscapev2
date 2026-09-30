"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * A deliberately small material library for the creative machine. Materials
 * are shared by related parts so the scene feels like one manufactured object
 * and does not pay for a material per screw, vent, or status lamp.
 */
export interface MachineMaterials {
  shell: THREE.MeshStandardMaterial;
  shellEdge: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
  panelInset: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  scan: THREE.MeshStandardMaterial;
  lavender: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  signal: THREE.MeshStandardMaterial;
  shadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function useMachineMaterials(): MachineMaterials {
  const materials = useMemo<MachineMaterials>(() => {
    const shell = new THREE.MeshStandardMaterial({
      color: "#d9cfbc",
      roughness: 0.43,
      metalness: 0.18,
    });
    const shellEdge = new THREE.MeshStandardMaterial({
      color: "#f1e7d5",
      roughness: 0.35,
      metalness: 0.12,
    });
    const panel = new THREE.MeshStandardMaterial({
      color: "#333238",
      roughness: 0.5,
      metalness: 0.35,
    });
    const panelInset = new THREE.MeshStandardMaterial({
      color: "#17191d",
      roughness: 0.75,
      metalness: 0.14,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: "#202126",
      roughness: 0.9,
      metalness: 0.02,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: "#8f887d",
      roughness: 0.28,
      metalness: 0.76,
    });
    const metalDark = new THREE.MeshStandardMaterial({
      color: "#48474d",
      roughness: 0.32,
      metalness: 0.66,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: "#c3ae77",
      roughness: 0.32,
      metalness: 0.72,
    });
    const screen = new THREE.MeshStandardMaterial({
      color: "#142029",
      emissive: "#142029",
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.38,
    });
    const scan = new THREE.MeshStandardMaterial({
      color: "#d8ccff",
      emissive: "#b7a9ff",
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.28,
    });
    const lavender = new THREE.MeshStandardMaterial({
      color: "#d8ccff",
      roughness: 0.34,
      metalness: 0.2,
    });
    const pink = new THREE.MeshStandardMaterial({
      color: "#f1b8e4",
      emissive: "#f1b8e4",
      emissiveIntensity: 0.08,
      roughness: 0.3,
      metalness: 0.14,
    });
    const yellow = new THREE.MeshStandardMaterial({
      color: "#f3e5b5",
      emissive: "#f3e5b5",
      emissiveIntensity: 0.06,
      roughness: 0.36,
      metalness: 0.14,
    });
    const signal = new THREE.MeshStandardMaterial({
      color: "#c4b9a6",
      emissive: "#c4b9a6",
      emissiveIntensity: 0.2,
      roughness: 0.24,
      metalness: 0.1,
    });
    const shadow = new THREE.MeshBasicMaterial({
      color: "#605746",
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    });

    const all: THREE.Material[] = [
      shell,
      shellEdge,
      panel,
      panelInset,
      rubber,
      metal,
      metalDark,
      brass,
      screen,
      scan,
      lavender,
      pink,
      yellow,
      signal,
      shadow,
    ];

    return {
      shell,
      shellEdge,
      panel,
      panelInset,
      rubber,
      metal,
      metalDark,
      brass,
      screen,
      scan,
      lavender,
      pink,
      yellow,
      signal,
      shadow,
      dispose: () => all.forEach((material) => material.dispose()),
    };
  }, []);

  useEffect(() => () => materials.dispose(), [materials]);
  return materials;
}
