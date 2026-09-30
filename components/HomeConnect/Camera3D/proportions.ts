/**
 * PROPORTION MAP — SVG hero → 3D world units
 * ==========================================
 *
 * Stage 1 used the existing SVG camera (`components/HomeConnect/Camera.tsx`)
 * as the single source of proportional truth, and that ancestry is still
 * visible in the placement constants (toX/toY below). Stage 3 rebuilds the
 * SURFACES — turned lathe profiles, a genuinely recessed front pocket,
 * layered panels — but keeps every anchor point: the silhouette, the
 * two-tone split and the lens placement are unchanged.
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
  rTop: 0.14,
  rBot: 0.24,
  /**
   * Bevel that rounds every silhouette edge. Stage 3 raises the segment
   * count and passes the result through `toCreasedNormals`, which turns the
   * faceted 90°-in-6-steps bevel into a continuous rolled edge while keeping
   * the parting lines crisp. This is the single biggest "moulded casting"
   * upgrade on the shell.
   */
  bevel: 0.05,
  bevelSegments: 6,
  /**
   * Draft: the cross-section tapers slightly toward the back (the front face
   * is the nominal size, the back is `draft` fraction smaller). This is what
   * a moulded shell does — and it tilts the top deck down toward the rear,
   * which the 14° camera picks up as a soft shear across the plate. Kept
   * small: 2.5% is felt, not seen. Parts that sit on the drafted surfaces
   * must ask `draftScaleAt` / `wallXAt` where they are.
   */
  draft: 0.025,
} as const;

/** Front face plane (the flat lid area of the shell extrusion). */
export const FRONT_Z = BODY.d / 2;
export const TOP_Y = BODY.h / 2;

/**
 * Cross-section scale at a given z, per BODY.draft. 1 at the front face,
 * (1 - BODY.draft) at the back. Pure geometry helper — no motion reads it.
 */
export const draftScaleAt = (z: number) =>
  1 - BODY.draft * ((FRONT_Z - z) / BODY.d);
/** Where the drafted right wall sits at a given z. */
export const wallXAt = (z: number) => (BODY.w / 2) * draftScaleAt(z);

/* ------------------------------------------------------------ top plate ---- */

/**
 * The deck is its own slab, marginally PROUD of the body on every side, with
 * a recessed shadow-gap band underneath — a continuous seam line that wraps
 * the front, both flanks and the back. Stage 3 keeps the construction and
 * increases the overhang a hair so the step survives the smoother bevels.
 */
export const TOP_PLATE = {
  fromY: toY(110), // 0.646
  overhang: 0.016,
  gapH: 0.05,
  gapInset: 0.012,
} as const;

/* ------------------------------------------------- front pocket & panel ---- */

/**
 * THE RECESSED FRONT — the core Stage 3 body change.
 *
 * The dark faceplate no longer sits proud of the shell. The shell extrusion
 * now carries a rounded-rect hole through its front lid; the dark panel lies
 * at the bottom of that pocket, ~0.032 behind the front plane. The pocket
 * mouth is chamfered by the shell's own bevel (the hole contour shrinks by
 * `bevel` toward the mid-band, so the rim rolls inward — a drafted mould
 * wall for free), and a rubber gasket ring frames the panel inside it.
 *
 * Result, front to back: cream lid → rolled pocket rim → rubber gasket →
 * dark leatherette panel. Four layers deep, all of them real geometry.
 */
export const POCKET = {
  /** Authored hole size — this is the mouth you see at the front lid. */
  w: 2.72,
  topY: toY(122), // 0.508 — held over from the SVG leatherette top edge
  botY: -0.88,
  rTop: 0.05,
  rBot: 0.16,
} as const;

/**
 * The dark panel slab. `proud` is now NEGATIVE (the face sits behind the
 * front plane) — DisplayPanels derives its plane from exactly these two
 * numbers, so the display glass, bezels and texture planes all ride down
 * into the pocket with the panel without touching that file:
 *
 *   panelFace = FRONT_Z + proud + thickness / 2 = 0.478
 */
export const PANEL = {
  /** Slab is oversized vs the mouth so its edge embeds in the pocket wall. */
  w: 2.78,
  topY: 0.534,
  botY: -0.908,
  rTop: 0.07,
  rBot: 0.19,
  proud: -0.063,
  thickness: 0.062,
} as const;

