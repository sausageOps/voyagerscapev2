/**
 * PROPORTION MAP — SVG hero → 3D world units
 * ==========================================
 *
 * Stage 1 used the existing SVG camera (`components/HomeConnect/Camera.tsx`)
 * as the single source of proportional truth, and Stage 1B keeps that: the
 * silhouette, the two-tone split and the lens placement are unchanged. What
 * changed is the *articulation* — the object is now built as a machined
 * assembly of stepped parts rather than a shell with things laid on it.
 *
 * SVG reference frame: viewBox "0 0 340 300".
 *   body shell   x 40 → 300   (260 wide)
 *   body shell   y 82 → 250   (168 tall)
 *   lens centre  (148, 176), outer radius 60
 *   prism hump   x 120 → 182, y 60 → 75
 *   viewfinder   x 60 → 102,  y 92 → 113
 *   mode dial    (228, 102) r 14
 *   shutter      (266, 102)  r 12 collar / 8.6 button
 *
 * World mapping: the 260-unit body width becomes 3.00 world units, and the
 * body centre (170, 166) becomes the origin. Every dimension below is derived
 * through `toX / toY / toL` so the numbers stay traceable back to the SVG.
 */

/** SVG body bounds. */
const X0 = 40;
const X1 = 300;
const Y0 = 82;
const Y1 = 250;

/** Body width in world units — the master scale. */
export const BODY_W = 3.0;

/** World units per SVG unit. */
const S = BODY_W / (X1 - X0);

const CX = (X0 + X1) / 2; // 170
const CY = (Y0 + Y1) / 2; // 166

/** SVG x → world x (body centred on origin). */
export const toX = (x: number) => (x - CX) * S;
/** SVG y → world y (SVG y grows downward, world y grows upward). */
export const toY = (y: number) => -(y - CY) * S;
/** SVG length → world length. */
export const toL = (l: number) => l * S;

/* ---------------------------------------------------------------- body ---- */

export const BODY = {
  w: BODY_W,
  h: toL(Y1 - Y0), // 1.938
  /** Depth is the one value the SVG cannot give us — a compact camera body
   *  runs a little over half its own height deep. */
  d: 1.02,
  /** Corner radii: tight at the top deck, generous at the base, matching the
   *  moulded silhouette of the SVG body path. */
  rTop: 0.12,
  rBot: 0.22,
  /** Bevel that rounds every edge — this is what stops it reading as a box.
   *  Kept tight: a large bevel tips the object from "designed instrument"
   *  into "soft toy". */
  bevel: 0.042,
} as const;

/** Front face plane (the flat area inside the bevel). */
export const FRONT_Z = BODY.d / 2;
export const TOP_Y = BODY.h / 2;

/* ------------------------------------------------------------ top plate ---- */

/**
 * The single most effective "designed object" cue available here: real
 * cameras are not one moulding, they are a body with a separate top plate
 * fixed to it. Giving the deck its own slab — marginally *proud* of the body
 * on every side, with a recessed shadow gap underneath — produces a
 * continuous seam line that wraps the front, both flanks and the back.
 *
 * Without shadow maps the overhang cannot cast its own shadow, so the gap is
 * modelled: a slightly undersized slab in a dark matte material sits in the
 * step, and reads as the groove between the two castings.
 */
export const TOP_PLATE = {
  /** Where the plate parts from the body. Held well clear of the leatherette
   *  top edge (y 0.508) so the seam and the two-tone split do not crowd each
   *  other into one busy band. */
  fromY: toY(110), // 0.646
  /** Proud of the body on every side. Tiny — 12 thousandths of the width. */
  overhang: 0.013,
  /** Depth of the recessed seam groove band. */
  gapH: 0.05,
  /** How far the groove sits back from the body surface. */
  gapInset: 0.012,
} as const;

/* ------------------------------------------------- front leatherette ---- */
/** In the SVG the dark panel starts at y=122 and runs to the body base. */
/**
 * The leatherette is an APPLIED PANEL, not a painted band: it stops short of
 * the body edges on the left, right and bottom, so a cream border runs all
 * the way round it.
 *
 * This is the single biggest "designed object" move on the front face. A
 * full-bleed dark band reads as a two-tone paint job; an inset panel with a
 * visible border and its own lit chamfer reads as a covering fitted to a
 * casting. It also breaks the object into three horizontal bands — cream
 * deck, dark wrap, cream base — instead of two.
 */
