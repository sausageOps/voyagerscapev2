import * as THREE from "three";
import {
  BASE,
  BODY,
  CASTING_BACK_Z,
  CONTROLS,
  FRONT_Z,
  REAR_RINGS,
  REAR_Z,
  SCREEN,
  VENTS,
} from "../proportions";
import {
  bake,
  extrudeCentred,
  loft,
  merge,
  roundedRectPoints,
  roundedRectShape,
  slab,
  superellipsePoints,
  tubeFaceGeometry,
} from "./shapes";

/**
 * THE MONITOR, AS GEOMETRY
 * ========================
 *
 * Every buffer the object is made of, built by pure functions with no React
 * and no WebGL anywhere in the dependency chain.
 *
 * That independence is deliberate and it earns its keep twice. It keeps the
 * scene components down to placement and materials, which is all a
 * component should be doing — and it means the geometry can be built,
 * measured and rendered by a plain Node script. This object is assembled
 * from lofts, superellipse cuts and solved surface placements; the failure
 * modes (a hole that did not triangulate, a loft wound inside out, a vent
 * panel sunk into a taper) all compile and all render, they just look
 * subtly wrong. Being able to rasterise the meshes offline and look at them
 * is the difference between verifying that and hoping.
 */

/* --------------------------------------------------- shell surface maths -- */

/** Interpolate the loft rings to find the shell section at a given z. */
function ringAt(z: number) {
  let a = REAR_RINGS[0];
  let b = REAR_RINGS[1];
  for (let i = 0; i < REAR_RINGS.length - 1; i += 1) {
    if (z <= REAR_RINGS[i].z && z >= REAR_RINGS[i + 1].z) {
      a = REAR_RINGS[i];
      b = REAR_RINGS[i + 1];
      break;
    }
  }
  const span = a.z - b.z || 1;
  const k = (a.z - z) / span;
  return {
    sx: a.sx + (b.sx - a.sx) * k,
    sy: a.sy + (b.sy - a.sy) * k,
    y: a.y + (b.y - a.y) * k,
  };
}

/** Top surface height at z, and its slope with respect to z. */
function topAt(z: number) {
  const r = ringAt(z);
  const y = (BODY.h / 2) * r.sy + r.y;
  const e = 0.01;
  const r2 = ringAt(z - e);
  const y2 = (BODY.h / 2) * r2.sy + r2.y;
  return { y, slope: (y - y2) / e };
}

/** Flank half-width at z, and its slope with respect to z. */
function sideAt(z: number) {
  const r = ringAt(z);
  const x = (BODY.w / 2) * r.sx;
  const e = 0.01;
  const r2 = ringAt(z - e);
  const x2 = (BODY.w / 2) * r2.sx;
  return { x, slope: (x - x2) / e };
}

/** The aperture outline, offset onto the screen centre. */
function apertureRing(a: number, b: number, seg = 88): THREE.Vector2[] {
  return superellipsePoints(a, b, SCREEN.n, seg).map(
    (p) => new THREE.Vector2(p.x, p.y + SCREEN.cy),
  );
}

/**
 * THE CONTROL PANEL
 * =================
 *
 * One moulded fascia, solved rather than placed.
 *
 * WHAT WAS WRONG
 * --------------
 * The controls had accumulated as four unrelated treatments sitting on
 * the same bezel: a recessed strip holding four buttons, a separate
 * aperture holding a speaker grille, a raised collar holding a trim
 * wheel, and a raised surround holding the power switch. Each was
 * individually plausible and together they read as parts bought from
 * four different suppliers and glued on. A real set has ONE fascia —
 * one aperture, one insert, one tool.
 *
 * So there is now a single recessed panel with a single cavity behind
 * it, and everything lives in it: the speaker slots are cut through the
 * insert itself rather than through a neighbouring plate, and the power
 * switch stands proud of the same insert as the adjustment buttons
 * instead of having its own raised surround.
 *
 * SOLVED, NOT EYEBALLED
 * ---------------------
 * `solvePanel()` computes every x from one right-hand datum, one
 * padding and one gutter. Nothing below is a literal position. That is
 * the difference between a layout that is aligned and a layout that
 * merely looks aligned in the one pose it was tuned in: with four
 * independent hand-placed constants, any later change to a button width
 * silently breaks the spacing, and the failure is a couple of pixels —
 * invisible in review and obvious in the composition.
 *
 * The right-hand datum is where the old strip already ended, so the
 * panel's outer edge does not move.
 *
 * NO TRIM WHEEL
 * -------------
 * The wheel added in the previous step is gone. This brief defers
 * brightness/contrast knobs to a later step and gives a layout without
 * one, and it was also the single least coherent thing on the fascia: a
 * cylinder in a raised collar between two rectangular recessed groups.
 * Its material went with it.
 */
