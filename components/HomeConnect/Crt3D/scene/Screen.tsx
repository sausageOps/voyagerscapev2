"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { CrtMaterials } from "../materials";
import { FRONT_Z, SCREEN } from "../proportions";
import { CRT } from "../palette";
import { curvedPanel, frameGeometry, roundedRectShape, extrudeCentred, bake, merge } from "../geometry";
import type { ScreenTexture } from "./screenTexture";

/**
 * SCREEN
 * ======
 *
 * Physically part of the machine: a dark bezel frame cut into the front slab,
 * a recessed hood, a convex phosphor face whose glow is driven by the screen
 * canvas texture, and a curved glass overlay that catches the environment.
 *
 * `glowRef` exposes the screen's fill light so the rig can flicker/breathe it.
 */
export default function Screen({
  materials,
  screen,
  glowRef,
  phosphorMatRef,
}: {
  materials: CrtMaterials;
  screen: ScreenTexture;
  glowRef: MutableRefObject<THREE.PointLight | null>;
  phosphorMatRef?: MutableRefObject<THREE.MeshStandardMaterial | null>;
}) {
  const cy = SCREEN.cy;

  const geo = useMemo(() => {
    // Thick bezel frame mounted PROUD of the shell face: its back sits at the
    // face (FRONT_Z), its front is proud by (bezelFront - FRONT_Z). The
    // aperture hole is where the recessed phosphor shows through.
    const bezelCenter = SCREEN.bezelFront - SCREEN.bezelDepth / 2;
    const bezel = bake(
      frameGeometry(
        SCREEN.bezelW,
        SCREEN.bezelH,
        SCREEN.bezelR,
        SCREEN.bezelR,
        SCREEN.apW,
        SCREEN.apH,
        SCREEN.apR,
        SCREEN.bezelDepth,
        0.04,
      ),
      [0, cy, bezelCenter],
    );

    // Dark recess backplate, slightly larger than the aperture so its edges
    // tuck under the bezel inner lip — no gap to the shell shows through.
    const backplate = bake(
      extrudeCentred(
        roundedRectShape(SCREEN.apW + 0.12, SCREEN.apH + 0.12, SCREEN.apR, SCREEN.apR),
        0.05,
        0.015,
        14,
      ),
      [0, cy, SCREEN.backZ],
    );

    return { bezel: merge([bezel]), inner: merge([backplate]) };
  }, [cy]);

  // Curved phosphor + glass geometries.
  const phosphorGeo = useMemo(
    () => curvedPanel(SCREEN.apW - 0.04, SCREEN.apH - 0.04, SCREEN.bulge * 0.7, 44),
    [],
  );
  const glassGeo = useMemo(() => curvedPanel(SCREEN.apW + 0.04, SCREEN.apH + 0.04, SCREEN.bulge, 44), []);

  // Wire the canvas texture into the phosphor material.
  const phosphorMat = useMemo(() => {
    const m = materials.phosphor.clone();
    m.emissiveMap = screen.texture;
    m.map = screen.texture;
    m.emissive = new THREE.Color("#ffffff");
    m.emissiveIntensity = 1.0;
    m.toneMapped = false;
    m.needsUpdate = true;
    return m;
  }, [materials.phosphor, screen.texture]);

  useEffect(() => {
    if (phosphorMatRef) phosphorMatRef.current = phosphorMat;
    return () => {
      if (phosphorMatRef) phosphorMatRef.current = null;
    };
  }, [phosphorMat, phosphorMatRef]);

  useEffect(
    () => () => {
      geo.bezel.dispose();
      geo.inner.dispose();
      phosphorGeo.dispose();
      glassGeo.dispose();
      phosphorMat.dispose();
    },
    [geo, phosphorGeo, glassGeo, phosphorMat],
  );

  return (
    <group>
      <mesh geometry={geo.bezel} material={materials.bezel} />
      <mesh geometry={geo.inner} material={materials.bezelInner} />

      {/* phosphor face (glows) — recessed inside the proud bezel */}
      <mesh geometry={phosphorGeo} material={phosphorMat} position={[0, cy, SCREEN.phosphorZ]} />

      {/* curved glass overlay */}
      <mesh
        geometry={glassGeo}
        material={materials.glass}
        position={[0, cy, SCREEN.glassZ]}
        renderOrder={2}
      />

      {/* screen fill light — gives the bezel a faint internal glow */}
      <pointLight
        ref={glowRef}
        color={CRT.lavender}
        intensity={0.5}
        distance={2.4}
        decay={2}
        position={[0, cy, SCREEN.glassZ + 0.15]}
      />
    </group>
  );
}
