"use client";

import { useCallback, useState } from "react";
import { ShaderCanvas } from "shadertown/react";
import type { RendererStatus } from "shadertown";
import styles from "./HomeCanvas.module.css";

/**
 * HOMEPAGE ATMOSPHERE — ShaderTown "Mesh Gradient" (WebGPU)
 * =========================================================
 *
 * The homepage's living background, mounted inside `.atmosphere` in
 * HomeCanvas. It replaces the old pointer/sine-driven blurred DOM fields as
 * the *renderer*. The four static field spans stay in the markup directly
 * beneath this layer: they are the base the shader covers when it is ready,
 * and the whole atmosphere when it is not (no WebGPU, pipeline error, or
 * JavaScript disabled) — so the no-WebGPU fallback is the existing soft
 * static atmosphere, never a blank rectangle.
 *
 * Palette — the three colours are the existing atmosphere's rendered blooms
 * (each field composited over the cream base at its own CSS opacity), so the
 * shader surfaces the palette the page already had:
 *
 *   colorA  #e0e4da  pale sage wash    — worn by two of the four spots
 *   colorB  #dcd2f0  pale lavender wash
 *   colorC  #f2dcc0  subtle warm peach wash
 *
 * Mesh Gradient blends its spots in OKLab, so every blend is a perceptual
 * mix of these three: pale in, pale out — the surface can never become more
 * saturated than its inputs. The cream/sage/lavender/peach balance matches
 * the static baseline (mean lightness ≈ 0.90, chroma ≤ 0.04).
 *
 * Motion — four spots drift on slow Lissajous orbits (roughly a minute to
 * a minute and a half per component cycle, so no perceptible loop) over a
 * gentle simplex bend and a central swirl that decays toward the frame
 * edges. The atmosphere is autonomous: `trackPointer` stays off, and the
 * CRT keeps the page's pointer interaction untouched.
 *
 * Quality — Mesh Gradient is a light shader, but this is a fullscreen
 * surface, so the pixel ratio is capped at 1.5 and the frame rate at 30
 * (invisible on a slow drift). The tier is pinned to `high` deliberately:
 * pinning skips the runtime's auto-tier device probing, which would
 * otherwise fetch benchmark tables from a CDN — this keeps the atmosphere
 * fully self-hosted. ShaderTown owns the render loop; nothing here adds a
 * second one, and `play="visible"` stops it entirely off screen.
 *
 * Reduced motion — ShaderCanvas reads `prefers-reduced-motion` itself and
 * holds a single still frame rather than animating; the CSS in
 * HomeCanvas.module.css additionally disables this layer's fade-in under
 * that preference.
 */

/** Palette and motion, tuned against the existing field colours (see above). */
const MESH_PARAMS = {
  colorA: "#e0e4da",
  colorB: "#dcd2f0",
  colorC: "#f2dcc0",
  speed: 0.75,
  scale: 1,
  intensity: 1,
  vibrancy: 1,
  grain: 0.02,
  vignette: 0,
  warp: 0.55,
  swirl: 0.55,
} as const;

const MESH_QUALITY = {
  dpr: [1, 1.5] as const,
  fps: 30,
  tier: "high",
} as const;

/**
 * `pending` until the renderer reports itself, `ready` once the first frame
 * is on screen (drives the fade-in), `failed` when WebGPU is missing or the
 * pipeline errored — the layer unmounts and the static fields remain.
 */
type AtmosphereState = "pending" | "ready" | "failed";

export default function HomeAtmosphere() {
  const [state, setState] = useState<AtmosphereState>("pending");

  const onStatusChange = useCallback((status: RendererStatus) => {
    if (status === "ready") setState("ready");
    else if (status === "unsupported" || status === "error") setState("failed");
  }, []);

  if (state === "failed") return null;

  return (
    <div className={state === "ready" ? `${styles.shader} ${styles.shaderReady}` : styles.shader}>
      <ShaderCanvas
        shader="mesh-gradient"
        params={MESH_PARAMS}
        quality={MESH_QUALITY}
        play="visible"
        badge={false}
        className={styles.shaderHost}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