const PANEL = {
  /** Shared baseline. Every control centres on this line. */
  y: -1.175,
  h: 0.215,
  r: 0.05,
  /** How far the insert sits below the casting face. */
  recess: 0.035,
  /* The insert is a PANEL, not a block. At 0.11 the speaker slots
     became 0.11-deep tunnels through a 0.010 opening — you saw only
     their lit side walls, so they read as bright scratches rather than
     as openings. The depth of the feature comes from the cavity behind
     it, not from the thickness of the part in front. */
  depth: 0.05,
  /** Inner margin, and the space between control groups. */
  pad: 0.07,
  gutter: 0.07,
  /** Right-hand datum — unchanged from the strip it replaces. */
  right: 1.459,

  /* Six wider slots rather than seven narrow ones. A slot has to stay
     wider than twice the bevel that rounds it or the chamfer closes it
     up, and at hero scale it also has to clear about three device
     pixels to read as an opening at all. */
  grille: { w: 0.26, count: 6, slotW: 0.03, slotH: 0.125, pitch: 0.042 },
  /** Four identical secondary buttons: CH-, CH+, VOL-, VOL+. */
  button: { count: 4, w: 0.125, h: 0.072, depth: 0.036, pitch: 0.165, proud: 0.019 },
  led: { r: 0.03, depth: 0.02 },
  /** Larger than the secondaries, and standing further out of the
   *  panel — but still below the casting face, so it reads as recessed
   *  hardware rather than a button stuck on the front. */
  power: { w: 0.185, h: 0.105, depth: 0.044, proud: 0.029 },
} as const;

export interface PanelLayout {
  left: number;
  width: number;
  centre: number;
  grilleX: number;
  buttonX: number[];
  ledX: number;
  powerX: number;
}

/**
 * Lays the fascia out from the right-hand datum leftwards, in one pass.
 *
 * Group order, left to right: speaker slots, the four adjustment
 * buttons, the status lamp, the power switch. The switch is at the
 * outboard end and the lamp immediately inboard of it, which is where
 * almost every monitor of the period put them — you find the power
 * button by running a thumb in from the corner of the bezel.
 */
export function solvePanel(): PanelLayout {
  const g = PANEL.gutter;
  const buttonsW = (PANEL.button.count - 1) * PANEL.button.pitch + PANEL.button.w;
  const ledW = PANEL.led.r * 2;

  const content =
    PANEL.grille.w + g + buttonsW + g + ledW + g * 0.6 + PANEL.power.w;
  const width = content + PANEL.pad * 2;
  const left = PANEL.right - width;

  let x = left + PANEL.pad;
  const grilleX = x + PANEL.grille.w / 2;
  x += PANEL.grille.w + g;

  const buttonX: number[] = [];
  for (let i = 0; i < PANEL.button.count; i += 1) {
    buttonX.push(x + PANEL.button.w / 2 + i * PANEL.button.pitch);
  }
  x += buttonsW + g;

  const ledX = x + PANEL.led.r;
  x += ledW + g * 0.6;

  const powerX = x + PANEL.power.w / 2;

  return { left, width, centre: left + width / 2, grilleX, buttonX, ledX, powerX };
}

/** A rounded-rectangle hole, for cutting into an extruded profile. */
function rectHole(cx: number, cy: number, w: number, h: number, r: number): THREE.Path {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const p = new THREE.Path();
  p.moveTo(cx - hw + rr, cy - hh);
  p.lineTo(cx + hw - rr, cy - hh);
  p.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + rr);
  p.lineTo(cx + hw, cy + hh - rr);
  p.quadraticCurveTo(cx + hw, cy + hh, cx + hw - rr, cy + hh);
  p.lineTo(cx - hw + rr, cy + hh);
  p.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - rr);
  p.lineTo(cx - hw, cy - hh + rr);
  p.quadraticCurveTo(cx - hw, cy - hh, cx - hw + rr, cy - hh);
  p.closePath();
  return p;
}