/** Convenience: the panel's front face — where everything on the front sits. */
export const PANEL_FACE = FRONT_Z + PANEL.proud + PANEL.thickness / 2; // 0.478

/**
 * Rubber gasket ring between the pocket wall and the panel. Oversized so it
 * embeds into the drafted pocket wall (no crack to see at any angle); its
 * visible inner edge is what reads as the faceplate's boundary.
 */
export const GASKET = {
  w: 2.8,
  topY: 0.52,
  botY: -0.894,
  rTop: 0.06,
  rBot: 0.17,
  /** Ring band width. */
  inset: 0.075,
  /** Total depth; centred on (topZ - depth/2). */
  topZ: 0.5,
  depth: 0.034,
} as const;

/* --------------------------------------------------------- lens plinth ---- */

/**
 * The mounting flange the barrel grows out of — now a turned lathe profile
 * with a rounded root and a chamfered top, instead of a cylinder with a
 * chamfer ring stacked on it. `from`/`to` are ABSOLUTE z (see LENS_Z).
 */
export const PLINTH = {
  r: 0.79,
  rFace: 0.736,
  rInner: 0.64,
  from: 0.462,
  to: 0.574,
} as const;

/* ---------------------------------------------------------------- lens ---- */

export const LENS = {
  x: toX(148), // -0.254
  y: toY(170), // -0.046
  /**
   * Radii, outer → inner. The stack is deliberately NOT monotonic: it steps
   * in to a waist at the aperture ring, back out to a proud focus ring, then
   * down again to the bezel. Stage 3 keeps that silhouette and adds the
   * fillets between the steps (see geometry/buildLens.ts) — the shoulder
   * lines now roll instead of kinking, which is what reads as "turned on a
   * lathe" rather than "stacked cylinders".
   */
  rMount: 0.706,
  rApRing: 0.656,
  rBarrel: 0.638,
  rFocus: 0.690,
  rStep: 0.618,
  /** Must stay ≥ hypot(IRIS.halfWidth, IRIS.reach) ≈ 0.572 — blade budget. */
  rBezel: 0.582,
  rMouth: 0.522,
  rThroat: 0.500,
  rGlass: 0.505,
} as const;

/**
 * Lens z-stack, front face outward. Total protrusion is ~0.61 against a body
 * depth of 1.02 — a compact camera with a real lens, not a telephoto.
 * irisPlane / irisBack / glassApex / innerApex are Stage-2 motion-coupled
 * values and are UNCHANGED.
 */
export const LENS_Z = {
  mount: { from: 0.558, to: 0.64 },
  apRing: { from: 0.64, to: 0.73 },
  barrel: { from: 0.73, to: 0.812 },
  focus: { from: 0.8, to: 0.975 },
  step: { from: 0.962, to: 1.052 },
  bezel: { from: 1.046, to: 1.118 },

  /** Bore interior. */
  mouth: 1.098,
  throat: { from: 0.61, to: 0.97 },

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
   *  initial seed and the post-shutter return target. */
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
 * the front face is canted. `rise` is the profile's half-height (the
 * trapezoid is authored 2·rise tall and half-buried in the casting, exactly
 * as Stage 2 buried it); `crown` is the visible height above the deck line —
 * held at the SVG's proportion so the top silhouette is unchanged.
 */
export const HUMP = {
  x: toX(151),
  wBase: 0.92,
  wTop: 0.7,
  rise: 0.19,
  /** Visible height of the crown above the deck line. */
  crown: 0.17,
  d: 0.62,
  z: 0.08,
  r: 0.05,
} as const;

