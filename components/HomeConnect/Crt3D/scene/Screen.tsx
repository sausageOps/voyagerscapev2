"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SCREEN } from "../proportions";
import { buildScreen } from "../geometry/monitor";
import type { CrtMaterials } from "../materials/materials";

/**
 * THE TUBE FACE
 * =============
 *
 * Three concentric curved surfaces at three different depths. Every one of
 * them is a superellipse patch bulged into a shallow spherical section, all
 * generated from the same outline function the bezel aperture was cut with,
 * so they cannot drift out of agreement.
 *
 *   glass   z = FRONT_Z − 0.075   reflective, barely opaque, oversized so
 *                                 its rim tucks behind the bezel lip
 *   image   z = FRONT_Z − 0.155   the emissive raster, running the CRT shader
 *   mask    just behind the image  the unlit phosphor border
 *
 * WHY THREE SURFACES AND NOT ONE
 * ------------------------------
 * Thickness. A single textured plane with a reflection baked into it is the
 * standard way to do this and it always reads as a printed panel, because
 * the reflection and the image sit at exactly the same depth: move the
 * camera and they track together, which real glass never does. Separating
 * them by 0.08 world units — about 10mm at this scale — means the
 * highlight slides across the picture as the monitor turns. That parallax
 * IS the glass. It costs one extra draw call.
 *
 * The mask behind them is what stops the picture reading as a sticker on
 * the bezel: real tubes have an unlit border between the raster and the
 * aperture, and its absence is immediately, if inexplicably, wrong.
 */
export default function Screen({
  materials,
  crtMaterial,
}: {
  materials: CrtMaterials;
  crtMaterial: THREE.ShaderMaterial;
}) {
  const geo = useMemo(() => buildScreen(), []);

  useEffect(
    () => () => {
      geo.glass.dispose();
      geo.image.dispose();
      geo.mask.dispose();
    },
    [geo],
  );

  return (
    <group position={[0, SCREEN.cy, 0]}>
      <mesh geometry={geo.mask} material={materials.tubeMask} position={[0, 0, SCREEN.imageZ - 0.008]} />
      <mesh geometry={geo.image} material={crtMaterial} position={[0, 0, SCREEN.imageZ]} />
      {/* Drawn last: it is a transparent surface with depthWrite off, so it
          has to composite over a picture that is already in the buffer. */}
      <mesh
        geometry={geo.glass}
        material={materials.glass}
        position={[0, 0, SCREEN.glassZ]}
        renderOrder={4}
      />
    </group>
  );
}
