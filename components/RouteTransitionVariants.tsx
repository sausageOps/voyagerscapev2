"use client";

import type { ReactElement } from "react";
import { gsap } from "@/lib/motion";
import styles from "./RouteTransitionVariants.module.css";

/**
 * ROUTE TRANSITION VARIANT REGISTRY — Codrops-inspired GSAP variants
 * =================================================================
 *
 * Motion reference: github.com/Ibaliqbal/codrops-barbajs-page-transition
 * (the Codrops "Barba.js + GSAP page transition" project). What is
 * adapted here is ONLY its GSAP choreography vocabulary:
 *
 *   • the full-screen curtain sweep (their default transition),
 *   • the clip-path polygon band → full-cover → collapse (their
 *     example-4 "vertical clip" transition),
 *   • the cross-axis open (their example-6 clip choreography, which
 *     covers on one axis and reveals on the other),
 *   • its easing language — power3.inOut / expo.inOut / sine.inOut and
 *     the reference's custom "hop" cubic-bezier (0.56, 0, 0.35, 0.98).
 *
 * What is deliberately NOT ported: Astro, Barba routing, its own link
 * handling, its WebGL noise pass and its MorphSVG/DrawSVG curtains
 * (club plugins, and new creative systems this project does not want).
 * Voyagerscape keeps ONE transition engine — the existing
 * RouteTransition state machine — and this registry only supplies the
 * per-variant overlay DOM plus its cover/hold/reveal GSAP timelines.
 *
 * SELECTION: `nextTransitionVariant()` rotates through the registry
 * with a module-scope cursor — 0 → 1 → 2 → 3 → 4 → 0 — advancing once
 * per orchestrated navigation. Module scope (not component state) so
 * the index persists across mounts for the whole client session, and
 * deterministic (never random) so behaviour is debuggable. The
 * existing Vertical Tiles curtain stays outside the rotation: it is
 * the fallback/safety transition (see RouteTransition.tsx).
 *
 * SAFETY: every variant is a pure GSAP timeline over absolutely
 * positioned surfaces inside the existing fixed, overflow-hidden
 * layer. If a variant throws, the provider falls back to a plain
 * shield (cover → commit → fade) — navigation can never break.
 */

/** The reference project's "hop" ease, evaluated as a real cubic-bezier
 *  so no GSAP plugin is required. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (progress: number) => {
    if (progress <= 0 || progress >= 1) return progress;
    let t = progress;
    for (let i = 0; i < 8; i++) {
      const x = sampleX(t) - progress;
      if (Math.abs(x) < 1e-5) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= x / d;
    }
    // bisection fallback for the (never reached) degenerate case
    let lo = 0;
    let hi = 1;
    t = progress;
    for (let i = 0; i < 20; i++) {
      const x = sampleX(t);
      if (Math.abs(x - progress) < 1e-5) break;
      if (x < progress) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** The reference's custom ease — used where a touch of overshoot-free
 *  personality is wanted. */
const hopEase = cubicBezier(0.56, 0, 0.35, 0.98);

/** Shared shape of every registry entry. `commitAt` is the second into
 *  the cover timeline at which the viewport is fully hidden — the
 *  provider schedules the route commit exactly there (mirroring the
 *  tile curtain's coverEnd). */
export interface TransitionVariant {
  id: string;
  label: string;
  /** Surface colour — descriptive only (the DOM carries it). */
  color: string;
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

/* ------------------------------------------------------------------
   VARIANT 0 — PALE CURTAIN (ivory)
   A single full-screen pale ivory layer enters from the left, the
   route commits under it, and it continues out to the right — one
   continuous left-to-right flow. (Reference: the Codrops project's
   default curtain transition.)
   ------------------------------------------------------------------ */
const paleCurtain: TransitionVariant = {
  id: "pale-curtain",
  label: "Pale Curtain (ivory)",
  color: "#f3f0e8",
  commitAt: 0.62,
  render: () => (
    <div className={styles.overlay}>
      <span className={styles.surface} data-panel style={{ background: "var(--transition-ivory)" }} />
    </div>
  ),
  cover: (root) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-curtain: no panel");
    const tl = gsap.timeline();
    gsap.set(panel, { xPercent: -100 });
    tl.to(panel, { xPercent: 0, duration: 0.62, ease: "power3.inOut" });
    return tl;
  },
  hold: (root) => {
    const [panel] = panelsOf(root);
    if (panel) gsap.set(panel, { xPercent: 0 });
  },
  reveal: (root, tl) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-curtain: no panel on reveal");
    tl.to(panel, { xPercent: 100, duration: 0.78, ease: "power3.inOut", overwrite: "auto" }, 0.015);
  },
};

