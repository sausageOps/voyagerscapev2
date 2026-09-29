"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GROUND_Y } from "../proportions";
import type { CameraMaterials } from "../materials/materials";

/**
 * CONTACT SHADOW
 * ==============
 *
 * A single horizontal plane carrying a radial alpha falloff, sitting on the
 * ground plane under the body. Because the view camera looks down ~6.5°, this
 * renders as a squashed ellipse in perspective — the same rx:ry ratio the SVG
 * hero faked by hand (118:13), except here it comes out of the projection for
 * free and stays correct as the object moves.
 *
 * Two triangles. No shadow map, no render target, no depth pass.
 */
export default function ContactShadow({ materials }: { materials: CameraMaterials }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  return (
    <group position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/*
        Both pools are pushed toward the viewer (+Z in world, which is -Y in
        this rotated frame). At an 11° downward view the body occludes almost
        everything directly beneath it, so a pool centred on the origin is
        invisible — the readable part of a contact shadow here is the sliver
        that spills out in FRONT of the base.
      */}
      <mesh
        geometry={geometry}
        scale={[4.7, 3.0, 1]}
        position={[0, -0.5, 0]}
        material={materials.shadow}
        renderOrder={-2}
      />
      <mesh
        geometry={geometry}
        scale={[3.05, 1.5, 1]}
        position={[0, -0.34, 0.004]}
        material={materials.shadow}
        renderOrder={-1}
      />
    </group>
  );
}
