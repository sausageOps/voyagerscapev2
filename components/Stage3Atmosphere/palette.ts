/**
 * Stage 3 prototype palette.
 *
 * Restrained, slightly photographic pigments — muted lavender, sage/mint,
 * cream and powder blue. Values are linear-ish sRGB triples in 0..1 and are
 * uploaded once as uniforms; nothing here is animated on the CPU.
 */

export type Rgb = readonly [number, number, number];

const hex = (value: string): Rgb => {
  const n = parseInt(value.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const STAGE3_PALETTE = {
  /** Paper the pigments sit on — warm neutral, close to the homepage shell. */
  base: hex("#e9e3d8"),
  /** Four pigment fields. Ordered coolest → warmest for readable mixing. */
  lavender: hex("#b9a9dc"),
  sage: hex("#a9c9b2"),
  powder: hex("#a8bedd"),
  cream: hex("#f3e4c6"),
  /** Deep, desaturated ink used only to seat the darker boundaries. */
  ink: hex("#6f748c"),
} as const;

export const STAGE3_CONFIG = {
  /** Seconds of simulated time per second of wall clock. Low = slow drift. */
  timeScale: 0.085,
  /** Device pixel ratio cap — atmosphere is low frequency, 1.75 is plenty. */
  maxPixelRatio: 1.75,
  /** How hard the pointer bends the procedural domain. */
  pointerStrength: 1.0,
  /** Per-second decay of pointer influence once movement stops. */
  pointerDecay: 0.65,
  /** Reduced-motion time scale (near-static, still composed). */
  reducedTimeScale: 0.0,
} as const;

export const STAGE3_PALETTE_SWATCHES = [
  { name: "lavender", hex: "#B9A9DC" },
  { name: "sage", hex: "#A9C9B2" },
  { name: "powder", hex: "#A8BEDD" },
  { name: "cream", hex: "#F3E4C6" },
] as const;