function aperturePath(a: number, b: number): THREE.Path {
  const path = new THREE.Path(apertureRing(a, b));
  path.closePath();
  return path;
}

/* ----------------------------------------------------------- vent plate -- */

/**
 * A plate with `count` rounded slots cut through it. Built in its own XY
 * plane and extruded along +Z; the caller rotates it onto the shell.
 */
function slottedPlate(
  count: number,
  slotW: number,
  slotH: number,
  gap: number,
  depth: number,
  pad: number,
): THREE.ExtrudeGeometry {
  const totalW = (count - 1) * gap + slotW;
  const shape = roundedRectShape(totalW + pad * 2, slotH + pad * 2, 0.045, 0.045);

  for (let i = 0; i < count; i += 1) {
    const cx = -totalW / 2 + slotW / 2 + i * gap;
    const hw = slotW / 2;
    const hh = slotH / 2;
    const r = Math.min(hw, hh) * 0.85;
    const p = new THREE.Path();
    p.moveTo(cx - hw + r, -hh);
    p.lineTo(cx + hw - r, -hh);
    p.quadraticCurveTo(cx + hw, -hh, cx + hw, -hh + r);
    p.lineTo(cx + hw, hh - r);
    p.quadraticCurveTo(cx + hw, hh, cx + hw - r, hh);
    p.lineTo(cx - hw + r, hh);
    p.quadraticCurveTo(cx - hw, hh, cx - hw, hh - r);
    p.lineTo(cx - hw, -hh + r);
    p.quadraticCurveTo(cx - hw, -hh, cx - hw + r, -hh);
    p.closePath();
    shape.holes.push(p);
  }

  return extrudeCentred(shape, depth, 0.008, 6);
}

/* ================================================================ housing */

export interface HousingGeometry {
  bezel: THREE.BufferGeometry;
  wall: THREE.BufferGeometry;
  rear: THREE.BufferGeometry;
  seam: THREE.BufferGeometry;
  ventPlate: THREE.BufferGeometry;
  ventFloor: THREE.BufferGeometry;
}

/**
 * THE ONE IDEA THAT MAKES THIS READ AS A CRT
 * ------------------------------------------
 * The front is not a frame, it is a CASTING WITH A HOLE IN IT — one
 * extruded profile whose outline is the monitor and whose hole is the
 * screen aperture, bevelled on both boundaries in the same operation. Four
 * bezel bars arranged in a rectangle can never produce the continuous
 * moulding line that wraps from the outer silhouette, over the face and
 * down into the opening, and that line is most of what the eye uses to
 * decide whether it is looking at an injection-moulded part.
 *
 * Behind it the depth is built as three explicit layers — face, recessed
 * step, aperture wall — rather than one chamfer, because a real bezel has
 * three and at a 13° stage angle you can see all of them.
 *
 * VENTILATION is real slots, not painted ones: plates with rounded
 * rectangular holes extruded through them, over a dark floor, so you see
 * into a cavity. Their position and tilt are SOLVED from the loft rings
 * rather than hand-placed — hand-placed numbers go wrong the moment a
 * taper is adjusted, and the failure (one end of the vent sunk into the
 * shell, the other floating above it) is subtle enough to survive review.
 */
