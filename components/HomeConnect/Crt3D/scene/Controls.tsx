"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { CONTROLS, FRONT_Z } from "../proportions";
import { buildControls } from "../geometry/monitor";
import type { CrtMaterials } from "../materials/materials";

/**
 * CONTROL CLUSTER
 * ===============
 *
 * Placement and materials only; the solids come from
 * `geometry/monitor.ts`.
 *
 * Two things here are live rather than static: the power switch, which is
 * a group the rig translates along −Z when it is pressed, and the status
 * lamp, whose emissive colour tracks the recorder state. Everything else
 * is welded and never moves.
 */
export default function Controls({
  materials,
  powerRef,
  ledRef,
}: {
  materials: CrtMaterials;
  powerRef: MutableRefObject<THREE.Group | null>;
  ledRef: MutableRefObject<THREE.Mesh | null>;
}) {
  const geo = useMemo(() => buildControls(), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
    },
    [geo],
  );

  const c = CONTROLS;

  return (
    <group>
      <mesh geometry={geo.wells} material={materials.buttonWell} />
      <mesh geometry={geo.buttons} material={materials.button} />
      <mesh geometry={geo.badges} material={materials.buttonWell} />
      <mesh geometry={geo.surround} material={materials.bezel} />

      {/* The switch travels along Z when pressed — see CrtRig. */}
      <group ref={powerRef} position={[c.power.x, c.power.y, FRONT_Z + c.power.depth / 2 - 0.006]}>
        <mesh geometry={geo.power} material={materials.buttonPower} />
      </group>

      {/* The lamp: an emissive core under a translucent moulded lens, so it
          has a body and a highlight instead of being a painted dot. */}
      <group position={[c.led.x, c.led.y, FRONT_Z - c.led.depth]}>
        <mesh
          ref={ledRef}
          geometry={geo.led}
          material={materials.led}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <mesh
          geometry={geo.ledLens}
          material={materials.ledLens}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 0.004]}
          renderOrder={3}
        />
      </group>
    </group>
  );
}
