/**
 * PROPORTION MAP — a 1997–2003 desktop CRT monitor, in world units
 * ================================================================
 *
 * Reference object: a 17" consumer/professional CRT. Real ones measure about
 * 400mm wide, 410mm tall on their base and 440mm deep. That "almost as deep
 * as it is wide" figure is the single most important number in this file —
 * it is what separates a CRT from a flat panel, and it is the reason the
 * object has to be staged at an angle rather than face-on.
 *
 * World scale: the front casting is 3.30 units wide, so 1 unit ≈ 121mm.
 *
 *   front casting   3.30 w × 3.00 h × 0.42 d      (the chunky bezel moulding)
 *   rear housing    tapers back 2.32 units        (the tube funnel)
 *   screen aperture 2.46 × 1.86  (4:3, r 0.30)    lifted 0.10 above centre
 *   base            2.42 × 2.06, 0.30 tall        tilt/swivel pedestal
 *
 * Total: 3.30 × 3.44 × 2.78. Deep, heavy, and unmistakably a tube.
 *
 * Everything downstream reads from here. Nothing hard-codes a dimension.
 */

/* ------------------------------------------------------------- casting ---- */

export const BODY = {
  /** Front casting, the widest part of the object. */
  w: 3.3,
  h: 3.0,
  /** Depth of the front moulding alone, before the rear housing starts. */
  d: 0.42,
  /** Corner radii of the front casting. Slightly tighter at the top than the
   *  bottom — the moulding flares out toward the base on real sets.
   *
   *  Deliberately modest. Generous corners tip a beige box straight into
   *  "vintage television", and this is a computer monitor: the mouldings
   *  were squarer and the radius mostly lived in the chamfer, not the
   *  plan. */
  rTop: 0.17,
  rBot: 0.22,
  /** Edge bevel on the front casting. Big enough to catch a highlight all
   *  the way round the silhouette; small enough to stay a moulding line.
   *  It also applies to every hole cut in the casting, which caps it: at
   *  0.05 it ate the 0.215-tall control aperture. */
  bevel: 0.035,
} as const;

/** Front face plane. Everything on the face is placed against this. */
export const FRONT_Z = BODY.d / 2 + 0.9;
/** Where the front casting parts from the rear housing. */
export const CASTING_BACK_Z = FRONT_Z - BODY.d;
/** Rear-most point of the housing. */
export const REAR_Z = CASTING_BACK_Z - 1.9;

export const TOP_Y = BODY.h / 2;
export const BOTTOM_Y = -BODY.h / 2;

/**
 * REAR HOUSING
 * ------------
 * Four lofted rounded-rectangle rings, not one tapered box. A CRT's rear
 * shell is not a cone: it holds its full section for the first third (the
 * tube is still at full width there), then draws in hard around the funnel,
 * then runs almost straight to the back panel. Three different rates of
 * taper is what makes the silhouette read as a tube housing rather than a
 * wedge.
 *
 * `s` is the section scale, `y` the vertical offset of the ring centre —
 * the housing rides slightly up as it goes back, which is what real sets do
 * to clear the neck board.
 */
export interface Ring {
  z: number;
  /** Horizontal scale of the section, relative to the casting. */
  sx: number;
  /** Vertical scale. */
  sy: number;
  y: number;
  r: number;
}

/**
 * The first two rings are very nearly full section — 0.995 and 0.985 —
 * and that is load-bearing, not a detail. At 0.988/0.955 the top of the
 * rear shell sat 50mm below the top of the casting, and at the staging
 * camera's 12.7° downward view the casting's own top edge then occluded
 * the entire top deck: the ventilation was modelled, correct, and
 * completely invisible. Real sets are flush at the join for exactly the
 * same reason they look flush — the tube is still at full width there.
 * The taper belongs behind the funnel, which is where it now starts.
 */
