import * as THREE from "three";
import {
  BODY,
  FRONT_Z,
  TOP_Y,
  TOP_PLATE,
  POCKET,
  PANEL,
  PANEL_FACE,
  GASKET,
  HUMP,
  HUMP_WINDOW,
  VIEWFINDER,
  TALLY,
  TALLY_LED,
  WINDOWS,
  GRIP,
  SCREWS,
  READOUT,
  COUNTER,
  LUG,
  FLANK_SEAM,
  wallXAt,
} from "../proportions";
import {
  roundedRectShape,
  roundedRectPath,
  roundedRectRing,
  trapezoidShape,
  extrudeCentred,
  draftGeometry,
  creased,
  LathePath,
  bake,
  merge,
} from "./shapes";

/**
 * CAMERA BODY — GEOMETRY
 * ======================
 *
 * A pure builder (no React, no DOM) so the baked geometry can be measured
 * headlessly for the fit hull.
 *
 * THE FRONT IS NOW A POCKET (the headline Stage 3 change):
 *
 *   shell lid (cream, flat border)
 *     → rolled rim  — the pocket hole's bevel chamfer, free from the extrusion
 *     → gasket ring — rubber frame embedded in the drafted pocket wall
 *     → dark panel  — leatherette slab at the bottom of the pocket
 *
 * The panel face sits 0.032 BEHIND the front plane; the display collars rise
 * from it, through the mouth, to just above the lid — machined bezels
 * standing proud, with the display glass (flown by DisplayPanels.tsx, which
 * is untouched) recessed inside them.
 *
 * Draft order matters: parts are BAKED to their final position first, then
 * drafted — the taper scales x/y about the body origin as a function of z,
 * so it must see final coordinates. Parts seated against the drafted flank
 * ask `wallXAt` for their seat, so nothing floats.
 */
export interface BodyGeometry {
  shell: THREE.BufferGeometry;
  groove: THREE.BufferGeometry;
  plate: THREE.BufferGeometry;
  hump: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
  gasket: THREE.BufferGeometry;
  grip: THREE.BufferGeometry;
  surrounds: THREE.BufferGeometry;
  panes: THREE.BufferGeometry;
  hardware: THREE.BufferGeometry;
  darkDetail: THREE.BufferGeometry;
  tally: THREE.BufferGeometry;
  pipY: THREE.BufferGeometry;
  pipP: THREE.BufferGeometry;
}

/** Curved-corner quality for the big extrusions. */
const CURVE = 24;

/**
 * A bevelled collar ring around a rounded-rect window, standing on its base
 * surface. The extrusion bevel chamfers both the outer rim and the bore
 * mouth, so the collar reads as a machined bezel rather than a thickened
 * frame. The base is buried inside whatever it stands on.
 */
function windowCollar(
  w: number,
  h: number,
  rTop: number,
  rBot: number,
  topZ: number,
  baseZ: number,
  x = 0,
  y = 0,
): THREE.BufferGeometry {
  const shape = roundedRectRing(
    w + WINDOWS.margin * 2,
    h + WINDOWS.margin * 2,
    rTop + WINDOWS.margin * 0.8,
    rBot + WINDOWS.margin * 0.8,
    w + WINDOWS.boreGap * 2,
    h + WINDOWS.boreGap * 2,
    Math.max(rTop * 0.7, 0.02),
    Math.max(rBot * 0.7, 0.02),
  );
  const depth = topZ - baseZ;
  const geo = extrudeCentred(shape, depth, WINDOWS.bevel, 12, 3);
  return bake(geo, [x, y, baseZ + depth / 2]);
}

/** The tally LED's collar — circular, so a turned lathe rather than an extrusion. */
function tallyCollar(): THREE.BufferGeometry {
  const g = new LathePath(TALLY_LED.bore + 0.004, TALLY_LED.baseZ)
    .lineTo(TALLY_LED.r, TALLY_LED.baseZ)
    .fillet(TALLY_LED.r, TALLY_LED.topZ - 0.012, 0.01, TALLY_LED.bore, TALLY_LED.topZ)
    .lineTo(TALLY_LED.bore, TALLY_LED.topZ)
    .latheZ(48);
  return bake(g, [TALLY.x, TALLY.y, 0]);
}

