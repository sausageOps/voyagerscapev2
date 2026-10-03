"use client";

import { Component, type ReactNode } from "react";
import PatternWaves from "./PatternWaves";
import styles from "./HomeCanvas.module.css";

/**
 * HOMEPAGE ATMOSPHERE — React Bits "Pattern Waves" (WebGL2 / OGL)
 * ==============================================================
 *
 * The homepage's living background, mounted inside `.atmosphere` in
 * HomeCanvas. It is a renderer swap and nothing more: the ShaderTown Mesh
 * Gradient is gone, and in its place the React Bits Pattern Waves surface
 * (vendored verbatim in ./PatternWaves.tsx) prints its procedural wave
 * field inside the same layer.
 *
 * Current look — the React Bits "lines" preset, exactly as configured in
 * the demo (reactbits.dev/backgrounds/pattern-waves?preset=lines&…):
 * flowing contour LINES tracing a RIPPLE surface — rings travelling in
 * from off screen — printed in near-black ink (#18181b, the demo's mark
 * colour) over an opaque base of #fffdf9, the frame's warm-white paper
 * (BLACK + #FFFDF9). Every value not passed below is deliberately left
 * at its preset/component default (light 0°, contrast 1.2, scale 1,
 * opacity 1, fade edges/0.5, cursor 50px/0.6, intro on) so the frame
 * shows the exact reference look.
 *
 * NOTE: this #fffdf9 is intentionally NOT the global --vs-bg cream
 * (#f5f0e8) — that token is shared with the tile curtain (loader +
 * route transitions), the mobile menu, the outer page background and
 * several text colours, none of which may shift. The frame's paper is
 * this layer's own value.
 *
 * The four static field spans stay in the markup directly beneath this
 * layer. With the opaque cream base they are no longer the visible
 * colour — they are the FALLBACK: the whole atmosphere when the canvas
 * cannot run (no WebGL2, OGL/WebGL failure — see AtmosphereBoundary — or
 * JavaScript disabled), so a renderer failure lands on the existing soft
 * static atmosphere, never a blank rectangle.
 *
 * Motion — the surface moves continuously under Pattern Waves' own
 * requestAnimationFrame loop, which sleeps while the frame is off screen
 * and wakes for resize/settings changes; no second animation system is
 * added here and no React state changes per frame (settings flow through
 * a ref). The cursor may stir a wake of ripples: the listeners are
 * window-level and passive, nothing is intercepted, and the canvas host
 * is pointer-events: none (HomeCanvas.module.css) so the CRT keeps the
 * page's pointer interaction, exactly as before.
 *
 * Entrance — the component's built-in intro fades the marks in from the
 * centre and raises the surface over ~2s on a solid cream canvas, so the
 * layer never pops and needs no readiness plumbing.
 *
 * Reduced motion — Pattern Waves reads `prefers-reduced-motion` itself:
 * surface time stops (a single still frame is drawn) and the cursor
 * ripples are disabled. The CSS in HomeCanvas.module.css additionally
 * keeps the field layer static under the same preference.
 */

/**
 * The exact React Bits "lines" preset configuration. Explicit values the
 * preset already carries are passed anyway (per the reference URL) so the
 * intent stays legible if the preset base ever drifts upstream.
 */
const PATTERN_WAVES_PROPS = {
  /** The contour-line look: line marks, 12px spacing, markSize 0.4. */
  preset: "lines",
  pattern: "line",
  spacing: 12,
  markSize: 0.4,
  /** Ripple: rings travelling in from off screen. */
  wave: "ripple",
  /** The demo's near-black mark colour — visibly darker ink on the cream. */
  color: "#18181b",
  /** Surface height and glint strength. */
  depth: 0.9,
  shine: 0.6,
  /** Travel direction, 30° off the preset's 20°. */
  direction: 30,
  /** Slow drift. */
  speed: 0.3,
  /** The frame's warm-white paper base — BLACK + #FFFDF9 (see header). */
  backgroundColor: "#fffdf9",
} as const;

/**
 * WebGL/OGL failures (context creation, shader compile, extension probe)
 * must never take the homepage down: this boundary catches them, drops
 * the canvas layer, and leaves the static field washes as the atmosphere
 * — the same pale fallback the no-WebGL2 path already lands on.
 */
class AtmosphereBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HomeAtmosphere() {
  return (
    <div className={styles.shader}>
      <AtmosphereBoundary>
        <PatternWaves {...PATTERN_WAVES_PROPS} className={styles.shaderHost} />
      </AtmosphereBoundary>
    </div>
  );
}