export const REAR_RINGS: readonly Ring[] = [
  { z: CASTING_BACK_Z + 0.001, sx: 1.0, sy: 1.0, y: 0, r: 0.19 },
  { z: CASTING_BACK_Z - 0.55, sx: 0.99, sy: 0.99, y: 0.004, r: 0.23 },
  { z: CASTING_BACK_Z - 1.15, sx: 0.87, sy: 0.83, y: 0.03, r: 0.3 },
  { z: CASTING_BACK_Z - 1.62, sx: 0.68, sy: 0.6, y: 0.055, r: 0.28 },
  { z: REAR_Z, sx: 0.58, sy: 0.5, y: 0.06, r: 0.22 },
] as const;

/* -------------------------------------------------------------- screen ---- */

/**
 * The aperture. Not vertically centred: the bezel below the glass is a third
 * again as deep as the bezel above it, because that is where the controls,
 * the badge and the power switch live. Getting this wrong is the fastest way
 * to make a CRT look like a television.
 */
export const SCREEN = {
  w: 2.46,
  h: 1.86,
  /** Centre of the aperture, lifted above the casting centre. */
  cy: 0.12,
  /** Aperture corner radius. */
  r: 0.3,
  /**
   * Superellipse exponent for the glass/aperture outline. 2 is an ellipse,
   * infinity is a rectangle; 5 lands on the softly-cornered "squircle" a
   * moulded CRT aperture actually is.
   */
  n: 5,
  /** How far the inner bezel lip stands proud of the aperture wall. */
  lip: 0.055,
  /** Depth of the recess between the face and the glass apex. */
  recess: 0.075,
  /** Depth of the aperture's inner wall before it meets the glass edge. */
  wallDepth: 0.22,
  /**
   * Bulge of the tube face: how far the edge of the glass sits behind its
   * apex. 0.19 on a 2.46-wide screen is about 1 part in 13 — matching the
   * shallow spherical section of a late-90s tube. Flatter and the curvature
   * stops reading; deeper and it becomes a fishbowl.
   */
  bulge: 0.19,
  /** Glass apex, measured from the front face. */
  glassZ: FRONT_Z - 0.075,
  /** Phosphor plane apex. Sits a real distance behind the glass so the two
   *  surfaces can catch different highlights — that gap IS the thickness. */
  imageZ: FRONT_Z - 0.155,
  /** The emissive image is inset from the glass: real tubes never light
   *  right to the edge of the aperture. */
  imageInset: 0.955,
  /** Glass oversize, so its rim tucks behind the bezel lip with no gap. */
  glassOversize: 1.028,
} as const;

/** Aperture half-extents, for callers that need them directly. */
export const APERTURE = {
  hw: SCREEN.w / 2,
  hh: SCREEN.h / 2,
  cy: SCREEN.cy,
} as const;

/* ------------------------------------------------------------ controls ---- */

/**
 * The control cluster, lower right of the bezel. Restrained on purpose: a
 * real monitor has one power switch, one LED, and a short row of adjustment
 * buttons under a moulded lozenge. Anything more and it starts to look like
 * a synthesiser.
 */
export const CONTROLS = {
  /**
   * The control aperture: one strip cut clean through the casting, with a
   * recessed moulded panel dropped into it.
   *
   * This is how the real ones were built, and it is also the only way the
   * buttons can be genuinely recessed. The casting is a solid extrusion —
   * anything placed at a z behind its face is simply inside it, invisible,
   * or (worse) exactly coplanar with it and z-fighting into a stripe. A
   * button needs a hole to sit in.
   */
  strip: { x: 0.79, y: -1.175, w: 1.27, h: 0.215, r: 0.05, recess: 0.035 },

  /** Centre of the button row within the strip. */
  x: 0.62,
  y: -1.16,
  /** Four adjustment buttons. */
  count: 4,
  pitch: 0.185,
  btnW: 0.125,
  btnH: 0.072,
  btnDepth: 0.036,
  /** The moulded well the buttons sit in. */
  wellPad: 0.07,
  wellDepth: 0.028,

  /** Power switch: larger, further right, with its own raised surround. */
  power: {
    x: 1.24,
    y: -1.175,
    w: 0.21,
    h: 0.125,
    depth: 0.05,
  },

  /** Status LED, inboard of the power switch. */
  led: {
    x: 0.985,
    y: -1.175,
    r: 0.032,
    depth: 0.022,
  },

  /** Moulded brand/badge strip, lower left. Deliberately blank geometry —
   *  a shallow debossed panel, no typography. */
  badge: { x: -1.02, y: -1.185, w: 0.62, h: 0.1, depth: 0.014 },
} as const;

