"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { TALLY, FRONT_Z } from "../proportions";
import { buildBodyGeometry } from "../geometry/buildBody";
import type { CameraMaterials } from "../materials/materials";
import DisplayPanels from "./DisplayPanels";

/**
 * CAMERA BODY
 * ===========
 *
 * A thin host for geometry/buildBody.ts — the layered casting (shell with a
 * recessed front pocket → rubber gasket → dark panel → raised bezels) is
 * documented there.
 *
 * What lives HERE and nowhere else:
 *
 *  - the DisplayPanels mount (untouched; its texture planes fly themselves
 *    into the collars at PANEL_FACE + 0.041)
 *  - the tally lamp mesh with the flash PointLight parented inside it — the
 *    light's local position and the mesh's position are Stage 2 fixtures,
 *    kept byte-identical so the rig's flash envelope behaves exactly as
 *    before
 *
 * The object carries NO typography — the readout and counter are abstract
 * recessed windows, exactly as in the SVG hero.
 */
export default function CameraBody({
  materials: m,
  capture,
  flashLightRef,
}: {
  materials: CameraMaterials;
  capture: boolean;
  flashLightRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const geo = useMemo(() => buildBodyGeometry(), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  return (
    <group>
      {/* ------------------------------------------------ the castings ---- */}
      <mesh geometry={geo.shell} material={m.shell} />
      <mesh geometry={geo.groove} material={m.seamGap} />
      <mesh geometry={geo.plate} material={m.deck} />
      <mesh geometry={geo.hump} material={m.deck} />

      {/* ------------------------------ pocket: gasket, panel, grip ---- */}
      <mesh geometry={geo.panel} material={m.leather} />
      <mesh geometry={geo.gasket} material={m.rubber} />
      <mesh geometry={geo.grip} material={m.rubber} />

      {/* ---------------------------------------------------- windows ----- */}
      <mesh geometry={geo.surrounds} material={m.bezel} />
      <mesh geometry={geo.panes} material={m.darkGlass} />
      <DisplayPanels capture={capture} />

      {/* --------------------------------------------------- hardware ----- */}
      <mesh geometry={geo.hardware} material={m.metalMid} />
      <mesh geometry={geo.darkDetail} material={m.metalDark} />

      {/* ---------------------------------------------------- accents ----- */}
      <mesh geometry={geo.tally} material={m.tally}>
        {/* This light is parented to the existing tally/flash mesh. Its
            position uses the same local coordinates as that geometry, so it
            follows every transform applied to the camera body. Stage 2
            fixture — do not move. */}
        <pointLight
          ref={flashLightRef}
          intensity={0}
          position={[TALLY.x, TALLY.y, FRONT_Z + 0.12]}
          distance={3.5}
          decay={2}
          color="#fff6ee"
        />
      </mesh>
      <mesh geometry={geo.pipY} material={m.yellow} />
      <mesh geometry={geo.pipP} material={m.pink} />
    </group>
  );
}
