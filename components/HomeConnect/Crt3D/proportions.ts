/**
 * VOYAGERSCAPE CRT — proportion map
 * =================================
 *
 * THROWAWAY VISUAL EXPERIMENT. All dimensions are in world units, with the
 * object centred on the origin and resting on the ground plane. The object is
 * a large, deep, retro-futuristic visual terminal — read as a machine, not a
 * television: a stepped funnel body, a recessed curved screen, a control
 * fascia, side vents, a rear connector cluster, and one signature component
 * (the "signal sphere" gimbal) that makes it unmistakably Voyagerscape.
 *
 * Coordinate convention:
 *   +x right, +y up, +z toward the viewer.
 *   The screen faces +z. The body funnels back into −z.
 */

const DEG = Math.PI / 180;

/* ----------------------------------------------------------------- body ---- */

/** Front face extents — the master scale. A landscape 4:3-ish face. */
export const FACE_W = 4.0;
export const FACE_H = 3.05;

/** The flat front plane the bezel + fascia are mounted on. */
export const FRONT_Z = 1.06;

/** Stepped funnel body: each step is a bevelled extruded rounded rect. The
 *  taper from a big face to a small neck is what reads as a CRT rather than a
 *  flat-panel monitor. */
export const SHELL = {
  front: { w: FACE_W, h: FACE_H, depth: 0.62, z: FRONT_Z - 0.31, rTop: 0.16, rBot: 0.22 },
  mid: { w: 3.58, h: 2.66, depth: 1.02, z: FRONT_Z - 1.1, rTop: 0.2, rBot: 0.26 },
  rear: { w: 2.72, h: 1.98, depth: 0.72, z: FRONT_Z - 1.86, rTop: 0.22, rBot: 0.24 },
  cap: { w: 2.5, h: 1.78, depth: 0.14, z: FRONT_Z - 2.26, rTop: 0.2, rBot: 0.2 },
  bevel: 0.05,
} as const;

/** Rearmost z (used by the fit hull). */
export const BACK_Z = FRONT_Z - 2.34;

/* --------------------------------------------------------------- screen ---- */

/**
 * The screen is physically recessed into a dark bezel. Outer bezel frame,
 * then the recess hood, then the curved phosphor face sitting behind the
 * front plane, then a curved glass overlay flush with the aperture.
 */
export const SCREEN = {
  /** Vertical centre of the screen — pushed up so a control fascia band is
   *  left along the bottom of the face. */
  cy: 0.34,
  /** Bezel frame outer size. */
  bezelW: 3.42,
  bezelH: 2.34,
  bezelR: 0.24,
  /** Screen aperture (the hole in the bezel). */
  apW: 2.86,
  apH: 1.86,
  apR: 0.2,
  /**
   * Z-layout, all PROUD of the shell front face (FRONT_Z) so nothing is buried
   * inside the solid extruded shell. The bezel is a thick frame mounted on the
   * face; the phosphor sits recessed inside it; the glass is flush with the
   * bezel front. (See the camera hero's LENS_Z note on absolute-z placement.)
   */
  bezelFront: FRONT_Z + 0.3, // proud front of the bezel ring
  bezelDepth: 0.3,
  backZ: FRONT_Z + 0.03, // dark recess backplate, just proud of the face
  phosphorZ: FRONT_Z + 0.06, // curved phosphor face base
  glassZ: FRONT_Z + 0.12, // curved glass overlay base
  /** Curvature bulge of the glass toward the viewer (world units). */
  bulge: 0.12,
} as const;

/* -------------------------------------------------------- control fascia ---- */

/** Centre line of the fascia band along the bottom of the front face. */
export const FASCIA_Y = -1.16;

/** Three rotary knobs, left of the fascia. */
export const KNOBS = {
  y: FASCIA_Y,
  xs: [-1.52, -1.02, -0.52] as const,
  r: 0.19,
  h: 0.17,
} as const;

/** Two tactile buttons, centre of the fascia. */
export const BUTTONS = {
  y: FASCIA_Y,
  xs: [0.06, 0.44] as const,
  size: 0.24,
  h: 0.11,
} as const;

/** Three stacked indicator LEDs between the buttons and the readout. */
export const LEDS = {
  x: 0.86,
  ys: [FASCIA_Y + 0.26, FASCIA_Y, FASCIA_Y - 0.26] as const,
  r: 0.045,
} as const;

/** Small secondary readout, right of the fascia — its own lit display. */
export const READOUT = {
  x: 1.44,
  y: FASCIA_Y,
  w: 1.0,
  h: 0.5,
  r: 0.06,
  recess: 0.06,
} as const;

/* ------------------------------------------------------------- signature ---- */

/**
 * SIGNAL SPHERE — the signature component.
 *
 * A small glowing lavender orb held in a brass gimbal fork on a short post,
 * mounted at the top of the machine. It reads as a sensor / observatory head,
 * not a control — the "why is this here?" detail. It rotates very slowly and
 * breathes at idle.
 */