/* ---------------------------------------------------------------- vents --- */

/**
 * Ventilation. Top deck gets the long slots (heat rises out of the top of a
 * CRT); the flanks get a shorter stack near the back where the HV cage sits.
 * Modelled as sunken slots in a dark material rather than real holes — a
 * boolean cut here would cost thousands of triangles to say the same thing.
 */
export const VENTS = {
  top: { count: 13, len: 0.44, w: 0.05, gap: 0.115, z0: CASTING_BACK_Z - 0.32, depth: 0.024 },
  /* Further back than instinct suggests: at the staging yaw the flank is
     nearly edge-on where it leaves the casting, and a vent there reads as
     a tab stuck to the silhouette. Where the funnel starts drawing in, the
     surface turns toward the camera and the slots resolve. */
  side: { count: 7, len: 0.34, w: 0.045, gap: 0.1, z0: CASTING_BACK_Z - 0.9, depth: 0.02 },
} as const;

/* ----------------------------------------------------------------- base --- */

/**
 * Tilt/swivel pedestal. Two parts: a short neck the body sits on, and a wide
 * moulded foot with a chamfered edge. The neck is what makes the monitor
 * look like it can be tilted; without it the body appears glued to a tray.
 */
export const BASE = {
  neck: { w: 1.34, d: 1.24, h: 0.13, r: 0.28 },
  /* Wider and deeper than the first pass. At 2.42 x 2.06 the foot
     measured 2.50 across against a 3.37-wide body, and the monitor read
     as balancing on a coaster; the overhang has to be an overhang, not a
     cliff. 2.86 still leaves 250mm of body proud on each side, which is
     what a real tilt-swivel base looked like. */
  foot: { w: 2.86, d: 2.24, h: 0.2, r: 0.46 },
  /** Top of the neck = bottom of the body casting. */
  topY: BOTTOM_Y + 0.012,
} as const;

export const BASE_BOTTOM_Y = BASE.topY - BASE.neck.h - BASE.foot.h;

/** Ground plane for the contact shadow. */
export const GROUND_Y = BASE_BOTTOM_Y - 0.004;

/**
 * The contact shadow's quad, in world units.
 *
 * Declared here rather than inside the shadow component because the camera
 * fit has to know about it. A shadow is part of the object's presence on
 * the page, and a frame packed to the monitor's silhouette alone slices
 * the pool off flat along the bottom edge of the canvas — a WebGL canvas
 * cannot paint outside its own element, so the falloff simply stops.
 *
 * `ink` is the fraction of the quad the shader actually darkens; the rim
 * mask is already zero beyond it, so there is no point framing for the
 * rest.
 */
export const SHADOW = { halfW: 1.95, halfD: 1.5, ink: 0.82 } as const;

/* -------------------------------------------------------------- staging --- */

const DEG = Math.PI / 180;