export function buildHousing(): HousingGeometry {
  const apertureHalfW = SCREEN.w / 2;
  const apertureHalfH = SCREEN.h / 2;
  /** The recessed step sits this far outside the aperture. */
  const stepOut = 0.09;

  /* Layer 1 — the casting, with the screen opening AND the control strip
     cut out of it. Both are holes in one profile, bevelled in the same
     operation, so the moulding line is continuous from the outer
     silhouette through both apertures. */
  const face = roundedRectShape(BODY.w, BODY.h, BODY.rTop, BODY.rBot);
  face.holes.push(aperturePath(apertureHalfW + stepOut, apertureHalfH + stepOut));
  /* ONE control aperture, not three. The screen opening and the fascia
     are the only holes in the casting, and both are cut in the same
     operation so they share a continuous moulding line. */
  const pl = solvePanel();
  face.holes.push(rectHole(pl.centre, PANEL.y, pl.width, PANEL.h, PANEL.r));
  const casting = extrudeCentred(face, BODY.d, BODY.bevel, 20);
  bake(casting, [0, 0, FRONT_Z - BODY.d / 2]);

  /* Layer 2 — the recessed step: a shallow frame set back from the face,
     spanning from the outer opening in to the aperture proper. This is the
     layer that gives the bezel its shadow line. */
  const stepShape = new THREE.Shape(
    apertureRing(apertureHalfW + stepOut, apertureHalfH + stepOut),
  );
  stepShape.closePath();
  stepShape.holes.push(aperturePath(apertureHalfW, apertureHalfH));
  const stepPlate = extrudeCentred(stepShape, 0.1, 0.022, 20);
  bake(stepPlate, [0, 0, FRONT_Z - SCREEN.lip - 0.05]);

  /* Layer 3 — the aperture wall, running back from the step to the rim of
     the glass, drawing in very slightly as it goes.

     The rings are supplied BACK TO FRONT, and that is not cosmetic. `loft`
     winds for a shell seen from outside, which is right for the rear
     housing and exactly wrong here: this is a funnel you look INTO, so
     its visible face is the inside one. Built front-to-back like
     everything else, every normal pointed into the solid casting and the
     wall rendered as a black band around the tube — a hole in the bezel
     rather than the shroud around a picture. Reversing the ring order
     reverses the winding, which is cheaper and less fragile than a
     BackSide material (that would also flip the lighting). */
  const wallFrontZ = FRONT_Z - SCREEN.lip - 0.09;
  const wall = loft(
    [
      {
        points: apertureRing(apertureHalfW * 0.988, apertureHalfH * 0.985, 72),
        z: wallFrontZ - SCREEN.wallDepth,
      },
      { points: apertureRing(apertureHalfW, apertureHalfH, 72), z: wallFrontZ },
    ],
    false,
  );

  /* ---------------------------------------------------- rear housing --- */

  const rear = loft(
    REAR_RINGS.map((r) => ({
      points: roundedRectPoints(BODY.w * r.sx, BODY.h * r.sy, r.r, 10),
      z: r.z,
      y: r.y,
    })),
    true,
  );

  /* Rear connector recess plus the moulded boss the signal cable leaves
     through. Restrained — barely visible at the staging angle, and it only
     has to stop the back being a blank plate. */
  const backR = REAR_RINGS[REAR_RINGS.length - 1];
  const connector = slab(BODY.w * backR.sx * 0.52, BODY.h * backR.sy * 0.3, 0.05, 0.05, 0.01);
  bake(connector, [0, backR.y - 0.18, REAR_Z - 0.01]);

  const boss = new THREE.CylinderGeometry(0.11, 0.13, 0.07, 18, 1, false);
  boss.rotateX(Math.PI / 2);
  bake(boss, [0.42, backR.y + 0.2, REAR_Z - 0.015]);

  /* ------------------------------------------------------- moulding --- */

  /* The seam between the two castings: a real groove, four rings deep, so
     it catches its own shadow terminator as the object turns. Cream plastic
     grooves are warm mid-tones — a dark line here reads as printed trim. */
  const seamRing = (s: number, z: number) => ({
    points: roundedRectPoints(BODY.w * s, BODY.h * s, 0.26, 10),
    z,
  });
  const seam = loft(
    [
      seamRing(0.995, CASTING_BACK_Z + 0.012),
      seamRing(0.972, CASTING_BACK_Z - 0.004),
      seamRing(0.972, CASTING_BACK_Z - 0.026),
      seamRing(0.994, CASTING_BACK_Z - 0.042),
    ],
    false,
  );

  /* ---------------------------------------------------- ventilation --- */

  const plates: THREE.BufferGeometry[] = [];
  const floors: THREE.BufferGeometry[] = [];

  /* top deck */
  {
    const v = VENTS.top;
    const { y, slope } = topAt(v.z0);
    const tilt = Math.atan(slope);
    const plate = slottedPlate(v.count, v.w, v.len, v.gap, v.depth, 0.07);
    // Local +Z becomes the surface normal; local +Y becomes −Z (rearward).
    bake(plate, [0, y - v.depth / 2 + 0.006, v.z0], [-Math.PI / 2 - tilt, 0, 0]);
    plates.push(plate);

    const floor = slab((v.count - 1) * v.gap + v.w + 0.12, v.len + 0.08, 0.02, 0.03, 0.006);
    bake(floor, [0, y - v.depth - 0.03, v.z0], [-Math.PI / 2 - tilt, 0, 0]);
    floors.push(floor);
  }

  /* flanks, both sides */
  for (const sign of [-1, 1]) {
    const v = VENTS.side;
    const { x, slope } = sideAt(v.z0);
    const tilt = Math.atan(slope);
    const plate = slottedPlate(v.count, v.w, v.len, v.gap, v.depth, 0.06);
    /* Two rotations: roll the slot row upright, then swing the plate onto
       the flank and tip it by the taper so it lies flat on a surface that
       is not parallel to anything. */
    bake(
      plate,
      [sign * (x - v.depth / 2 + 0.006), 0.14, v.z0],
      [0, sign * (Math.PI / 2 - tilt), Math.PI / 2],
    );
    plates.push(plate);

    const floor = slab(v.len + 0.08, (v.count - 1) * v.gap + v.w + 0.1, 0.02, 0.03, 0.006);
    bake(
      floor,
      [sign * (x - v.depth - 0.03), 0.14, v.z0],
      [0, sign * (Math.PI / 2 - tilt), 0],
    );
    floors.push(floor);
  }

  /* The second housing seam the brief asks for: the line where the
     swivel neck lands on the foot. A real base is two mouldings and the
     join is visible from the front, low in the frame. One inset ring,
     0.012 deep — enough to catch a shadow, not enough to read as a
     drawn line. */
  const baseJoin = slab(
    BASE.neck.w - 0.05,
    BASE.neck.d - 0.05,
    0.022,
    BASE.neck.r,
    0.006,
  );
  bake(baseJoin, [0, BASE.topY - BASE.neck.h + 0.006, 0], [Math.PI / 2, 0, 0]);

  return {
    bezel: merge([casting, stepPlate]),
    wall,
    rear: merge([rear, boss]),
    seam: merge([seam, baseJoin]),
    ventPlate: merge(plates),
    ventFloor: merge([...floors, connector]),
  };
}

