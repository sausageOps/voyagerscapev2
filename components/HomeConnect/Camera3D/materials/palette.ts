/**
 * PALETTE — mirrored from `styles/globals.css`
 * ============================================
 *
 * These are copies, not reads. The 3D layer must never call `getComputedStyle`
 * per frame, and the `bw` / `negative` visual modes already work at the
 * compositor level (they filter `<body>`, which includes the canvas), so no
 * runtime token plumbing is required.
 *
 * If a token in globals.css changes, update the mirrored value here.
 *
 *   --vs-bg      #f5f0e8   page cream   (never painted — canvas is transparent)
 *   --vs-ink     #111111   ink
 *   --vs-pink    #f1b8e4   accent
 *   --vs-yellow  #f3e5b5   accent
 *   --vs-lavender#d8ccff   lens coating tint
 */

export const PALETTE = {
  /* ---- body: warm cream / off-white, the dominant surface ---- */
  shell: "#ece2cf",
  shellDeep: "#dbd0b9",
  deck: "#f0e7d6",

  /* ---- dark leatherette front + lens interior ---- */
  leather: "#212126",
  ink: "#111111",
  void: "#07070a",

  /* ---- restrained metal ---- */
  metalDark: "#2b2b31",
  metalMid: "#9a9182",
  metalBright: "#c9c0ae",

  /* ---- moulded rubber: focus ring + hand grip. Reads darker and flatter
     than the leatherette so the two do not merge into one black mass. ---- */
  rubber: "#17171b",

  /* ---- satin hardware: lens plinth, mount collar ---- */
  satin: "#24262c",

  /* ---- window surrounds. Between leatherette and bright metal: enough to
     separate a recessed pane from the panel it sits in, without turning the
     front of the camera into a row of chrome picture frames. ---- */
  bezel: "#6b6456",

  /* ---- the modelled shadow in the top-plate seam. Not black: a groove in a
     cream casting is a warm mid-tone, and painting it dark reads as a
     printed line rather than a gap. ---- */
  seamGap: "#8d8474",

  /* ---- lens ---- */
  lensBody: "#15151a",
  lensInner: "#0a0a0e",
  glass: "#0c1218",
  coating: "#d8ccff", // --vs-lavender

  /* ---- brand accents ---- */
  pink: "#f1b8e4", // --vs-pink  → shutter button
  yellow: "#f3e5b5", // --vs-yellow → index marks

  /* ---- signal lamp states (ported from Camera.module.css) ---- */
  tallyIdle: "#b9ae9c",
  tallyRec: "#e2557f",
  tallyPlay: "#48c896",
  tallyWait: "#e0b34a",
  tallyErr: "#d2453f",

  /* ---- lighting ---- */
  lightKey: "#fffdf9",
  lightSky: "#fffdf9",
  lightGround: "#e7dfd2",
  lightFill: "#f1b8e4",
  lightRim: "#f3e5b5",

  /* ---- contact shadow ---- */
  shadow: "#4a4236",
} as const;

export type TallyState = "idle" | "rec" | "wait" | "play" | "err";

export const TALLY_COLOR: Record<TallyState, string> = {
  idle: PALETTE.tallyIdle,
  rec: PALETTE.tallyRec,
  wait: PALETTE.tallyWait,
  play: PALETTE.tallyPlay,
  err: PALETTE.tallyErr,
};
