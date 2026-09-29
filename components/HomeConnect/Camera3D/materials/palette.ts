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
  deck: "#f4ecdd",

  /* ---- dark leatherette front + lens interior ---- */
  leather: "#1c1c20",
  ink: "#111111",
  void: "#07070a",

  /* ---- restrained metal ---- */
  metalDark: "#2b2b31",
  metalMid: "#9a9182",
  metalBright: "#c9c0ae",

  /* ---- lens ---- */
  lensBody: "#15151a",
  lensInner: "#0a0a0e",
  glass: "#0b1016",
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