/* ================================================================= screen */

export interface ScreenGeometry {
  glass: THREE.BufferGeometry;
  image: THREE.BufferGeometry;
  mask: THREE.BufferGeometry;
}

/**
 * Three concentric curved surfaces at three different depths, all generated
 * from the same outline function the bezel aperture was cut with, so they
 * cannot drift out of agreement.
 *
 * WHY THREE AND NOT ONE
 * ---------------------
 * Thickness. A single textured plane with a reflection baked into it always
 * reads as a printed panel, because the reflection and the image sit at
 * exactly the same depth: move the camera and they track together, which
 * real glass never does. Separating them by 0.08 world units — about 10mm
 * at this scale — means the highlight slides across the picture as the
 * monitor turns. That parallax IS the glass, and it costs one draw call.
 *
 * The mask behind them is what stops the picture reading as a sticker on
 * the bezel: real tubes have an unlit border between the raster and the
 * aperture, and its absence is immediately, if inexplicably, wrong.
 */
export function buildScreen(): ScreenGeometry {
  const a = SCREEN.w / 2;
  const b = SCREEN.h / 2;

  return {
    glass: tubeFaceGeometry(
      a * SCREEN.glassOversize,
      b * SCREEN.glassOversize,
      SCREEN.n,
      SCREEN.bulge * SCREEN.glassOversize,
      34,
    ),
    /* Denser grid than the others: this is the surface the shader's
       distortion terms ride on, and a coarse mesh makes the curvature step
       rather than sweep. */
    image: tubeFaceGeometry(
      a * SCREEN.imageInset,
      b * SCREEN.imageInset,
      SCREEN.n,
      SCREEN.bulge * SCREEN.imageInset,
      44,
    ),
    mask: tubeFaceGeometry(a * 0.998, b * 0.998, SCREEN.n, SCREEN.bulge * 0.998, 24),
  };
}

/* =============================================================== controls */

