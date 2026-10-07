"use client";

import type { ReactElement } from "react";
import { gsap } from "@/lib/motion";
import styles from "./RouteTransitionVariants.module.css";

/**
 * ROUTE TRANSITION REGISTRY — DESTINATION-BASED SELECTION
 * =======================================================
 *
 * Motion reference: the Codrops article "Creating Custom Page Transitions
 * in Astro with Barba.js and GSAP" and its companion repo
 * (github.com/Ibaliqbal/codrops-barbajs-page-transition). Only the GSAP
 * choreography is adapted — no Astro, no Barba, no second router. The
 * existing RouteTransition state machine (interception, watchdogs,
 * reduced-motion, scroll lock, cleanup) stays the ONE engine and simply
 * asks this registry what to render.
 *
 * SELECTION MODEL
 * ---------------
 * The ANIMATION is fixed per destination (never random):
 *
 *   HOME  (/)        → Codrops first transition — the synced clip-path +
 *                      scale reveal (their default `sync: true` move,
 *                      transposed onto the overlay + the content stage's
 *                      existing drift/dim).
 *   ART   (/art)     → Codrops fifth transition — the truus.co-style SVG
 *                      stroke draw with an expanding stroke width.
 *   CONNECT (/connect) → Codrops third transition — the SVG path morph
 *                      (sliver → curved bulge → full cover, reversed out).
 *   ABOUT (/about)   → the ORIGINAL Voyagerscape tile curtain — returned
 *                      as `null` here so the provider runs its untouched
 *                      tile path. Unknown destinations also fall back to
 *                      the tiles.
 *
 * The COLOR is random per navigation, chosen from the DAY or NIGHT
 * palette (read from the live html[data-theme] at the moment the
 * transition begins), never repeating the previous color back-to-back.
 *
 * PLUGINS: neither DrawSVGPlugin nor MorphSVGPlugin (GSAP club plugins)
 * is used. The draw is done with pathLength="1" + stroke-dasharray /
 * stroke-dashoffset, and the morph with GSAP attr-tweening between
 * structurally identical SVG path strings — the exact techniques the
 * Codrops effects are built on, plugin-free.
 */

/** Shared shape of every registry entry. `commitAt` is the second into
 *  the cover timeline at which the viewport is fully hidden — the
 *  provider schedules the route commit exactly there. */
export interface TransitionVariant {
  id: string;
  label: string;
  /** Seconds into `cover` when full coverage is reached. */
  commitAt: number;
  /** Overlay DOM, rendered inside the existing transition layer. */
  render: () => ReactElement;
  /** Initial-state + cover animation. Returns the running timeline. */
  cover: (root: HTMLElement) => gsap.core.Timeline;
  /** Idempotently re-assert the fully-covered state (covered phase). */
  hold: (root: HTMLElement) => void;
  /** Append the reveal tweens to the provider's reveal timeline. */
  reveal: (root: HTMLElement, tl: gsap.core.Timeline) => void;
}

const panelsOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));

/* ==================================================================
   VARIANT — "synced-reveal" (HOME) · Codrops FIRST transition
   ==================================================================
   Their default transition runs the old and next page in sync: the
   current page scales down / dims / drifts while the next page is
   clip-revealed upward (inset(100% 0 0 0) → inset(0)) and settles from
   a reduced scale to 1. Transposed onto the overlay: the surface
   enters through exactly that clip choreography + scale, while the
   provider's content stage performs its existing synchronized drift
   and dim on the real page beneath — the same two-partner sync, with
   Next.js committing the route under full coverage. */
const syncedReveal: TransitionVariant = {
  id: "synced-reveal",
  label: "Synced Reveal (Codrops #1)",
  commitAt: 0.66,
  render: () => (
    <div className={styles.overlay}>
      <span className={styles.surface} data-panel />
    </div>
  ),
  cover: (root) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("synced-reveal: no panel");
    const tl = gsap.timeline();
    gsap.set(panel, { clipPath: "inset(100% 0 0 0)", scale: 0.72, transformOrigin: "50% 50%" });
    tl.to(
      panel,
      { clipPath: "inset(0% 0 0 0)", scale: 1, duration: 0.66, ease: "power3.inOut" },
      0,
    );
    return tl;
  },
  hold: (root) => {
    const [panel] = panelsOf(root);
    if (panel) gsap.set(panel, { clipPath: "inset(0% 0 0 0)", scale: 1 });
  },
  reveal: (root, tl) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("synced-reveal: no panel on reveal");
    tl.to(
      panel,
      { clipPath: "inset(0 0 100% 0)", scale: 1.05, duration: 0.8, ease: "expo.inOut", overwrite: "auto" },
      0.015,
    );
  },
};

