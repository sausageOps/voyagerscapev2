/**
 * PALETTE — aged consumer CRT plastic, tuned to the Voyagerscape cream page
 * =========================================================================
 *
 * Mirrored from `styles/globals.css` rather than read from it: the 3D layer
 * must never call `getComputedStyle` per frame, and the `bw` / `negative`
 * visual modes already work at the compositor level (they filter `<body>`,
 * which includes the canvas), so no runtime token plumbing is needed.
 *
 *   --vs-bg      #f5f0e8   page cream
 *   --vs-ink     #111111
 *   --vs-pink    #f1b8e4
 *   --vs-yellow  #f3e5b5
 *
 * The one hard constraint: the shell must not match the page. A beige
 * monitor on a cream background with no value separation dissolves. Every
 * shell tone here is pulled a step warmer and a step darker than --vs-bg so
 * the silhouette holds without needing an outline.
 */

export const PALETTE = {
  /* ---- shell: the yellowed off-white every monitor of the era went ----
     Each of the three values came down about 9% for this pass, and the
     reason is measured rather than aesthetic: with the old values 54%
     of the object's pixels were clamped at pure white, because the
     renderer has no tone mapping and a near-white base under six lamps
     has nowhere to put a highlight. Darkening the base is what buys the
     highlight somewhere to go.

     It is also the more honest colour. Aged ABS is a warm ivory, not an
     off-white — and a cream object photographed in a cream room reads
     as cream at a surprisingly low value, because the eye judges it
     against the page around it rather than against absolute white. */
  shell: "#cfc4aa",
  /** Rear housing. A shade deeper: it is a separate moulding, and on real
   *  sets the back shell was always a slightly different batch of plastic. */
  shellRear: "#c5b89c",
  /** Bezel face. Marginally lighter and smoother than the body, which is
   *  what the front moulding of these things actually looked like. */
  bezel: "#d5cab0",
  /** The recessed aperture wall, running back from the bezel step to the
   *  rim of the glass. Much darker than the bezel: on a real set this is
   *  the tube's own shroud, and rendering it as cream turns the screen
   *  into a picture frame. */
  bezelInner: "#6e6555",
  /** Moulding seams and the shadow gap between castings. Not black: a
   *  groove in a cream casting is a warm mid-tone, and painting it dark
   *  reads as a printed line rather than a gap. */
  seam: "#8d8168",
  /** Ventilation slot interiors — deeper than a seam, still not black. */
  vent: "#5d5445",

  /* ---- controls ---- */
  button: "#3a3a40",
  buttonPower: "#2e2e34",
  buttonWell: "#9d917a",
  /** The analogue trim wheel. Softer and browner than the charcoal
   *  buttons: these were a different moulding in a different, slightly
   *  rubbery resin, and on a real set the two never quite matched. */
  knob: "#4a463f",

  /* ---- glass and tube ---- */
  glass: "#0c1014",
  /** The unlit phosphor surround inside the aperture. */
  tubeMask: "#14161a",

  /* ---- status lamp ---- */
  ledIdle: "#6fe0a4",
  ledRec: "#ff6a8c",
  ledWait: "#ffc34d",
  ledPlay: "#6fe0a4",
  ledErr: "#ff5a4d",

  /* ---- lighting ---- */
  lightKey: "#fffdf9",
  lightSky: "#fffdf9",
  lightGround: "#e7dfd2",
  /** The counter-key. Only a whisper of the brand pink: at the intensity
   *  a counter-key needs in order to stop the object going grey when it
   *  turns away from the key, the full #f1b8e4 dyes the whole casting
   *  pink. Saturation has to come down as intensity goes up. */
  lightCounter: "#fbeef4",
  /** The low bounce. Full brand pink, but weak and from below, where it
   *  warms the shadow side without colouring the form. */
  lightFill: "#f1b8e4",
  lightRim: "#f3e5b5",
  /** Spill from the tube onto the bezel. Phosphor white is cold. */
  screenSpill: "#9fd8ff",

  /* ---- contact shadow ---- */
  shadow: "#4a4236",

  /** The page behind the canvas. Not used as a fill — the canvas is
   *  transparent — but as the target colour distant units are tinted
   *  toward, which is what atmospheric perspective actually does. */
  page: "#f5f0e8",
} as const;

export type TallyState = "idle" | "rec" | "wait" | "play" | "err";

export const TALLY_COLOR: Record<TallyState, string> = {
  idle: PALETTE.ledIdle,
  rec: PALETTE.ledRec,
  wait: PALETTE.ledWait,
  play: PALETTE.ledPlay,
  err: PALETTE.ledErr,
};