export const PANEL = {
  topY: toY(122), // 0.508
  botY: -BODY.h / 2 + 0.072,
  w: BODY_W - 0.12,
  rTop: 0.05,
  rBot: 0.15,
  /** Proud of the front face so it catches its own edge highlight. */
  proud: 0.02,
  thickness: 0.055,
} as const;

/* --------------------------------------------------------- lens plinth ---- */

/**
 * A raised boss the lens grows out of. Previously the barrel simply pierced a
 * flat wall, which is the main reason the assembly read as "a cylinder placed
 * near a box" — mounting hardware is what makes a lens look attached.
 */
export const PLINTH = {
  r: 0.76,
  /** ABSOLUTE z, not relative. These read as offsets from the front face and
   *  they are not — writing them raw buried the whole boss inside the body,
   *  which is a silent failure: it compiles, it renders, you just never see
   *  the part. Everything in LENS_Z is absolute for the same reason. */
  from: FRONT_Z - 0.02,
  to: FRONT_Z + 0.062,
  /** Chamfered outer edge. */
  chamfer: 0.03,
} as const;

/* ---------------------------------------------------------------- lens ---- */

export const LENS = {
  x: toX(148), // -0.254
  /** Lifted 3 SVG units off the traced centre so the mounting boss clears
   *  the bottom edge of the inset leatherette panel. */
  y: toY(170), // -0.046
  /**
   * Radii, outer → inner. The stack is deliberately NOT monotonic: it steps
   * in to a waist at the aperture ring, back out to a proud focus ring, then
   * down again to the bezel. A monotonic taper reads as a traffic cone; the
   * waist-and-shoulder profile is what reads as a lens.
   */
  rMount: 0.706,
  rApRing: 0.652,
  rBarrel: 0.632,
  /** The widest thing forward of the mount — deliberately proud so it throws
   *  a shadow line on both sides and reads as a separate, grippable ring. */
  rFocus: 0.690,
  rStep: 0.612,
  rBezel: 0.582,
  /** Bore. */
  rMouth: 0.522,
  rThroat: 0.500,
  rGlass: 0.505,
} as const;

/**
 * Lens z-stack, front face outward. Total protrusion is ~0.61 against a body
 * depth of 1.02 — a compact camera with a real lens, not a telephoto.
 */
export const LENS_Z = {
  mount: { from: FRONT_Z + 0.03, to: FRONT_Z + 0.142 },
  apRing: { from: FRONT_Z + 0.138, to: FRONT_Z + 0.206 },
  barrel: { from: FRONT_Z + 0.202, to: FRONT_Z + 0.288 },
  focus: { from: FRONT_Z + 0.284, to: FRONT_Z + 0.464 },
  step: { from: FRONT_Z + 0.46, to: FRONT_Z + 0.545 },
  bezel: { from: FRONT_Z + 0.541, to: FRONT_Z + 0.606 },

  /** Bore interior. */
  mouth: FRONT_Z + 0.545,
  throat: { from: FRONT_Z + 0.1, to: FRONT_Z + 0.46 },

  /** Iris sits mid-bore, clearly behind the glass but well inside the mouth. */
  irisPlane: FRONT_Z + 0.3,
  irisBack: FRONT_Z + 0.13,

  /** Front element, recessed behind the bezel lip. */
  glassApex: FRONT_Z + 0.548,
  /** Deepest point of the concave second element. */
  innerApex: FRONT_Z + 0.34,
} as const;

/** Iris: seven straight-edged blades forming a heptagonal opening. */
export const IRIS = {
  blades: 7,
  opening: 0.19,
  /** Tips overlap the bore wall so no gap shows at the rim. `reach` and
   *  `halfWidth` are bounded: a blade's outer CORNER sits at
   *  hypot(halfWidth, reach) ≈ 0.573, which must stay under `rBezel` (0.582)
   *  or the corners peek out past the bezel face at off-axis view angles. */
  reach: 0.51,
  halfWidth: 0.26,
  thickness: 0.012,
  /** Blades physically stack — a hair of z per blade avoids coplanar fighting. */
  stack: 0.0018,
} as const;

/** Knurl bands. */
export const KNURL = {
  focus: 64,
  dial: 30,
} as const;

/* -------------------------------------------------------- prism hump ---- */

