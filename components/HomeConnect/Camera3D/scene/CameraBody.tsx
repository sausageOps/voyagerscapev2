"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BODY,
  FRONT_Z,
  TOP_Y,
  PANEL,
  HUMP,
  HUMP_WINDOW,
  VIEWFINDER,
  TALLY,
  GRIP,
  SCREWS,
  READOUT,
  COUNTER,
  LUG,
} from "../proportions";
import { roundedRectShape, panelShape, extrudeCentred } from "../geometry/shapes";
import type { CameraMaterials } from "../materials/materials";

/**
 * CAMERA BODY
 * ===========
 *
 * One continuous moulded shell with an integrated prism hump, a cream top-deck
 * band over a dark leatherette front, and the small hardware that makes it
 * read as a manufactured object rather than a shape.
 *
 * Every large surface is a bevelled extrusion, not a box. The bevel is doing
 * most of the work: it is what produces the bright edge running along the top
 * deck and around the base, which in the SVG had to be painted in by hand as
 * the `vsCamEdge` gradient stroke.
 *
 * The object carries NO typography — the readout and counter are abstract
 * recessed windows, exactly as in the SVG hero.
 */
export default function CameraBody({ materials: m }: { materials: CameraMaterials }) {
  const geo = useMemo(() => {
    /* ---- main shell ---------------------------------------------------- */
    const shell = extrudeCentred(
      roundedRectShape(BODY.w, BODY.h, BODY.rTop, BODY.rBot),
      BODY.d,
      BODY.bevel,
      16,
    );

    /* ---- prism hump: a second, smaller extrusion seated on the deck ----- */
    const humpShape = roundedRectShape(HUMP.w, HUMP.rise * 2, HUMP.r, HUMP.r);
    const hump = extrudeCentred(humpShape, HUMP.d, 0.045, 12);

    /* ---- dark leatherette front panel ---------------------------------- */
    const panel = extrudeCentred(
      panelShape(PANEL.w, PANEL.topY, PANEL.botY, PANEL.rBot),
      PANEL.thickness,
      0.016,
      14,
    );

    /* ---- recessed window frames (viewfinder / hump / readout / counter) - */
    const vfFrame = extrudeCentred(
      roundedRectShape(VIEWFINDER.w, VIEWFINDER.h, 0.055, 0.055),
      0.05,
      0.014,
      8,
    );
    const humpWin = extrudeCentred(
      roundedRectShape(HUMP_WINDOW.w, HUMP_WINDOW.h, 0.05, 0.05),
      0.04,
      0.012,
      8,
    );
    const readoutFrame = extrudeCentred(
      roundedRectShape(READOUT.w, READOUT.h, 0.075, 0.075),
      0.05,
      0.014,
      8,
    );
    const counterFrame = extrudeCentred(
      roundedRectShape(COUNTER.w, COUNTER.h, 0.06, 0.06),
      0.05,
      0.014,
      8,
    );

    /* ---- small parts --------------------------------------------------- */
    const flatPane = new THREE.PlaneGeometry(1, 1);
    const rib = extrudeCentred(roundedRectShape(GRIP.w, GRIP.h, GRIP.w / 2, GRIP.w / 2), 0.05, 0.016, 6);
    const screw = new THREE.CylinderGeometry(SCREWS.r, SCREWS.r, 0.035, 18);
    screw.rotateX(Math.PI / 2);
    const screwSlot = new THREE.BoxGeometry(SCREWS.r * 1.7, 0.012, 0.02);
    const tally = new THREE.SphereGeometry(TALLY.r, 20, 14);
    const tallyRing = new THREE.TorusGeometry(TALLY.r * 1.55, TALLY.r * 0.34, 10, 24);
    const lug = extrudeCentred(roundedRectShape(LUG.d, LUG.h, LUG.h / 2.2, LUG.h / 2.2), LUG.w, 0.02, 8);
    const seamBar = new THREE.BoxGeometry(PANEL.w - 0.03, 0.02, 0.03);

    return {
      shell,
      hump,
      panel,
      vfFrame,
      humpWin,
      readoutFrame,
      counterFrame,
      flatPane,
      rib,
      screw,
      screwSlot,
      tally,
      tallyRing,
      lug,
      seamBar,
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  /** Front plane of the leatherette panel — everything mounted on it sits here. */
  const panelFace = FRONT_Z + PANEL.proud + PANEL.thickness / 2;
  const humpFace = HUMP.z + HUMP.d / 2;
  const humpCentreY = TOP_Y + HUMP.rise - 0.05;

  return (
    <group>
      {/* ---------------------------------------------------- prism hump -- */}
      <group position={[HUMP.x, humpCentreY, HUMP.z]}>
        <mesh geometry={geo.hump} material={m.shell} />
        {/* rangefinder window, recessed into the face of the hump */}
        <group position={[HUMP_WINDOW.x - HUMP.x, HUMP_WINDOW.y - humpCentreY, humpFace - HUMP.z]}>
          <mesh geometry={geo.humpWin} material={m.metalDark} />
          <mesh
            geometry={geo.flatPane}
            material={m.darkGlass}
            scale={[HUMP_WINDOW.w * 0.86, HUMP_WINDOW.h * 0.76, 1]}
            position={[0, 0, 0.021]}
          />
        </group>
      </group>

      {/* --------------------------------------------------- main shell -- */}
      <mesh geometry={geo.shell} material={m.shell} />

      {/* Cream deck band: a thin brighter sliver laid over the top of the
          front face, so the two-tone split reads as two materials meeting
          rather than as a painted line. */}
      <mesh
        geometry={geo.flatPane}
        material={m.deck}
        scale={[BODY.w - BODY.bevel * 2, TOP_Y - BODY.bevel - PANEL.topY, 1]}
        position={[0, (TOP_Y - BODY.bevel + PANEL.topY) / 2, FRONT_Z + 0.004]}
      />

      {/* ------------------------------------------ leatherette front ----- */}
      <mesh geometry={geo.panel} material={m.leather} position={[0, 0, panelFace]} />

      {/* machined seam where the leatherette meets the deck */}
      <mesh
        geometry={geo.seamBar}
        material={m.seam}
        position={[0, PANEL.topY + 0.006, FRONT_Z + PANEL.proud + 0.03]}
      />

      {/* ------------------------------------------------- viewfinder ----- */}
      <group position={[VIEWFINDER.x, VIEWFINDER.y, FRONT_Z + 0.012]}>
        <mesh geometry={geo.vfFrame} material={m.metalDark} />
        <mesh
          geometry={geo.flatPane}
          material={m.darkGlass}
          scale={[VIEWFINDER.w * 0.84, VIEWFINDER.h * 0.72, 1]}
          position={[0, 0, 0.026]}
        />
      </group>

      {/* ------------------------------------------------ tally lamp ------ */}
      <group position={[TALLY.x, TALLY.y, FRONT_Z + 0.01]}>
        <mesh geometry={geo.tallyRing} material={m.metalMid} />
        <mesh geometry={geo.tally} material={m.tally} position={[0, 0, 0.012]} />
      </group>

      {/* ------------------------------------- abstract recessed windows -- */}
      <group position={[READOUT.x, READOUT.y, panelFace + 0.012]}>
        <mesh geometry={geo.readoutFrame} material={m.metalDark} />
        <mesh
          geometry={geo.flatPane}
          material={m.darkGlass}
          scale={[READOUT.w * 0.86, READOUT.h * 0.82, 1]}
          position={[0, 0, 0.026]}
        />
        {/* two inert marker pips — the only accent on the panel */}
        <mesh
          geometry={geo.flatPane}
          material={m.yellow}
          scale={[0.045, 0.02, 1]}
          position={[-READOUT.w * 0.28, -READOUT.h * 0.3, 0.03]}
        />
        <mesh
          geometry={geo.flatPane}
          material={m.pink}
          scale={[0.045, 0.02, 1]}
          position={[-READOUT.w * 0.16, -READOUT.h * 0.3, 0.03]}
        />
      </group>

      <group position={[COUNTER.x, COUNTER.y, panelFace + 0.012]}>
        <mesh geometry={geo.counterFrame} material={m.metalDark} />
        <mesh
          geometry={geo.flatPane}
          material={m.darkGlass}
          scale={[COUNTER.w * 0.86, COUNTER.h * 0.7, 1]}
          position={[0, 0, 0.026]}
        />
      </group>

      {/* --------------------------------------------- moulded grip ribs -- */}
      {GRIP.xs.map((x) => (
        <mesh key={x} geometry={geo.rib} material={m.metalDark} position={[x, GRIP.y, panelFace + 0.01]} />
      ))}

      {/* ------------------------------------------- two recessed screws -- */}
      {SCREWS.xs.map((x, i) => (
        <group key={x} position={[x, SCREWS.y, panelFace + 0.012]}>
          <mesh geometry={geo.screw} material={m.metalMid} />
          <mesh
            geometry={geo.screwSlot}
            material={m.metalDark}
            position={[0, 0, 0.016]}
            rotation={[0, 0, i === 0 ? 0 : Math.PI / 2]}
          />
        </group>
      ))}

      {/* -------------------------------------------------- strap lugs ---- */}
      <mesh
        geometry={geo.lug}
        material={m.metalMid}
        position={[-BODY.w / 2 - LUG.w * 0.25, LUG.y, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <mesh
        geometry={geo.lug}
        material={m.metalMid}
        position={[BODY.w / 2 + LUG.w * 0.25, LUG.y, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
