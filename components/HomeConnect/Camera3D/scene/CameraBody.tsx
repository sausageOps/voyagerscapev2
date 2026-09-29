"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import {
  BODY,
  FRONT_Z,
  TOP_Y,
  TOP_PLATE,
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
  FLANK_SEAM,
} from "../proportions";
import {
  roundedRectShape,
  trapezoidShape,
  extrudeCentred,
  bake,
  merge,
} from "../geometry/shapes";
import type { CameraMaterials } from "../materials/materials";
import DisplayPanels from "./DisplayPanels";

/**
 * CAMERA BODY
 * ===========
 *
 * Stage 1 built this as one moulded shell with parts laid on the front. That
 * is exactly what made it read as a rounded block: real cameras are an
 * assembly, and the assembly lines are most of what the eye uses to tell a
 * designed instrument from a primitive.
 *
 * Stage 1B splits the casting in three along Y:
 *
 *   top plate   — its own slab, 13 thousandths PROUD on every side
 *   seam groove — an undersized band in a matte dark material
 *   lower body  — the main shell, carrying the leatherette and the lens
 *
 * The groove is modelled rather than shaded because there are no shadow maps
 * in this scene: an overhang with nothing under it just looks like a wider
 * box. Recessing a dark band into the step produces the shadow line for free
 * and, unlike a painted stripe, it stays correct from every angle.
 *
 * Other form work, in order of how much it contributes:
 *   - a chamfered plinth the lens grows out of (in LensAssembly)
 *   - a trapezoidal prism housing with drafted sides, not a rounded box
 *   - a proud rubber grip pad replacing two thin ribs that read as scratches
 *   - a single door seam on the right flank
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
  const geo = useMemo(() => {
    /* ---- the three castings -------------------------------------------- */

    const gapTop = TOP_PLATE.fromY;
    const gapBot = TOP_PLATE.fromY - TOP_PLATE.gapH;

    // Lower body: everything below the seam. Square-ish at the top because
    // that edge is a machined joint, generous at the base where it is moulded.
    const lowerH = gapBot + BODY.h / 2;
    const lower = extrudeCentred(
      roundedRectShape(BODY.w, lowerH, 0.03, BODY.rBot),
      BODY.d,
      BODY.bevel,
      16,
    );
    bake(lower, [0, gapBot - lowerH / 2, 0]);

    // Seam groove: undersized in both width and depth so it sits back in the
    // step on the front, both flanks and the rear.
    const gap = extrudeCentred(
      roundedRectShape(
        BODY.w - TOP_PLATE.gapInset * 2,
        TOP_PLATE.gapH + 0.02,
        0.02,
        0.02,
      ),
      BODY.d - TOP_PLATE.gapInset * 2,
      0.008,
      12,
    );
    bake(gap, [0, (gapTop + gapBot) / 2, 0]);

    // Top plate: proud on every side. The overhang is what the groove reads
    // against.
    const plateH = TOP_Y - gapTop;
    const plate = extrudeCentred(
      roundedRectShape(
        BODY.w + TOP_PLATE.overhang * 2,
        plateH,
        BODY.rTop,
        0.035,
      ),
      BODY.d + TOP_PLATE.overhang * 2,
      BODY.bevel,
      16,
    );
    bake(plate, [0, gapTop + plateH / 2, 0]);

    /* ---- prism housing -------------------------------------------------- */
    // Drafted sides and a rounded crown. A straight rounded box on a lid is
    // the single most primitive-looking element a camera model can have.
    const hump = extrudeCentred(
      trapezoidShape(HUMP.wBase, HUMP.wTop, HUMP.rise * 2, HUMP.r),
      HUMP.d,
      0.04,
      14,
    );
    bake(hump, [HUMP.x, TOP_Y, HUMP.z]);

    /* ---- dark leatherette front panel ----------------------------------- */
    // Inset on three sides, so the cream casting frames it. A flat-topped
    // profile that butts into the body edges is no longer the right
    // primitive — the panel now has four finished corners.
    const panelFace = FRONT_Z + PANEL.proud + PANEL.thickness / 2;
    const panelH = PANEL.topY - PANEL.botY;
    const panel = extrudeCentred(
      roundedRectShape(PANEL.w, panelH, PANEL.rTop, PANEL.rBot),
      PANEL.thickness,
      0.018,
      14,
    );
    bake(panel, [0, (PANEL.topY + PANEL.botY) / 2, FRONT_Z + PANEL.proud]);

    /* ---- rubber grip ---------------------------------------------------- */
    const gripParts: THREE.BufferGeometry[] = [
      bake(
        extrudeCentred(
          roundedRectShape(GRIP.w, GRIP.h, GRIP.r, GRIP.r),
          GRIP.proud,
          0.012,
          12,
        ),
        [GRIP.x, GRIP.y, panelFace + GRIP.proud / 2],
      ),
    ];
    // Fine moulded ridges. Vertical, so they survive the foreshortening the
    // three-quarter view puts on the right of the front face.
    for (let i = 0; i < GRIP.ridges; i += 1) {
      const t = (i + 0.5) / GRIP.ridges;
      gripParts.push(
        bake(
          new THREE.BoxGeometry(GRIP.w * 0.055, GRIP.h * 0.9, 0.012),
          [
            GRIP.x + (t - 0.5) * GRIP.w * 0.82,
            GRIP.y,
            panelFace + GRIP.proud + 0.003,
          ],
        ),
      );
    }
    const grip = merge(gripParts);

    /* ---- recessed window surrounds, welded into one buffer -------------- */
    const frame = (w: number, h: number, r: number) =>
      extrudeCentred(roundedRectShape(w, h, r, r), 0.05, 0.014, 10);

    const surrounds = merge([
      bake(frame(VIEWFINDER.w, VIEWFINDER.h, 0.05), [
        VIEWFINDER.x,
        VIEWFINDER.y,
        FRONT_Z + 0.012,
      ]),
      bake(frame(HUMP_WINDOW.w, HUMP_WINDOW.h, 0.045), [
        HUMP_WINDOW.x,
        HUMP_WINDOW.y,
        HUMP.z + HUMP.d / 2,
      ]),
      bake(frame(READOUT.w, READOUT.h, 0.07), [
        READOUT.x,
        READOUT.y,
        panelFace + 0.012,
      ]),
      bake(frame(COUNTER.w, COUNTER.h, 0.055), [
        COUNTER.x,
        COUNTER.y,
        panelFace + 0.012,
      ]),
    ]);

    /* ---- the dark panes that sit in them -------------------------------- */
    const pane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
    const panes = merge([
      bake(pane(VIEWFINDER.w * 0.84, VIEWFINDER.h * 0.72), [
        VIEWFINDER.x,
        VIEWFINDER.y,
        FRONT_Z + 0.038,
      ]),
      bake(pane(HUMP_WINDOW.w * 0.86, HUMP_WINDOW.h * 0.74), [
        HUMP_WINDOW.x,
        HUMP_WINDOW.y,
        HUMP.z + HUMP.d / 2 + 0.026,
      ]),
      bake(pane(READOUT.w * 0.86, READOUT.h * 0.82), [
        READOUT.x,
        READOUT.y,
        panelFace + 0.038,
      ]),
      bake(pane(COUNTER.w * 0.86, COUNTER.h * 0.7), [
        COUNTER.x,
        COUNTER.y,
        panelFace + 0.038,
      ]),
    ]);

    /* ---- hardware: screws, lugs, flank seam ----------------------------- */
    const screwBody = () => {
      const g = new THREE.CylinderGeometry(SCREWS.r, SCREWS.r, 0.035, 18);
      g.rotateX(Math.PI / 2);
      return g;
    };
    const lugBlank = () =>
      extrudeCentred(
        roundedRectShape(LUG.d, LUG.h, LUG.h / 2.2, LUG.h / 2.2),
        LUG.w,
        0.02,
        8,
      );

    const hardware = merge([
      bake(screwBody(), [SCREWS.xs[0], SCREWS.y, panelFace + 0.012]),
      bake(screwBody(), [SCREWS.xs[1], SCREWS.y, panelFace + 0.012]),
      bake(lugBlank(), [-BODY.w / 2 - LUG.w * 0.25, LUG.y, 0], [0, Math.PI / 2, 0]),
      bake(lugBlank(), [BODY.w / 2 + LUG.w * 0.25, LUG.y, 0], [0, Math.PI / 2, 0]),
      // Tally bezel.
      bake(
        new THREE.TorusGeometry(TALLY.r * 1.55, TALLY.r * 0.34, 10, 24),
        [TALLY.x, TALLY.y, FRONT_Z + 0.01],
      ),
    ]);

    // Screw slots + the single door seam on the right flank.
    const darkDetail = merge([
      bake(
        new THREE.BoxGeometry(SCREWS.r * 1.7, 0.012, 0.02),
        [SCREWS.xs[0], SCREWS.y, panelFace + 0.028],
      ),
      bake(
        new THREE.BoxGeometry(SCREWS.r * 1.7, 0.012, 0.02),
        [SCREWS.xs[1], SCREWS.y, panelFace + 0.028],
        [0, 0, Math.PI / 2],
      ),
      bake(
        new THREE.BoxGeometry(
          0.014,
          FLANK_SEAM.to - FLANK_SEAM.from,
          FLANK_SEAM.w,
        ),
        [
          BODY.w / 2 - 0.002,
          (FLANK_SEAM.from + FLANK_SEAM.to) / 2,
          FLANK_SEAM.z,
        ],
      ),
    ]);

    /* ---- accents -------------------------------------------------------- */
    const tally = new THREE.SphereGeometry(TALLY.r, 20, 14);
    bake(tally, [TALLY.x, TALLY.y, FRONT_Z + 0.022]);

    const pipY = bake(new THREE.PlaneGeometry(0.045, 0.02), [
      READOUT.x - READOUT.w * 0.28,
      READOUT.y - READOUT.h * 0.3,
      panelFace + 0.042,
    ]);
    const pipP = bake(new THREE.PlaneGeometry(0.045, 0.02), [
      READOUT.x - READOUT.w * 0.16,
      READOUT.y - READOUT.h * 0.3,
      panelFace + 0.042,
    ]);

    return {
      lower,
      gap,
      plate,
      hump,
      panel,
      grip,
      surrounds,
      panes,
      hardware,
      darkDetail,
      tally,
      pipY,
      pipP,
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  return (
    <group>
      {/* ------------------------------------------------ three castings -- */}
      <mesh geometry={geo.lower} material={m.shell} />
      <mesh geometry={geo.gap} material={m.seamGap} />
      <mesh geometry={geo.plate} material={m.deck} />
      <mesh geometry={geo.hump} material={m.deck} />

      {/* ------------------------------------------ leatherette + grip ---- */}
      <mesh geometry={geo.panel} material={m.leather} />
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
            follows every transform applied to the camera body. */}
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
