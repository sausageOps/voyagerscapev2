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

  /* --- Stage 2: the iris now actuates ---------------------------------- */

  /**
   * Travel limits for the blade inner edge (the aperture radius).
   *
   * `open` is the fully-open resting aperture. The blades TRANSLATE radially
   * rather than pivot: a pivoting blade swings its outer end out to
   * hypot(halfWidth, reach) and can poke visibly out of the lens barrel.
   * Translation keeps the existing corner budget fixed.
   */
  /** Fully-open resting aperture. This is the single source of truth for the
   * initial seed and the post-shutter return target. */
  open: 0.30,
  /** Shutter actuation. Not fully shut — a real leaf shutter at speed never
   *  reads as a hard black disc, and driving it to zero makes the blade
   *  overlap geometry self-intersect. */
  shut: 0.07,
  /**
   * Static disc sitting one hair behind the blades, in the SAME material.
   *
   * Translating blades inward would otherwise expose a ring of the dark rear
   * stop between the retracted tips and the bore wall — a bright-edged gap
   * that instantly reads as broken geometry. Backing the blades with their
   * own colour means a retracting blade reveals more blade, which is what an
   * iris does.
   */
  backingFrom: 0.28,
  backingTo: 0.498,
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
  /** How far the button's skirt hangs below the collar lip at rest, and how
   *  deep the collar is bored. Both sized so the skirt never clears the bore
   *  at full press (MOTION.shutterButton.press). */
  skirt: 0.055,
  bore: 0.115,
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
  fov: 34,
  /** Fraction of the frame the object is allowed to occupy (NDC half-extent). */
  fill: 0.99,
} as const;

/**
 * Fit volume for the camera solver — a HULL of four boxes, not one box.
 *
 * Stage 1 fitted a single axis-aligned box around everything. That box has to
 * be 1.16 deep (for the lens) AND 3.14 wide (for the body), so it claims a
 * corner at x=±1.57, z=1.16 where there is nothing but air. Once the object
 * is rotated 22° that phantom corner is the widest thing in the scene, and
 * the solver dutifully pulls the camera back to frame it. Measured cost:
 * the object was rendering 15% smaller than it needed to.
 *
 * Splitting the volume into body / prism hump / deck controls / lens barrel
 * recovers all of it, which is where most of the Stage 2 scale increase comes
 * from. Only the last ~6% needed a bigger canvas.
 *
 * `p` is the parallax factor that part is driven at (see MOTION.parallax).
 * The fit sweep uses it per-part, so the lens — which swings furthest — gets
 * the margin it needs without the body claiming margin it never uses.
 */