export function buildBodyGeometry(): BodyGeometry {
  /* ---- the shell casting, with the front pocket cut through it --------- */
  // The hole is authored at the pocket MOUTH size; the extrusion bevel
  // expands contours through the mid-band, so the hole narrows going back —
  // a rolled, drafted rim for free (see shapes.ts header for the verified
  // bevel direction).
  const pocketH = POCKET.topY - POCKET.botY;
  const shellShape = roundedRectShape(BODY.w, BODY.h, BODY.rTop, BODY.rBot);
  shellShape.holes.push(
    roundedRectPath(POCKET.w, pocketH, POCKET.rTop, POCKET.rBot, 0, (POCKET.topY + POCKET.botY) / 2),
  );
  const shell = creased(
    draftGeometry(
      extrudeCentred(shellShape, BODY.d, BODY.bevel, CURVE, BODY.bevelSegments),
      BODY.draft,
      FRONT_Z,
      BODY.d,
    ),
  );

  /* ---- seam groove between body and top plate -------------------------- */
  const gapTop = TOP_PLATE.fromY;
  const gapBot = TOP_PLATE.fromY - TOP_PLATE.gapH;
  const groove = creased(
    draftGeometry(
      bake(
        extrudeCentred(
          roundedRectShape(BODY.w - TOP_PLATE.gapInset * 2, TOP_PLATE.gapH + 0.02, 0.02, 0.02),
          BODY.d - TOP_PLATE.gapInset * 2,
          0.008,
          12,
          3,
        ),
        [0, (gapTop + gapBot) / 2, 0],
      ),
      BODY.draft,
      FRONT_Z,
      BODY.d,
    ),
  );

  /* ---- top plate: proud on every side ----------------------------------- */
  const plateH = TOP_Y - gapTop;
  const plate = creased(
    draftGeometry(
      bake(
        extrudeCentred(
          roundedRectShape(BODY.w + TOP_PLATE.overhang * 2, plateH, BODY.rTop, 0.05),
          BODY.d + TOP_PLATE.overhang * 2,
          BODY.bevel,
          CURVE,
          BODY.bevelSegments,
        ),
        [0, gapTop + plateH / 2, 0],
      ),
      BODY.draft,
      FRONT_Z,
      BODY.d,
    ),
  );

  /* ---- prism housing, seated on the DRAFTED deck ----------------------- */
  /* Trapezoid authored 2·rise tall, half-buried: the crown lands on
     TOP_Y + crown (the signed-off silhouette line) and the base is
     swallowed by the plate casting. */
  const hump = creased(
    extrudeCentred(
      trapezoidShape(HUMP.wBase, HUMP.wTop, HUMP.rise * 2, HUMP.r),
      HUMP.d,
      0.045,
      14,
      4,
    ),
  );
  bake(hump, [HUMP.x, TOP_Y + HUMP.crown - HUMP.rise, HUMP.z]);

  /* ---- dark panel slab at the bottom of the pocket ---------------------- */
  const panelH = PANEL.topY - PANEL.botY;
  const panel = creased(
    extrudeCentred(
      roundedRectShape(PANEL.w, panelH, PANEL.rTop, PANEL.rBot),
      PANEL.thickness,
      0.016,
      16,
      3,
    ),
  );
  bake(panel, [0, (PANEL.topY + PANEL.botY) / 2, FRONT_Z + PANEL.proud]);

  /* ---- rubber gasket ring framing the panel ----------------------------- */
  const gasketOuterH = GASKET.topY - GASKET.botY;
  const gasket = creased(
    extrudeCentred(
      roundedRectRing(
        GASKET.w,
        gasketOuterH,
        GASKET.rTop,
        GASKET.rBot,
        GASKET.w - GASKET.inset * 2,
        gasketOuterH - GASKET.inset * 2,
        Math.max(GASKET.rTop - GASKET.inset * 0.8, 0.02),
        Math.max(GASKET.rBot - GASKET.inset * 0.8, 0.02),
      ),
      GASKET.depth,
      0.008,
      14,
      3,
    ),
  );
  bake(gasket, [0, (GASKET.topY + GASKET.botY) / 2, GASKET.topZ - GASKET.depth / 2]);

  /* ---- rubber grip: panel → gasket → rim → lid, one continuous pad ------ */
  const gripParts: THREE.BufferGeometry[] = [
    extrudeCentred(roundedRectShape(GRIP.w, GRIP.h, GRIP.r, GRIP.r), GRIP.topZ - GRIP.baseZ, 0.014, 12, 3),
  ];
  bake(gripParts[0], [GRIP.x, GRIP.y, (GRIP.topZ + GRIP.baseZ) / 2]);
  // Rounded moulded ridges — vertical, so they survive the foreshortening
  // the three-quarter view puts on the right of the front face.
  for (let i = 0; i < GRIP.ridges; i += 1) {
    const t = (i + 0.5) / GRIP.ridges;
    const ridge = extrudeCentred(
      roundedRectShape(GRIP.w * 0.075, GRIP.h * 0.88, 0.008, 0.008),
      0.014,
      0.005,
      6,
      2,
    );
    gripParts.push(
      bake(ridge, [GRIP.x + (t - 0.5) * GRIP.w * 0.8, GRIP.y, GRIP.topZ + 0.003]),
    );
  }
  const grip = merge(gripParts);

  /* ---- window collars + tally collar, welded into one buffer ------------ */
  const humpFace = HUMP.z + HUMP.d / 2;
  const surrounds = merge([
    // Two info displays — the physical housings for DisplayPanels' planes.
    // DisplayPanels mounts its textures at PANEL_FACE + 0.041; the collars
    // stand above that and the panes sit just behind it (WINDOWS.paneLift).
    windowCollar(COUNTER.w, COUNTER.h, 0.05, 0.055, WINDOWS.topZ, WINDOWS.baseZ, COUNTER.x, COUNTER.y),
    windowCollar(READOUT.w, READOUT.h, 0.06, 0.065, WINDOWS.topZ, WINDOWS.baseZ, READOUT.x, READOUT.y),
    // Viewfinder, standing on the shell lid above the pocket.
    windowCollar(VIEWFINDER.w, VIEWFINDER.h, 0.05, 0.05, WINDOWS.topZ, 0.47, VIEWFINDER.x, VIEWFINDER.y),
    // Rangefinder window on the hump face.
    windowCollar(HUMP_WINDOW.w, HUMP_WINDOW.h, 0.045, 0.045, humpFace + 0.052, humpFace - 0.012, HUMP_WINDOW.x, HUMP_WINDOW.y),
    tallyCollar(),
  ]);

  /* ---- the dark panes that sit behind the display textures -------------- */
  const displayPaneZ = PANEL_FACE + WINDOWS.paneLift;
  const pane = (w: number, h: number) =>
    new THREE.PlaneGeometry(
      w + WINDOWS.boreGap * 2 - WINDOWS.paneUnder,
      h + WINDOWS.boreGap * 2 - WINDOWS.paneUnder,
    );
  const panes = merge([
    bake(pane(VIEWFINDER.w, VIEWFINDER.h), [VIEWFINDER.x, VIEWFINDER.y, displayPaneZ]),
    bake(pane(HUMP_WINDOW.w, HUMP_WINDOW.h), [HUMP_WINDOW.x, HUMP_WINDOW.y, humpFace + 0.024]),
    bake(pane(READOUT.w, READOUT.h), [READOUT.x, READOUT.y, displayPaneZ]),
    bake(pane(COUNTER.w, COUNTER.h), [COUNTER.x, COUNTER.y, displayPaneZ]),
  ]);

  /* ---- hardware: screws, lugs ------------------------------------------- */
  const screwBody = () => {
    const g = new THREE.CylinderGeometry(SCREWS.r, SCREWS.r, 0.035, 18);
    g.rotateX(Math.PI / 2);
    return g;
  };
  // Lugs straddle the DRAFTED wall, not the nominal one.
  const lugBlank = () =>
    extrudeCentred(
      roundedRectShape(LUG.d, LUG.h, LUG.h / 2.2, LUG.h / 2.2),
      LUG.w,
      0.02,
      8,
      3,
    );

  const hardware = merge([
    bake(screwBody(), [SCREWS.xs[0], SCREWS.y, PANEL_FACE + 0.008]),
    bake(screwBody(), [SCREWS.xs[1], SCREWS.y, PANEL_FACE + 0.008]),
    bake(lugBlank(), [-wallXAt(0) - LUG.w * 0.25, LUG.y, 0], [0, Math.PI / 2, 0]),
    bake(lugBlank(), [wallXAt(0) + LUG.w * 0.25, LUG.y, 0], [0, Math.PI / 2, 0]),
  ]);

  /* ---- dark details: screw slots, door seam, LED backing ---------------- */
  const seamX = wallXAt(FLANK_SEAM.z) - 0.002;
  const darkDetail = merge([
    bake(
      new THREE.BoxGeometry(SCREWS.r * 1.7, 0.012, 0.02),
      [SCREWS.xs[0], SCREWS.y, PANEL_FACE + 0.024],
    ),
    bake(
      new THREE.BoxGeometry(SCREWS.r * 1.7, 0.012, 0.02),
      [SCREWS.xs[1], SCREWS.y, PANEL_FACE + 0.024],
      [0, 0, Math.PI / 2],
    ),
    bake(
      new THREE.BoxGeometry(0.014, FLANK_SEAM.to - FLANK_SEAM.from, FLANK_SEAM.w),
      [seamX, (FLANK_SEAM.from + FLANK_SEAM.to) / 2, FLANK_SEAM.z],
    ),
    // Backing disc inside the tally collar, behind the LED sphere.
    bake(new THREE.CircleGeometry(TALLY_LED.bore + 0.014, 24), [
      TALLY.x,
      TALLY.y,
      TALLY_LED.baseZ + 0.05,
    ]),
  ]);

  /* ---- the tally lamp itself — Stage 2 fixture, unchanged ---------------- */
  // Sphere + parented flash PointLight live in CameraBody.tsx; only the
  // geometry is built here, at exactly the position it has always had.
  const tally = new THREE.SphereGeometry(TALLY.r, 20, 14);
  bake(tally, [TALLY.x, TALLY.y, FRONT_Z + 0.022]);

  /* ---- accent pips beside the readout ------------------------------------ */
  const pipY = bake(new THREE.PlaneGeometry(0.045, 0.02), [
    READOUT.x - READOUT.w * 0.28,
    READOUT.y - READOUT.h * 0.3,
    PANEL_FACE + 0.042,
  ]);
  const pipP = bake(new THREE.PlaneGeometry(0.045, 0.02), [
    READOUT.x - READOUT.w * 0.16,
    READOUT.y - READOUT.h * 0.3,
    PANEL_FACE + 0.042,
  ]);

  return {
    shell,
    groove,
    plate,
    hump,
    panel,
    gasket,
    grip,
    surrounds,
    panes,
    hardware,
    darkDetail,
    tally,
    pipY,
    pipP,
  };
}