/** Rangefinder window on the face of the hump. */
export const HUMP_WINDOW = {
  x: toX(151),
  y: 1.06,
  w: 0.5,
  h: 0.12,
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

/**
 * Machined collar around the tally LED (the physical flash). The sphere and
 * its parented PointLight are Stage-2 fixtures — this collar only frames
 * them, it does not replace any part of the flash system.
 */
export const TALLY_LED = {
  r: 0.062,
  bore: 0.044,
  topZ: 0.545,
  baseZ: 0.462,
} as const;

/**
 * Bezel collars for the recessed windows (viewfinder, both info displays,
 * hump window). Extruded rounded-rect rings standing proud of their surface,
 * bevelled at both rims — the chamfered mouth comes free from the extrusion
 * bevel, exactly as the pocket rim does.
 */
export const WINDOWS = {
  /** Collar outer size = window + 2·margin. */
  margin: 0.032,
  /** Collar bore = window + 2·boreGap (a hair over, so the pane hides it). */
  boreGap: 0.012,
  /** Front lid of a collar standing on the panel face. */
  topZ: 0.542,
  /** Deep enough to bury the collar's back bevel inside the panel. */
  baseZ: 0.452,
  bevel: 0.012,
  /** Dark pane sits this far in front of the panel face (texture is +0.041). */
  paneLift: 0.038,
  paneUnder: 0.004,
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
 * Moulded rubber grip, right flank of the front. It runs from the recessed
 * panel ACROSS the gasket and the pocket rim onto the front face, reaching
 * just proud of the lid — the seams it crosses are hidden under the rubber,
 * which is how a real grip is fitted. Stage 1 used two thin ribs, which at
 * hero size rendered as two stray scratches.
 */
export const GRIP = {
  x: 1.3,
  y: -0.14,
  w: 0.3,
  h: 0.88,
  r: 0.05,
  ridges: 5,
  baseZ: 0.47,
  topZ: 0.532,
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
 * Fit volume for the camera solver — a HULL of boxes, not one box.
 *
 * Stage 1 fitted a single axis-aligned box around everything. That box has to
 * be 1.16 deep (for the lens) AND 3.14 wide (for the body), so it claims a
 * corner at x=±1.57, z=1.16 where there is nothing but air. Once the object
 * is rotated 22° that phantom corner is the widest thing in the scene, and
 * the solver dutifully pulls the camera back to frame it. Measured cost:
 * the object was rendering 15% smaller than it needed to.
 *
 * Splitting the volume into body / prism hump / deck controls / lens barrel
 * recovers all of it. The numbers below were re-measured against the Stage 3
 * build (scripts measure the baked geometry, not a guess) and carry a small
 * outward margin so the sweep at full yaw never clips.
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
  /* casting + pocket assembly + top plate + strap lugs + grip.
     Re-measured against the baked Stage 3 geometry: the deck's mid-band
     (authored + bevel, ~±1.02 in y) is now covered, which Stage 2's box
     quietly missed. */
  { p: 1.0, min: [-1.57, -1.03, -0.53], max: [1.57, 1.02, 0.58] },
  /* prism hump + its rangefinder window collar */
  { p: 1.0, min: [-0.73, 0.95, -0.24], max: [0.29, 1.19, 0.45] },
  /* mode dial + shutter collar */
  { p: 1.0, min: [0.46, 0.92, -0.27], max: [1.31, 1.12, 0.16] },
  /* lens barrel out to the knurled focus ring; the mounting flange sits
     inside the body box already. Driven at the focus ring's parallax
     factor. Extents unchanged from Stage 2 — the silhouette is signed off. */
  { p: 1.25, min: [-0.98, -0.77, 0.52], max: [0.47, 0.67, 1.13] },
];

/**
 * Ground plane height for the contact shadow. The resting edge of the shell
 * is the mid-band bottom (authored + bevel, then drafted): ≈ −1.018. The
 * plane sits a hair below it — adjusted from Stage 2's −0.045 offset
 * because the deeper bevel lowered the resting edge past the old plane.
 */
export const GROUND_Y = -(BODY.h / 2 + BODY.bevel) - 0.007;

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
   *  to catch a different highlight from the fixed barrel without unseating
   *  the ring. */
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
   * cursor at the edge of the object, where proximity has already started
   * to fall, so the two terms never peak together. Measured in-browser against
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
   * collar's bore were lengthened (see geometry/buildControls.ts) so that
   * even at full press the open bottom of the skirt stays inside the collar
   * wall. Without that, a press deeper than 0.018 lifts the skirt's open end
   * clear of the bore and you can see straight through the button.
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

  /** Shutter flash: a short warm burst from the small lens-side point light.
   *  It peaks clearly, then is gone in roughly 160ms. */
  flash: { peak: 1.8, attack: 0.02, decay: 0.14 },

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