/**
 * Trapezoidal, not a rounded box: the sides draft inward toward the top and
 * the front face is canted. A straight rounded box on a lid is the single
 * most "primitive-looking" element a camera model can have.
 */
export const HUMP = {
  x: toX(151),
  /** Width at the base / width at the top. */
  wBase: 0.9,
  wTop: 0.68,
  rise: 0.17,
  d: 0.6,
  z: 0.08,
  r: 0.05,
} as const;

/** Rangefinder window on the face of the hump. */
export const HUMP_WINDOW = {
  x: toX(151),
  y: toY(67),
  w: toL(48),
  h: toL(13),
} as const;

/* ------------------------------------------------------------ controls ---- */

export const VIEWFINDER = {
  x: toX(81),
  y: toY(102.5),
  w: toL(42),
  h: toL(21),
} as const;

export const TALLY = {
  x: toX(114),
  y: toY(103),
  r: toL(3.4),
} as const;

export const DIAL = {
  x: toX(230),
  z: -0.055,
  r: 0.185,
  h: 0.108,
  /** Machined recess in the top face. Wide, so the brushed face still reads
   *  as a face once the deck is foreshortened. */
  rInner: 0.142,
} as const;

export const SHUTTER = {
  x: toX(268),
  z: -0.045,
  rCollar: 0.152,
  rButton: 0.1,
  h: 0.07,
} as const;

/**
 * Moulded rubber grip, right flank of the front panel. Stage 1 used two thin
 * ribs, which at hero size rendered as two stray scratches. A single inset
 * pad carrying fine ridges reads as a designed grip instead.
 */
export const GRIP = {
  x: toX(278),
  y: toY(186),
  w: toL(20),
  h: toL(100),
  r: 0.035,
  ridges: 6,
  proud: 0.026,
} as const;

/** Two recessed screws, bottom-left — deliberately the only "hardware". */
export const SCREWS = {
  xs: [toX(62), toX(76)],
  y: toY(238),
  r: toL(2.8),
} as const;

/** Abstract recessed windows on the right of the panel. No glyphs, ever. */
export const READOUT = {
  x: toX(238),
  y: toY(206),
  w: toL(48),
  h: toL(36),
} as const;

export const COUNTER = {
  x: toX(238),
  y: toY(162),
  w: toL(48),
  h: toL(22),
} as const;

/** Strap lugs on the extreme left/right flanks. */
export const LUG = {
  y: toY(100),
  w: 0.075,
  h: toL(9),
  d: 0.125,
} as const;

/** Shallow door seam on the right flank — one line, not a panel-gap festival. */
export const FLANK_SEAM = {
  z: -0.12,
  from: -BODY.h / 2 + 0.1,
  to: TOP_PLATE.fromY - 0.06,
  w: 0.018,
} as const;

/* ------------------------------------------------------------- staging ---- */

/**
 * Presentation: a restrained three-quarter product view. The yaw turns the
 * right flank toward the viewer so the body reads as a solid with depth while
 * the lens stays close to circular; the camera itself sits slightly above and
 * looks down, which is what makes the ground shadow read as a ground shadow.
 */
export const STAGING = {
  yaw: -0.38,
  roll: 0.016,
  /**
   * Camera height as a fraction of its distance (≈14° downward).
   *
   * Raised from 0.2 in Stage 1B. At 11° the top plate was so foreshortened
   * that anything lying flat on it — the counter window, the dial's brushed
   * top face, the dome of the shutter button — collapsed to a two-pixel
   * sliver and simply could not be seen. Deck detail is only worth modelling
   * at an angle that shows the deck.
   */
  lookDown: 0.25,
  targetY: -0.03,
  fov: 26,
  /** Fraction of the frame the object is allowed to occupy (NDC half-extent). */
  fill: 0.94,
} as const;

/**
 * Local-space extents of the assembled object, used by the fit solver.
 * Generous on +Z because the lens protrudes toward the camera and therefore
 * magnifies — a naive width/height fit crops it every time.
 */
export const OBJECT_BOUNDS = {
  min: [-BODY_W / 2 - 0.07, -toL(168) / 2 - 0.02, -0.58] as const,
  max: [BODY_W / 2 + 0.07, toL(168) / 2 + 0.24, 1.16] as const,
};

/** Ground plane height for the contact shadow. */
export const GROUND_Y = -BODY.h / 2 - 0.045;