export interface ControlsGeometry {
  /** The recessed fascia insert, with the speaker slots cut through it. */
  panel: THREE.BufferGeometry;
  /** The cavity behind the slots. */
  panelFloor: THREE.BufferGeometry;
  /** Four identical secondary buttons. */
  buttons: THREE.BufferGeometry;
  /** Raised blank badge plinths, lower left. Not part of the panel. */
  badges: THREE.BufferGeometry;
  power: THREE.BufferGeometry;
  ledLens: THREE.BufferGeometry;
  led: THREE.BufferGeometry;
}

/**
 * Lower right of the bezel, which is where it was on almost every monitor
 * of the period, for the same reason: right-handed reach with the screen
 * unobstructed.
 *
 * WHAT IS DELIBERATELY ABSENT is typography. Not one printed character
 * anywhere on the object. Silk-screened control labels at this scale would
 * be two or three pixels tall — illegible, and the only way to make them
 * readable is to make them oversized, at which point the monitor looks like
 * a toy. The moulded shapes carry the meaning, exactly as they do at arm's
 * length on the real thing, and it keeps the object free of branding.
 *
 * Every button is a real solid with a chamfered top standing out of a
 * panel that is itself recessed into a hole cut through the casting. A
 * button drawn as a dark rectangle reads as a sticker from any angle that
 * is not dead-on, and this object is staged at 19°.
 */
export function buildControls(): ControlsGeometry {
  const c = CONTROLS;
  const L = solvePanel();

  /* ---------------------------------------------------- the insert ---
     One moulding. The speaker slots are holes in THIS part, not in a
     neighbouring plate dropped alongside it — that is the whole
     difference between a fascia and a collection of fittings, and it
     costs nothing because the extruder cuts holes anyway.

     A small bevel: a slot is far narrower than the casting's own 0.035
     edge bevel, which would close it up entirely. */
  const panelShape = roundedRectShape(L.width, PANEL.h, PANEL.r, PANEL.r);
  const gr = PANEL.grille;
  const rowW = (gr.count - 1) * gr.pitch + gr.slotW;
  for (let i = 0; i < gr.count; i += 1) {
    const sx = L.grilleX - L.centre - rowW / 2 + gr.slotW / 2 + i * gr.pitch;
    panelShape.holes.push(rectHole(sx, 0, gr.slotW, gr.slotH, gr.slotW * 0.45));
  }
  const panel = extrudeCentred(panelShape, PANEL.depth, 0.004, 8);
  bake(panel, [L.centre, PANEL.y, FRONT_Z - PANEL.recess - PANEL.depth / 2]);

  const panelFloor = slab(gr.w + 0.06, gr.slotH + 0.05, 0.02, 0.02, 0.006);
  bake(panelFloor, [L.grilleX, PANEL.y, FRONT_Z - PANEL.recess - PANEL.depth - 0.006]);

  /* ------------------------------------------------- the buttons -----
     Four identical parts on one pitch. Identical is the point: the
     previous set gave the middle two extra travel as a "most used"
     detail, which at this size reads as two of them being slightly
     broken. A moulded panel's buttons all come out of the same cavity. */
  const buttons: THREE.BufferGeometry[] = [];
  const b = PANEL.button;
  for (const bx of L.buttonX) {
    const btn = extrudeCentred(roundedRectShape(b.w, b.h, 0.018, 0.018), b.depth, 0.009, 6);
    bake(btn, [bx, PANEL.y, FRONT_Z - PANEL.recess + b.proud - b.depth / 2]);
    buttons.push(btn);
  }

  /* --------------------------------------------------- power switch --
     Larger than the secondaries and standing further out of the panel,
     but still behind the casting face. No separate raised surround any
     more: it belongs to the fascia now, not beside it. */
  const p = PANEL.power;
  const powerBtn = extrudeCentred(
    roundedRectShape(p.w, p.h, 0.03, 0.03),
    p.depth,
    0.012,
    8,
  );

  /* The one symbol on the object, and it is geometry rather than a
     texture — a shallow raised ring with a gap, which is what it was on
     the real mouldings. */
  const ring = new THREE.TorusGeometry(0.03, 0.0065, 6, 18, Math.PI * 1.55);
  ring.rotateZ(Math.PI * 0.72);
  bake(ring, [0, 0, p.depth / 2 - 0.002]);
  const bar = new THREE.BoxGeometry(0.0075, 0.03, 0.012);
  bake(bar, [0, 0.013, p.depth / 2 - 0.002]);

  /* ------------------------------------------------------- badges ----
     Left of the fascia and deliberately not part of it: these are where
     the logo and the model sticker went, and on a real set they are a
     different feature of the moulding, not a control. */
  const badges: THREE.BufferGeometry[] = [];
  const badge = slab(c.badge.w, c.badge.h, 0.03, 0.014, 0.008);
  bake(badge, [c.badge.x, c.badge.y, FRONT_Z - 0.004]);
  badges.push(badge);
  const plate = slab(0.19, 0.075, 0.026, 0.012, 0.006);
  bake(plate, [c.badge.x + c.badge.w / 2 + 0.17, c.badge.y, FRONT_Z - 0.006]);
  badges.push(plate);

  return {
    panel,
    panelFloor,
    buttons: merge(buttons),
    badges: merge(badges),
    power: merge([powerBtn, ring, bar]),
    ledLens: new THREE.SphereGeometry(
      PANEL.led.r * 1.15,
      16,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.55,
    ),
    led: new THREE.CylinderGeometry(PANEL.led.r, PANEL.led.r, 0.02, 16),
  };
}