export interface HullBox {
  p: number;
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export const OBJECT_HULL: readonly HullBox[] = [
  /* casting + top plate overhang + strap lugs + proud grip pad */
  { p: 1.0, min: [-1.57, -0.98, -0.56], max: [1.57, 0.98, 0.63] },
  /* prism hump */
  { p: 1.0, min: [-0.68, 0.95, -0.24], max: [0.25, 1.15, 0.4] },
  /* mode dial + shutter collar */
  { p: 1.0, min: [0.46, 0.95, -0.3], max: [1.38, 1.12, 0.21] },
  /* lens barrel out to the knurled focus ring; the wider plinth sits inside
     the body box already. Driven at the focus ring's parallax factor. */
  { p: 1.25, min: [-0.98, -0.77, 0.55], max: [0.48, 0.68, 1.13] },
];

/** Ground plane height for the contact shadow. */
export const GROUND_Y = -BODY.h / 2 - 0.045;

const DEG = Math.PI / 180;

/**
 * MOTION
 * ======
 *
 * Every number the Stage 2 physics reads. Kept here, next to the geometry,
 * because several of them are geometric constraints in disguise — the focus
 * ring travel has to stay under the knurl pitch, the shutter button depth
 * has to stay under the button height, and the fit solver has to know the
 * rotation sweep or it crops the object mid-gesture.
 *
 * Spring pairs are quoted with their damping ratio ζ = damping/(2·√stiffness),
 * because that, not the raw numbers, is what you actually feel:
 *   ζ ≈ 0.6  a single soft overshoot — alive
 *   ζ ≈ 0.8  barely overshoots — mechanical
 *   ζ ≈ 1.0  dead stop — inert
 */
export const MOTION = {
  /**
   * Cursor → rotation limits. Yaw is allowed more travel than pitch because
   * a camera turning to follow you horizontally is a natural gesture, while
   * the same amount of vertical nod reads as the object tipping over.
   */
  maxYaw: 14 * DEG,
  maxPitch: 8 * DEG,

  /** The main body. ζ ≈ 0.63 — overshoots once, settles clean. */
  rotation: { stiffness: 44, damping: 14 },

  /**
   * Depth parallax. These are ADDITIVE fractions of the body rotation
   * applied to nested sub-groups, so the effective response is:
   *   body 100% · lens housing 115% · focus ring 130% · controls 92%
   *
   * They are rotations about the object's own origin, not translations, so
   * the parts stay mechanically attached — the lens shifts a couple of
   * pixels relative to the body, which is exactly what real parallax on a
   * 40mm-deep object looks like. Anything larger and the lens visibly
   * detaches.
   */
  parallax: { lens: 0.15, focusRing: 0.15, controls: -0.08 },

  /**
   * Idle float. Two incommensurate periods per channel so the loop never
   * lines up with itself — a single sine is immediately readable as a loop,
   * which is the thing that makes a hero object look like a screensaver.
   */
  idle: {
    /* At the current framing the object is ~404 CSS px wide for ~3.36 world
       units, so 1 unit ≈ 120 CSS px. The two stacked sines peak together at
       1.35x the base amplitude, so floatY 0.027 -> 0.0365 u -> ~4.4 px of
       vertical travel: inside the 3-6 px the brief asks for, and slow
       enough (0.46 and 0.181 rad/s) that it is felt rather than watched. */
    floatY: 0.023,
    /* Depth float. Larger in world units than floatY and still much smaller
       on screen, because z is foreshortened by the ~14° downward view: at
       0.028 u the object shifts ~1.1 px down-screen and its silhouette
       changes size by ~0.7 px: about 1.8 px of total effect, a little over
       a third of the vertical, so depth is clearly the subordinate channel.
       Deliberately on its own periods so the vertical and depth channels
       never resolve into one circular path. */
    floatZ: 0.024,
    driftYaw: 0.012,
    driftRoll: 0.0045,
    driftPitch: 0.0055,
  },

  /**
   * Cursor roll. A suspended object pushed sideways does not only turn, it
   * leans — without this the rotation reads as a flat UI transform. Rolls
   * AWAY from the cursor (top leans toward the side you are pushing from),
   * which is what a hanging mass does. Runs on the same spring constants as
   * yaw and pitch so all three settle with one character.
   */
  maxRoll: 3 * DEG,

  /**
   * Extra depth the lens assembly takes on as the cursor nears it — the
   * front group easing toward the viewer. 0.01 u ≈ 1.2 px. Any more and the
   * barrel starts to look unseated from the front panel.
   */
  lensNear: 0.01,
  /** A smaller forward separation for the focus ring alone. It is just enough
   * to catch a different highlight from the fixed barrel without unseating
   * the ring. */
  focusRingNear: 0.0025,

  /**
   * Cursor translation. Rotation alone reads as a turntable; a real object
   * being looked around also shifts in frame. Deliberately asymmetric:
   * 0.103 u (~12 px) horizontally where the frame has room, 0.052 u (~6 px)
   * vertically where pitch is already swinging the protruding lens through
   * the height budget. Rotation stays the dominant effect by a wide margin.
   */
  translate: { x: 0.103, y: 0.052 },

  /**
   * Focus ring. ζ ≈ 0.80: it arrives, nudges, and stops.
   *
   * 14° is the CAP, not the travel. The cap is only approached with the
   * cursor at the edge of the object, where proximity has already started to
   * fall, so the two terms never peak together. Measured in-browser against
   * a deliberately exaggerated build, the realised travel is 46% of the cap
   * — so 14° here produces about ±6.4° in practice, a little over one knurl
   * pitch (360/64 = 5.6°). Enough to watch the teeth step round by one, and
   * far short of anything that reads as a wheel being spun.
   */
  focusRing: { max: 14 * DEG, stiffness: 22, damping: 7.5 },

  /** Iris. ζ ≈ 0.83 and very stiff — a shutter is a fast, tight mechanism,
   *  and the spring has only MOTION.shutter.closeFor to travel in. ω_n 20.5
   *  covers 83% of the closure inside that window; the previous ω_n 12.2
   *  managed 31%, which is why the click used to read as a twitch. */
  aperture: { stiffness: 420, damping: 34 },

  /**
   * Shutter button travel, in world units. The body is 1.938 units for a
   * ~70mm camera, so 1 unit ≈ 36.1mm:
   *
   *   hover 0.028 -> 1.0mm   finger resting on the button
   *   press 0.045 -> 1.6mm   actuation
   *
   * Both are bounded by geometry, not taste: the button's skirt and the
   * collar's bore were lengthened (see Controls.tsx) so that even at full
   * press the open bottom of the skirt stays inside the collar wall. Without
   * that, a press deeper than 0.018 lifts the skirt's open end clear of the
   * bore and you can see straight through the button.
   *
   * ζ ≈ 0.66 gives the springy return the brief asks for.
   */
  shutterButton: { hover: 0.028, press: 0.045, stiffness: 210, damping: 19 },

  /**
   * Recoil. Velocity impulses injected into the springs that the cursor is
   * already driving, NOT a separate tween — that is the whole reason the
   * rotation is a spring. Clicking mid-gesture adds a kick to the motion in
   * progress and the two resolve together, instead of one animation
   * stamping over the other.
   */
  /**
   * Impulses are quoted in rad/s, which is NOT what you see — the peak angle
   * a spring reaches from an impulse is v0/omega_d * e^(-zeta*omega_n*t_peak)
   * * sin(omega_d*t_peak). For the rotation spring that works out at
   * 0.0767 * v0, so the first guess of 1.35 rad/s would have thrown the body
   * through 5.9 degrees — larger than the entire cursor range, and nothing
   * like "a tiny recoil". These values were solved backwards from the angle:
   *
   *   pitch  -0.35 rad/s -> 1.54 deg peak at 181ms
   *   yaw     0.20 rad/s -> 0.88 deg peak at 181ms
   *   push    0.55 u/s   -> 0.028 units toward the viewer at 119ms
   */
  recoil: {
    pitch: -0.515,
    yaw: 0.294,
    push: { impulse: 0.55, stiffness: 95, damping: 11.5 },
  },

  /** Shutter flash: a brief lift of a dedicated light, peak then decay.
   *  0.34 against a 1.18 key — a catch of light, not a photographic flash. */
  flash: { peak: 0.34, attack: 0.04, decay: 0.26 },

  /** How long the iris is commanded shut after a click, in seconds.
   *
   *  This is a spring, not a tween, so the window has to be long enough for
   *  the spring to actually get there. Measured in-browser, an 85ms window
   *  moved the iris only 31% of the way (0.195 -> 0.142) and the button 42%:
   *  the click read as a twitch rather than a shutter firing. Solving the
   *  step response for the current constants gives 83% at 130ms, which lands
   *  the iris at 0.091 — visibly shut — and the button at 71% of its press.
   *  Longer than this and the closure stops reading as "quick". */
  shutter: { closeFor: 0.13 },
} as const;
