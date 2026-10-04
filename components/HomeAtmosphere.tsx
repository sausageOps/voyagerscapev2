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
 * Current look — the React Bits "terminal" preset, exactly as configured
 * in the demo (reactbits.dev/backgrounds/pattern-waves?preset=terminal&…):
 * a dense field of terminal GLYPH marks over a RIPPLE surface — rings
 * travelling in from off screen — printed in near-black ink (#18181b,
 * the demo's mark colour) over an opaque base of #fffdf9, the paper
 * (BLACK + #FFFDF9). Every value not passed below is deliberately left
 * at its preset/component default (markSize 0.95, opacity 1, fade
 * edges/0.5, interactive on, cursor 50px/0.6, intro on) so the frame
 * shows the exact reference look and the pointer interaction is the
 * component's own, unchanged.
 *
 * NOTE: this #fffdf9 is intentionally NOT the global --vs-bg cream
 * (#f5f0e8) — that token is shared with the tile curtain (loader +
 * route transitions), the mobile menu, the outer page background and
 * several text colours, none of which may shift. The frame's paper is
 * this layer's own value.
 *
 * This layer is the SOLE visual frame background. The legacy pastel field
 * washes that used to sit beneath it were removed; the fallback when the
 * canvas cannot run (no WebGL2, OGL/WebGL failure — see AtmosphereBoundary
 * — or JavaScript disabled) is the frame's own #fffdf9 paper, painted by
 * .atmosphere in HomeCanvas.module.css, never a blank rectangle.
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
  /* The React Bits "terminal" surface, configured exactly as
     reactbits.dev/backgrounds/pattern-waves?preset=terminal&pattern=glyph
     &wave=ripple&shine=0.9&contrast=1.4&speed=0.3&scale=1.1&direction=204
     &spacing=5&depth=1.5&light=90&backgroundColor=fffdf9

     Glyph marks come from Pattern Waves' own atlas (the component's
     `characters` default) — nothing here draws, approximates or
     overlays text. */
  preset: "terminal",
  /** Terminal glyph marks replace the former contour lines. */
  pattern: "glyph",
  /** Ripple: rings travelling in from off screen. */
  wave: "ripple",
  /** Dense field. */
  spacing: 5,
  /** Stronger relief and directional lighting than the preset's own. */
  depth: 1.5,
  light: 90,
  shine: 0.9,
  contrast: 1.4,
  /** Slow drift. */
  speed: 0.3,
  scale: 1.1,
  direction: 204,
  /* markSize is deliberately NOT set: the URL does not carry one, so
     the terminal preset's own 0.95 applies (the previous config pinned
     0.4, which belonged to the lines preset). */
  /* Not in the URL either, but kept: the component's colour default is
     #ffffff, and white marks on this cream paper would be invisible.
     #18181b is the demo's mark ink and the site's existing near-black,
     so the palette is unchanged. */
  color: "#18181b",
  /** The frame's warm-white paper base — BLACK + #FFFDF9 (see header). */
  backgroundColor: "#fffdf9",
} as const;

/**
 * WebGL/OGL failures (context creation, shader compile, extension probe)
 * must never take the homepage down: this boundary catches them, drops
 * the canvas layer, and leaves the frame's #fffdf9 paper as the
 * atmosphere — the same fallback the no-WebGL2 path already lands on.
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