/* =================================================================== base */

/**
 * Two mouldings: a short neck the body sits on, and a wide chamfered foot.
 *
 * The neck is the part that matters. Without it the monitor looks glued to
 * a tray; with it the body reads as something that can be tilted, and the
 * shadow gap under the casting gives the object a sense of weight bearing
 * down. It is 0.13 units — about 16mm — which is all a real swivel collar
 * was.
 *
 * The foot is deliberately smaller in plan than the body above it. Real
 * bases were, and the resulting overhang is what makes the monitor look
 * like it is perching on a desk rather than sitting in a box.
 */
export function buildBase(): THREE.BufferGeometry {
  const neck = slab(BASE.neck.w, BASE.neck.d, BASE.neck.h, BASE.neck.r, 0.03);
  // Extruded in XY then laid flat: the profile is the PLAN of the neck.
  bake(neck, [0, BASE.topY - BASE.neck.h / 2, 0], [Math.PI / 2, 0, 0]);

  const foot = slab(BASE.foot.w, BASE.foot.d, BASE.foot.h, BASE.foot.r, 0.038);
  bake(foot, [0, BASE.topY - BASE.neck.h - BASE.foot.h / 2, 0], [Math.PI / 2, 0, 0]);

  return merge([neck, foot]);
}

/* =================================================================== hull */

let HULL: THREE.Vector3[] | null = null;

/** Directions sampled for the support map. Fibonacci sphere. */
const HULL_DIRS = 256;

/**
 * THE POINTS THE CAMERA IS FITTED TO
 * ==================================
 *
 * A support-mapped approximation of the object's 3D convex hull: for each
 * of 256 directions spread evenly over the sphere, the single vertex that
 * is furthest along it. Every extreme the camera can ever see is in that
 * set, because the extreme of a point cloud in any view direction is
 * always a hull vertex — and a hull vertex is, by definition, the support
 * point of some direction.
 *
 * 35,000 vertices in, about 200 distinct points out, computed once.
 *
 * WHY NOT A HANDFUL OF DECLARED BOXES
 * -----------------------------------
 * Because that is what this was, and it cost a third of the hero.
 *
 * A box around a tapering, corner-radiused shell has corners where the
 * object has none. At a 22° stage yaw the phantom rear-left corner of the
 * rear-housing box projected 0.53 world units outside anything solid. The
 * fit solver did exactly what it was asked and packed the phantom: the
 * monitor rendered at 69% of the frame width instead of 98%.
 *
 * Splitting it into more boxes did not fix it, it only moved the error —
 * the next version paired the casting's front corner with the base's
 * bottom, a combination that exists in no box but in the union of two,
 * and gave away 25% instead of 31%. The lesson is that any DECLARED
 * envelope is a second source of truth about the object's shape, and it
 * will disagree with the geometry. Measuring cannot.
 *
 * Cost: one throwaway build of the meshes plus one pass per direction —
 * about 40ms, once, inside a chunk that has already been fetched
 * asynchronously. The result is cached for the session.
 */