/* ==================================================================
   VARIANT — "svg-draw" (ART) · Codrops FIFTH transition (truus.co)
   ==================================================================
   Their fifth transition draws SVG paths in (DrawSVG 0% → 100%) while
   the stroke width expands until the thick strokes alone cover the
   viewport; the reveal retracts the draw and thins the strokes. Here
   the draw is done plugin-free with pathLength="1" +
   stroke-dasharray/stroke-dashoffset, and the stroke width grows past
   the viewport diagonal — the middle strand passes through the exact
   centre, so a stroke of diagonal-width guarantees full coverage.
   vector-effect="non-scaling-stroke" keeps the width in screen pixels
   under the stretched viewBox. */
const DRAW_STRANDS = [
  "M 0 30 C 30 10, 70 50, 100 30",
  "M 0 50 C 30 30, 70 70, 100 50",
  "M 0 70 C 30 50, 70 90, 100 70",
] as const;

const svgDraw: TransitionVariant = {
  id: "svg-draw",
  label: "SVG Draw (Codrops #5)",
  commitAt: 0.66,
  render: () => (
    <div className={styles.overlay}>
      <svg className={styles.drawSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {DRAW_STRANDS.map((d, i) => (
          <path
            key={i}
            className={styles.drawPath}
            data-panel
            d={d}
            pathLength={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  ),
  cover: (root) => {
    const paths = panelsOf(root);
    if (paths.length === 0) throw new Error("svg-draw: no paths");
    /* A stroke this wide, centred on a strand through the middle of the
       viewport, provably covers every pixel (any point is at most
       half-the-diagonal from the centre). */
    const coverWidth = Math.hypot(window.innerWidth, window.innerHeight) * 1.2;
    const tl = gsap.timeline();
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1, attr: { "stroke-width": 26 }, opacity: 0 });
    tl.to(paths, { opacity: 1, duration: 0.12, ease: "none", stagger: 0.04 }, 0);
    tl.to(
      paths,
      { strokeDashoffset: 0, duration: 0.42, ease: "power2.inOut", stagger: 0.05 },
      0.06,
    );
    tl.to(
      paths,
      { attr: { "stroke-width": coverWidth }, duration: 0.5, ease: "sine.inOut" },
      0.16,
    );
    return tl;
  },
  hold: (root) => {
    const paths = panelsOf(root);
    if (paths.length > 0) {
      const coverWidth = Math.hypot(window.innerWidth, window.innerHeight) * 1.2;
      gsap.set(paths, { strokeDashoffset: 0, opacity: 1, attr: { "stroke-width": coverWidth } });
    }
  },
  reveal: (root, tl) => {
    const paths = panelsOf(root);
    if (paths.length === 0) throw new Error("svg-draw: no paths on reveal");
    tl.to(paths, { attr: { "stroke-width": 30 }, duration: 0.55, ease: "sine.inOut", overwrite: "auto" }, 0.015);
    tl.to(
      paths,
      /* -1 walks the dash out the far end: the stroke un-draws. */
      { strokeDashoffset: -1, duration: 0.6, ease: "power2.inOut" },
      0.05,
    );
    tl.to(paths, { opacity: 0, duration: 0.16, ease: "none" }, 0.5);
  },
};

/* ==================================================================
   VARIANT — "svg-morph" (CONNECT) · Codrops THIRD transition
   ==================================================================
   Their third transition morphs an SVG path: a zero-height sliver
   grows into a curved bulge, then fills to the full viewport; the
   reveal morphs it away again. MorphSVGPlugin is a club plugin, so the
   morph is done with GSAP's attr tween between structurally identical
   path strings (M V Q V z with matching coordinates) — the same
   interpolation the plugin performs for these simple shapes. */
const MORPH_SLIVER_BOTTOM = "M 0 100 V 100 Q 50 100 100 100 V 100 z";
const MORPH_ENTER_CURVE = "M 0 100 V 50 Q 50 0 100 50 V 100 z";
const MORPH_FILLED = "M 0 100 V 0 Q 50 0 100 0 V 100 z";
const MORPH_LEAVE_CURVE = "M 0 0 V 50 Q 50 100 100 50 V 0 z";
const MORPH_COLLAPSED_TOP = "M 0 0 V 0 Q 50 0 100 0 V 0 z";

const svgMorph: TransitionVariant = {
  id: "svg-morph",
  label: "SVG Morph (Codrops #3)",
  commitAt: 0.64,
  render: () => (
    <div className={styles.overlay}>
      <svg className={styles.morphSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.morphPath} data-panel d={MORPH_SLIVER_BOTTOM} />
      </svg>
    </div>
  ),
  cover: (root) => {
    const [path] = panelsOf(root);
    if (!path) throw new Error("svg-morph: no path");
    const tl = gsap.timeline();
    gsap.set(path, { attr: { d: MORPH_SLIVER_BOTTOM } });
    tl.to(path, { attr: { d: MORPH_ENTER_CURVE }, duration: 0.3, ease: "sine.in" }, 0);
    tl.to(path, { attr: { d: MORPH_FILLED }, duration: 0.34, ease: "sine.inOut" }, 0.3);
    return tl;
  },
  hold: (root) => {
    const [path] = panelsOf(root);
    if (path) gsap.set(path, { attr: { d: MORPH_FILLED } });
  },
  reveal: (root, tl) => {
    const [path] = panelsOf(root);
    if (!path) throw new Error("svg-morph: no path on reveal");
    tl.to(path, { attr: { d: MORPH_LEAVE_CURVE }, duration: 0.34, ease: "sine.inOut", overwrite: "auto" }, 0.015);
    tl.to(path, { attr: { d: MORPH_COLLAPSED_TOP }, duration: 0.3, ease: "sine.out" }, 0.35);
  },
};

/** The registry — one fixed animation per destination (see the map below). */
const REGISTRY: readonly TransitionVariant[] = [syncedReveal, svgDraw, svgMorph];

/** Registry lookup by id (used when re-rendering the active overlay). */
export function variantById(id: string | null): TransitionVariant | null {
  if (!id) return null;
  return REGISTRY.find((v) => v.id === id) ?? null;
}

/* ------------------------------------------------------------------
   DESTINATION → ANIMATION
   Fixed mapping; never random. Unknown destinations (and /about, by
   design) return null → the provider's ORIGINAL Voyagerscape tile
   curtain, which also remains the safety/fallback transition.
   ------------------------------------------------------------------ */
export function variantForDestination(href: string): TransitionVariant | null {
  let path = href;
  try {
    path = new URL(href, window.location.href).pathname;
  } catch {
    path = href.split(/[?#]/)[0] || "/";
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "") path = "/";

  switch (path) {
    case "/":
      return syncedReveal;
    case "/art":
      return svgDraw;
    case "/connect":
      return svgMorph;
    default:
      /* /about + anything unknown → the original tile curtain. */
      return null;
  }
}

/* ------------------------------------------------------------------
   COLOR SELECTION — random per navigation, theme-aware, never the
   same color twice in a row (while alternatives exist). Independent
   of the animation selection. Module scope so it persists across
   mounts for the whole client session, exactly like the old rotation
   cursor did.
   ------------------------------------------------------------------ */

/** DAY palette — unchanged. */
const DAY_PALETTE = ["#f3f0e8", "#ddd9e8", "#e8e2d7", "#dce1d8", "#e9dcd2"] as const;
/** NIGHT palette — smoked/dusty/desaturated; no pastel brightness. */
const NIGHT_PALETTE = ["#5a564e", "#514d5b", "#595247", "#515950", "#594b4a"] as const;

/** The last color handed out (any theme) — the no-immediate-repeat guard. */
let lastColorHex: string | null = null;

/** Random transition color for the CURRENT theme. */
export function getTransitionColor(): string {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";
  const palette: readonly string[] = dark ? NIGHT_PALETTE : DAY_PALETTE;
  let pool: readonly string[] = palette.filter((c) => c !== lastColorHex);
  if (pool.length === 0) pool = palette;
  const color = pool[Math.floor(Math.random() * pool.length)];
  lastColorHex = color;
  return color;
}