export const SIGNATURE = {
  /** Post base sits on the top face, left of centre. */
  x: -1.18,
  /** Top of the front shell. */
  baseY: FACE_H / 2 - 0.06,
  postH: 0.34,
  postR: 0.07,
  /** Fork ring radius (the C that cradles the sphere). */
  forkR: 0.3,
  forkTube: 0.045,
  sphereR: 0.19,
  z: FRONT_Z - 0.5,
} as const;

/* ---------------------------------------------------------------- vents ---- */

/** Louver slots on the top deck of the mid body, toward the back. */
export const VENTS = {
  count: 7,
  x: 0.5,
  /** Sits on the mid-body top surface (h/2 of SHELL.mid). */
  y: SHELL.mid.h / 2,
  z: SHELL.mid.z,
  slotW: 1.5,
  slotD: 0.05,
  pitch: 0.12,
} as const;

/* ----------------------------------------------------------------- base ---- */

export const BASE = {
  /** Ground contact plinth. */
  plateW: 2.9,
  plateD: 1.7,
  plateH: 0.24,
  /** Central neck column connecting body to plinth. */
  neckW: 1.14,
  neckD: 0.95,
  neckH: 0.55,
  /** Depth centre of the base assembly (under the body mass). */
  z: FRONT_Z - 0.72,
} as const;

/** Lowest point of the body casting (front slab bottom). */
export const BODY_BOTTOM = -FACE_H / 2;
/** The neck embeds into the body by this much so it reads as one casting. */
const NECK_EMBED = 0.34;
/** Top of the neck (inside the body). */
export const NECK_TOP = BODY_BOTTOM + NECK_EMBED;
/** Bottom of the neck / top of the plinth. */
export const NECK_BOTTOM = NECK_TOP - BASE.neckH;
/** Ground plane y (bottom of the plinth). */
export const GROUND_Y = NECK_BOTTOM - BASE.plateH;

/* -------------------------------------------------------------- staging ---- */

export const STAGING = {
  /** A gentle three-quarter view so the funnel depth and side vents read. */
  yaw: -0.3,
  pitch: 0.03,
  fov: 32,
  lookDown: 0.13,
  targetY: 0.12,
  /** Fraction of the frame the object may occupy (NDC half-extent). */
  fill: 0.96,
} as const;

/* --------------------------------------------------------------- motion ---- */

export const MOTION = {
  /** Cursor → orientation limits. Restrained — a heavy machine barely turns. */
  maxYaw: 9 * DEG,
  maxPitch: 6 * DEG,
  maxRoll: 2 * DEG,
  rotation: { stiffness: 40, damping: 13 },
  /** Cursor translation (parallax drift). */
  translate: { x: 0.08, y: 0.045 },
  /** Idle breathing. */
  idle: {
    floatY: 0.016,
    floatZ: 0.018,
    driftYaw: 0.01,
    driftPitch: 0.005,
    driftRoll: 0.004,
  },
  /** Depth parallax factors for nested groups (fractions of body rotation). */
  parallax: { screen: 0.16, signature: 0.26, fascia: -0.06 },
  /** Knob press/hover travel and spin. */
  knob: { hover: 0.02, turn: (Math.PI * 2) / 3, stiffness: 120, damping: 16 },
  /** Button press depth. */
  button: { press: 0.06, hover: 0.018, stiffness: 220, damping: 20 },
  /** Signal sphere idle spin (rad/s) and breathing. */
  signature: { spin: 0.34, breathe: 0.9 },
} as const;

/**
 * Fit hull — a small set of boxes swept across the rotation range, packed by
 * the camera solver. Same idea as the camera hero: fit the union of the
 * silhouette across motion so a corner never clips mid-gesture.
 */
export interface HullBox {
  p: number;
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export const OBJECT_HULL: readonly HullBox[] = [
  /* body + front face */
  { p: 1.0, min: [-FACE_W / 2, -FACE_H / 2, BACK_Z], max: [FACE_W / 2, FACE_H / 2, FRONT_Z + 0.02] },
  /* signature gimbal on top */
  {
    p: 1.0,
    min: [SIGNATURE.x - SIGNATURE.forkR, FACE_H / 2, SIGNATURE.z - SIGNATURE.forkR],
    max: [SIGNATURE.x + SIGNATURE.forkR, SIGNATURE.baseY + SIGNATURE.postH + SIGNATURE.forkR * 2, SIGNATURE.z + SIGNATURE.forkR],
  },
  /* base plinth */
  {
    p: 1.0,
    min: [-BASE.plateW / 2, GROUND_Y, BASE.z - BASE.plateD / 2],
    max: [BASE.plateW / 2, BODY_BOTTOM, BASE.z + BASE.plateD / 2],
  },
];

/** Ordered screen states the terminal cycles through on interaction. */
export const SCREEN_STATES = [
  "EXPLORE",
  "IMAGE",
  "SIGNAL",
  "SCAN",
  "OBSERVE",
  "CAPTURE",
  "UNKNOWN",
] as const;

export type ScreenState = (typeof SCREEN_STATES)[number];