export const STAGING = {
  /**
   * Resting yaw. 22°.
   *
   * This number was set by rendering it, not by taste. At 13° the object
   * read as a flat-fronted panel: the rear housing hid entirely inside the
   * casting's silhouette and 2.8 units of carefully built depth were
   * invisible. Solving the silhouette, the rear only clears the casting's
   * back corner past about 17°, and it takes 22° for the margin to be
   * worth anything — 0.2 world units, roughly 25px at hero size. Past
   * about 26° the raster starts to key-stone badly enough to hurt the game
   * content, which is the other half of the brief.
   */
  yaw: 22 * DEG,
  roll: 0,
  /**
   * Camera elevation, as a tangent. 0.36 is a 20° depression, and it was
   * arrived at by rendering the geometry, not by eye.
   *
   * A CRT's top deck slopes away behind a front casting that is the
   * tallest thing on the object, so the casting's own top edge occludes
   * it. Solving the sightline: at 9° depression the visible top deck was
   * 1.6% of the silhouette — about ten pixels — and the ventilation,
   * which is real cut geometry, could not be seen at all. The deck only
   * opens up past about 18°.
   *
   * It also happens to be the honest angle: this is an object that sits
   * on a desk, and you look down at it.
   */
  lookDown: 0.36,
  targetY: -0.06,
  fov: 32,
  /**
   * Fraction of the frame the object may occupy (NDC half-extent).
   *
   * Not 1.0, and not because of timidity: the fit is solved against the
   * resting pose swept through the motion range, and the bevels and the
   * glass rim antialias over a pixel or two beyond any vertex. 0.95 keeps
   * the silhouette clear of the drawing surface's edge in every pose while
   * still handing the monitor essentially the whole frame.
   */
  fill: 0.95,
} as const;

/* The camera's fit envelope is NOT declared here. It is measured from the
   built meshes by `geometry/monitor.ts#hullPoints()` — declared boxes
   around a tapering, corner-radiused shell have phantom corners, and the
   fit solver packs those instead of the object. */

/* --------------------------------------------------------------- motion --- */

/**
 * MOTION
 * ======
 *
 * The brief for this object is "heavy". A 17" CRT weighs about 18kg, and the
 * difference between an object that weighs 18kg and one that weighs nothing
 * is almost entirely in these numbers: small travel, low natural frequency,
 * damping close to critical so it arrives once and stays there.
 *
 * Damping ratio ζ = damping / (2·√stiffness).
 *   the camera hero ran the body at ζ ≈ 0.63 — a light, springy object
 *   this runs at   ζ ≈ 0.92 — it settles, it does not bounce
 */
export const MOTION = {
  /** Cursor → rotation caps. Half what a handheld object would take. */
  maxYaw: 7.5 * DEG,
  maxPitch: 4.2 * DEG,
  maxRoll: 1.1 * DEG,

  /** ω_n ≈ 5.3 rad/s, ζ ≈ 0.92. Slow, and it does not ring. */
  rotation: { stiffness: 28, damping: 9.8 },

  /** Positional parallax. ~0.062 u ≈ 8 px at hero size. */
  translate: { x: 0.062, y: 0.03 },

  /**
   * Idle float. A monitor on a desk does not bob, so this is an order of
   * magnitude smaller than a suspended object would get — it exists only so
   * the object is never perfectly frozen, which reads as a still image.
   */
  idle: {
    floatY: 0.008,
    floatZ: 0.009,
    driftYaw: 0.006,
    driftPitch: 0.0025,
    driftRoll: 0.0018,
  },

  /**
   * Channel change. A physical nudge, injected as velocity into the springs
   * the cursor is already driving, so clicking mid-gesture superimposes the
   * knock on the turn rather than fighting it for the same transform.
   *
   * Solved backwards from the angle: the rotation spring converts an impulse
   * v0 to a peak of about 0.055·v0 rad, so 0.34 rad/s lands at 1.07° — a
   * knock on a heavy object, not a flinch.
   */
  knock: { pitch: -0.34, yaw: 0.2 },

  /** Power button travel, world units. 0.018 u ≈ 2.2mm of switch throw. */
  button: { press: 0.018, stiffness: 260, damping: 26 },
} as const;

/* --------------------------------------------------------------- screen --- */

/** Channel timing, in seconds. */
export const CHANNELS = {
  /** How long each programme holds. Long enough to read and understand. */
  dwell: 9.5,
  /** Length of the sync disturbance between programmes. */
  transition: 0.62,
  /** Internal canvas resolution. Deliberately period-correct and cheap. */
  texW: 320,
  texH: 240,
  /** Canvas repaint rate. Retro hardware did not run at 60. */
  fps: 24,
} as const;