export function hullPoints(): THREE.Vector3[] {
  if (HULL) return HULL;

  const housing = buildHousing();
  const controls = buildControls();
  const base = buildBase();

  /* Interior surfaces are excluded: the tube face and the lamp sit well
     inside the casting and can only loosen the fit. The power switch is
     included because it genuinely stands proud of the front. */
  const sources: [THREE.BufferGeometry, THREE.Vector3 | null][] = [
    [housing.bezel, null],
    [housing.rear, null],
    [housing.seam, null],
    [housing.ventPlate, null],
    [controls.badges, null],
    [controls.panel, null],
    [
      controls.power,
      new THREE.Vector3(
        CONTROLS.power.x,
        CONTROLS.power.y,
        FRONT_Z + CONTROLS.power.depth / 2 - 0.006,
      ),
    ],
    [base, null],
  ];

  /* Flatten to a plain array once — repeatedly reading through
     BufferAttribute accessors 256 times over is the slow way to do this. */
  let n = 0;
  for (const [geo] of sources) n += (geo.getAttribute("position") as THREE.BufferAttribute).count;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const zs = new Float32Array(n);
  let w = 0;
  for (const [geo, offset] of sources) {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const ox = offset?.x ?? 0;
    const oy = offset?.y ?? 0;
    const oz = offset?.z ?? 0;
    for (let i = 0; i < pos.count; i += 1, w += 1) {
      xs[w] = pos.getX(i) + ox;
      ys[w] = pos.getY(i) + oy;
      zs[w] = pos.getZ(i) + oz;
    }
  }

  const seen = new Set<number>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let d = 0; d < HULL_DIRS; d += 1) {
    const yy = 1 - (d / (HULL_DIRS - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - yy * yy));
    const th = golden * d;
    const dx = Math.cos(th) * r;
    const dy = yy;
    const dz = Math.sin(th) * r;

    let best = -Infinity;
    let bestI = 0;
    for (let i = 0; i < n; i += 1) {
      const p = xs[i] * dx + ys[i] * dy + zs[i] * dz;
      if (p > best) {
        best = p;
        bestI = i;
      }
    }
    seen.add(bestI);
  }

  HULL = [];
  seen.forEach((i) => {
    HULL!.push(new THREE.Vector3(xs[i], ys[i], zs[i]));
  });

  [
    housing.bezel,
    housing.wall,
    housing.rear,
    housing.seam,
    housing.ventPlate,
    housing.ventFloor,
  ].forEach((g) => g.dispose());
  Object.values(controls).forEach((g) => g.dispose());
  base.dispose();

  return HULL;
}

/* ================================================================ monitor */

export interface MonitorGeometry {
  housing: HousingGeometry;
  screen: ScreenGeometry;
  controls: ControlsGeometry;
  base: THREE.BufferGeometry;
  /** Origin of the power switch group — the rig translates it when pressed. */
  powerOrigin: [number, number, number];
  /** Origin of the status lamp group. */
  ledOrigin: [number, number, number];
  dispose: () => void;
}

/**
 * The whole machine's buffers, built once and SHARED BY BOTH UNITS.
 *
 * Two monitors on the page cost two sets of draw calls and one set of
 * vertex buffers. Building per unit would have doubled about 35,000
 * triangles of extrusion, lofting and boolean-ish shape work — roughly
 * 25ms of main-thread time and a few megabytes of GPU memory — to produce
 * two byte-identical copies. Everything that has to differ between the
 * machines (materials, canvas, shader uniforms, shadow, lighting) is
 * per-unit and cheap; the expensive thing is shared.
 */
export function buildMonitor(): MonitorGeometry {
  const panelLayout = solvePanel();
  const housing = buildHousing();
  const screen = buildScreen();
  const controls = buildControls();
  const base = buildBase();

  const all: THREE.BufferGeometry[] = [
    ...Object.values(housing),
    ...Object.values(screen),
    ...Object.values(controls),
    base,
  ];

  return {
    housing,
    screen,
    controls,
    base,
    /* Both taken from the solved layout, so the rig's press animation
       and the lamp follow the fascia automatically if it is ever
       re-proportioned. The rig itself is untouched. */
    powerOrigin: [
      panelLayout.powerX,
      PANEL.y,
      FRONT_Z - PANEL.recess + PANEL.power.proud - PANEL.power.depth / 2,
    ],
    ledOrigin: [panelLayout.ledX, PANEL.y, FRONT_Z - PANEL.recess - PANEL.led.depth + 0.028],
    dispose: () => all.forEach((g) => g.dispose()),
  };
}