/* ------------------------------------------------------------------
   VARIANT 1 — PALE CLIP REVEAL (lavender)
   A lavender surface starts as a thin horizontal band across the
   vertical centre, blooms open to full coverage (the route commits),
   then collapses upward off the top edge. (Reference: the Codrops
   project's example-4 clip-path polygon choreography.)
   ------------------------------------------------------------------ */
const paleClipReveal: TransitionVariant = {
  id: "pale-clip-reveal",
  label: "Pale Clip Reveal (lavender)",
  color: "#ddd9e8",
  commitAt: 0.68,
  render: () => (
    <div className={styles.overlay}>
      <span className={styles.surface} data-panel style={{ background: "var(--transition-lavender)" }} />
    </div>
  ),
  cover: (root) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-clip-reveal: no panel");
    const tl = gsap.timeline();
    gsap.set(panel, { clipPath: "polygon(0% 46%, 100% 46%, 100% 54%, 0% 54%)" });
    tl.to(panel, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 0.68,
      ease: "expo.inOut",
    });
    return tl;
  },
  hold: (root) => {
    const [panel] = panelsOf(root);
    if (panel) gsap.set(panel, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" });
  },
  reveal: (root, tl) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-clip-reveal: no panel on reveal");
    tl.to(
      panel,
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
        duration: 0.85,
        ease: "expo.inOut",
        overwrite: "auto",
      },
      0.015,
    );
  },
};

/* ------------------------------------------------------------------
   VARIANT 2 — PALE PANEL SWEEP (parchment)
   Five full-height parchment columns drop in from the top, staggered
   left-to-right (a directional cascade — deliberately different from
   the fallback curtain's center-out tiles), the route commits, and
   the columns continue downward off the bottom in the same order.
   ------------------------------------------------------------------ */
const COLUMN_COUNT = 5;
const COLUMN_COVER_DURATION = 0.5;
const COLUMN_STAGGER = 0.05;

const palePanelSweep: TransitionVariant = {
  id: "pale-panel-sweep",
  label: "Pale Panel Sweep (parchment)",
  color: "#e8e2d7",
  commitAt: COLUMN_COVER_DURATION + (COLUMN_COUNT - 1) * COLUMN_STAGGER,
  render: () => (
    <div className={styles.overlay}>
      {Array.from({ length: COLUMN_COUNT }, (_, i) => (
        <span
          key={i}
          className={styles.column}
          data-panel
          /* TileCurtain's seam-free geometry: percentage slot + 1px. */
          style={{
            left: `${(i * 100) / COLUMN_COUNT}%`,
            width: `calc(${100 / COLUMN_COUNT}% + 1px)`,
            background: "var(--transition-parchment)",
          }}
        />
      ))}
    </div>
  ),
  cover: (root) => {
    const panels = panelsOf(root);
    if (panels.length === 0) throw new Error("pale-panel-sweep: no panels");
    const tl = gsap.timeline();
    gsap.set(panels, { yPercent: -100 });
    tl.to(panels, {
      yPercent: 0,
      duration: COLUMN_COVER_DURATION,
      ease: "sine.inOut",
      stagger: { each: COLUMN_STAGGER, from: "start" },
    });
    return tl;
  },
  hold: (root) => {
    const panels = panelsOf(root);
    if (panels.length > 0) gsap.set(panels, { yPercent: 0 });
  },
  reveal: (root, tl) => {
    const panels = panelsOf(root);
    if (panels.length === 0) throw new Error("pale-panel-sweep: no panels on reveal");
    tl.to(
      panels,
      {
        yPercent: 100,
        duration: 0.62,
        ease: "sine.inOut",
        stagger: { each: COLUMN_STAGGER, from: "start" },
        overwrite: "auto",
      },
      0.015,
    );
  },
};

