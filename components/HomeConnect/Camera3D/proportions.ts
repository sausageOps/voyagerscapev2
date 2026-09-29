/**
 * PROPORTION MAP — SVG hero → 3D world units
 * ==========================================
 *
 * Stage 1 uses the existing SVG camera (`components/HomeConnect/Camera.tsx`)
 * as the single source of proportional truth. That object was art-directed and
 * verified, so rather than re-designing the silhouette we translate its
 * measurements directly and then give them real depth.
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

/* ------------------------------------------------- front leatherette ---- */
/** In the SVG the dark panel starts at y=122 and runs to the body base. */
export const PANEL = {
  topY: toY(122), // 0.508
  botY: -BODY.h / 2 + BODY.bevel,
  w: BODY_W - BODY.bevel * 2,
  rBot: 0.26,
  /** Proud of the front face so it catches its own edge highlight. */
  proud: 0.022,
  thickness: 0.05,
} as const;

/* ---------------------------------------------------------------- lens ---- */

export const LENS = {
  x: toX(148), // -0.254
  y: toY(176), // -0.115
  /** Radii, outer → inner, straight off the SVG circles. */
  rMount: toL(60), // 0.692
  rBarrel: toL(54), // 0.623
  rFocus: toL(52.5), // 0.606
  rBezel: toL(49), // 0.565
  rThroat: toL(43.8), // 0.505
  rGlass: toL(43.3), // 0.500
} as const;

/**
 * Lens z-stack, front face outward. Total protrusion is ~0.55 against a body
 * depth of 1.02 — a compact camera, not a telephoto.
 */
export const LENS_Z = {
  mount: { from: FRONT_Z - 0.015, to: FRONT_Z + 0.115 },
  barrel: { from: FRONT_Z + 0.1, to: FRONT_Z + 0.3 },
  focus: { from: FRONT_Z + 0.29, to: FRONT_Z + 0.46 },
  bezel: { from: FRONT_Z + 0.45, to: FRONT_Z + 0.555 },
  throat: { from: FRONT_Z + 0.03, to: FRONT_Z + 0.47 },
  irisPlane: FRONT_Z + 0.17,
  irisBack: FRONT_Z + 0.05,
  /** Apex of the glass dome, just inside the bezel lip. */
  glassApex: FRONT_Z + 0.49,
} as const;

/** Iris: seven straight-edged blades forming a heptagonal opening. */
export const IRIS = {
  blades: 7,
  opening: 0.155,
  reach: 0.46,
  halfWidth: 0.28,
  thickness: 0.01,
  /** Blades physically stack — a hair of z per blade avoids coplanar fighting. */
  stack: 0.0016,
} as const;

/* -------------------------------------------------------- prism hump ---- */

export const HUMP = {
  x: toX(151),
  w: 0.82,
  /** Rises above the top deck. Low and integrated, not a block on a lid. */
  rise: 0.2,
  d: 0.58,
  z: 0.1,
  r: 0.085,
} as const;

/** Rangefinder window on the face of the hump. */
export const HUMP_WINDOW = {
  x: toX(151),
  y: toY(67.5),
  w: toL(62),
  h: toL(15),
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
  x: toX(228),
  z: -0.05,
  r: toL(14), // 0.162
  h: 0.08,
  detents: 12,
} as const;

export const SHUTTER = {
  x: toX(266),
  z: -0.04,
  rCollar: toL(12.5), // 0.144
  rButton: toL(8.6), // 0.099
  h: 0.06,
} as const;

/** Moulded grip ribs at the right edge of the leatherette. */
/**
 * Moulded grip, right flank. Two ribs, not three: they must clear the readout
 * window on their left (which ends at x=toX(280)) AND the body's rounded
 * corner below, and three ribs cannot satisfy both without crowding one or
 * the other.
 */
export const GRIP = {
  xs: [toX(291), toX(284)],
  y: toY(184),
  h: toL(70),
  w: toL(3.6),
} as const;

/** Two recessed screws, bottom-left — deliberately the only "hardware". */
export const SCREWS = {
  xs: [toX(62), toX(76)],
  y: toY(238),
  r: toL(2.8),
} as const;

/** Abstract recessed windows on the right of the panel. No glyphs, ever. */
export const READOUT = {
  x: toX(252),
  y: toY(208),
  w: toL(56),
  h: toL(40),
} as const;

export const COUNTER = {
  x: toX(252),
  y: toY(162),
  w: toL(56),
  h: toL(24),
} as const;

/** Strap lugs on the extreme left/right flanks. */
export const LUG = {
  y: toY(102),
  w: 0.07,
  h: toL(9),
  d: 0.12,
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
   * Camera height as a fraction of its distance (≈11° downward). Enough to
   * open up the top deck — the mode dial and the pink shutter are the payoff
   * for a three-quarter view, and at a shallower angle you lose them.
   */
  lookDown: 0.2,
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
  min: [-BODY_W / 2 - 0.06, -toL(168) / 2 - 0.02, -0.56] as const,
  max: [BODY_W / 2 + 0.06, toL(168) / 2 + 0.24, 1.1] as const,
};

/** Ground plane height for the contact shadow. */
export const GROUND_Y = -BODY.h / 2 - 0.045;