/* ------------------------------------------------------------------
   VARIANT 3 — PALE SPLIT MASK (sage)
   Two sage half-panels slide in from the left and right edges and
   meet at the centre (the route commits), then open on the CROSS
   axis — the left half exits up, the right half exits down. (The
   cross-axis reveal is the Codrops project's example-6 idea.)
   ------------------------------------------------------------------ */
const paleSplitMask: TransitionVariant = {
  id: "pale-split-mask",
  label: "Pale Split Mask (sage)",
  color: "#dce1d8",
  commitAt: 0.66,
  render: () => (
    <div className={styles.overlay}>
      <span
        className={styles.half}
        data-panel
        data-side="left"
        style={{ left: 0, width: "calc(50% + 1px)", background: "var(--transition-sage)" }}
      />
      <span
        className={styles.half}
        data-panel
        data-side="right"
        style={{ right: 0, width: "50%", background: "var(--transition-sage)" }}
      />
    </div>
  ),
  cover: (root) => {
    const [left, right] = panelsOf(root);
    if (!left || !right) throw new Error("pale-split-mask: no panels");
    const tl = gsap.timeline();
    gsap.set(left, { xPercent: -100 });
    gsap.set(right, { xPercent: 100 });
    tl.to(left, { xPercent: 0, duration: 0.66, ease: "expo.inOut" }, 0);
    tl.to(right, { xPercent: 0, duration: 0.66, ease: "expo.inOut" }, 0);
    return tl;
  },
  hold: (root) => {
    const [left, right] = panelsOf(root);
    if (left) gsap.set(left, { xPercent: 0 });
    if (right) gsap.set(right, { xPercent: 0 });
  },
  reveal: (root, tl) => {
    const [left, right] = panelsOf(root);
    if (!left || !right) throw new Error("pale-split-mask: no panels on reveal");
    tl.to(left, { yPercent: -100, duration: 0.8, ease: "expo.inOut", overwrite: "auto" }, 0.015);
    tl.to(right, { yPercent: 100, duration: 0.8, ease: "expo.inOut", overwrite: "auto" }, 0.015);
  },
};

/* ------------------------------------------------------------------
   VARIANT 4 — PALE BAND (blush)
   A blush surface grows from a hairline horizontal band at the
   centre to full height (the route commits), then collapses to a
   vertical sliver at the centre and is gone. Transform-only, GPU
   friendly, and the reference "hop" ease's only appearance.
   ------------------------------------------------------------------ */
const paleBand: TransitionVariant = {
  id: "pale-band",
  label: "Pale Band (blush)",
  color: "#e9dcd2",
  commitAt: 0.6,
  render: () => (
    <div className={styles.overlay}>
      <span className={styles.surface} data-panel style={{ background: "var(--transition-blush)" }} />
    </div>
  ),
  cover: (root) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-band: no panel");
    const tl = gsap.timeline();
    gsap.set(panel, { scaleX: 1, scaleY: 0.055, transformOrigin: "50% 50%" });
    tl.to(panel, { scaleY: 1, duration: 0.6, ease: hopEase });
    return tl;
  },
  hold: (root) => {
    const [panel] = panelsOf(root);
    if (panel) gsap.set(panel, { scaleY: 1 });
  },
  reveal: (root, tl) => {
    const [panel] = panelsOf(root);
    if (!panel) throw new Error("pale-band: no panel on reveal");
    tl.to(
      panel,
      { scaleX: 0, duration: 0.8, ease: "expo.inOut", transformOrigin: "50% 50%", overwrite: "auto" },
      0.015,
    );
  },
};

/** The rotation — the brief's order. Deterministic, never random. */
const ROTATION: readonly TransitionVariant[] = [
  paleCurtain,
  paleClipReveal,
  palePanelSweep,
  paleSplitMask,
  paleBand,
];

/** Module-scope cursor: survives every mount/unmount for the whole
 *  client session, resets only on a real page load. */
let rotationCursor = 0;

/** Next variant in the 0 → 1 → 2 → 3 → 4 → 0 rotation. */
export function nextTransitionVariant(): TransitionVariant {
  const variant = ROTATION[rotationCursor % ROTATION.length];
  rotationCursor += 1;
  return variant;
}

/** Registry lookup by id (used when re-rendering the active overlay). */
export function variantById(id: string | null): TransitionVariant | null {
  if (!id) return null;
  return ROTATION.find((v) => v.id === id) ?? null;
}
