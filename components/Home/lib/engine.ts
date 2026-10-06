"use client";

/* =========================================================================
   HOMEPAGE MOTION ENGINE
   -------------------------------------------------------------------------
   One scroll source, one pointer source, one ticker — shared by every
   chapter on the homepage.

   Why this exists rather than a per-component rAF:

   - Each chapter needs scroll progress and/or a pointer field. Eight
     components each running their own requestAnimationFrame + scroll
     listener is the classic "effects monster"; this is one loop that
     sleeps the moment nothing is moving.
   - Element geometry is measured once (and on resize / document resize),
     never per frame, so the loop never forces layout.
   - Scenes are gated by IntersectionObserver: offscreen chapters are not
     computed at all, and their canvases are told to stop.
   - The loop is attached to gsap.ticker, which is the same clock Lenis
     runs on, so scroll-linked transforms land in the same frame as the
     smooth-scroll position (no one-frame jitter).
   ========================================================================= */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/* ---------- small math vocabulary, shared by every chapter ---------- */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hermite ramp — the house easing for anything driven by position. */
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
};

/** Maps a sub-range of a progress value back onto 0..1. */
export const range = (p: number, start: number, end: number) =>
  clamp01((p - start) / (end - start || 1));

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/* ---------- scene / field registries ---------- */

/**
 * through — 0 as the element's top reaches the viewport bottom,
 *           1 as its bottom clears the viewport top. (whole passage)
 * cover   — 0 as the element's top reaches the viewport bottom,
 *           1 as its top reaches the viewport top. (entrance only)
 * pin     — 0 as the element's top reaches the viewport top,
 *           1 as its bottom reaches the viewport bottom. (tall track
 *           holding a sticky stage: progress of the pinned sequence)
 * exit    — 0 as the element's bottom reaches the viewport bottom,
 *           1 as its bottom reaches the viewport top. (departure only)
 */
export type SceneMode = "through" | "cover" | "pin" | "exit";

interface Scene {
  el: HTMLElement;
  mode: SceneMode;
  cb: (progress: number, velocity: number) => void;
  top: number;
  height: number;
  visible: boolean;
  last: number;
}

interface Field {
  el: HTMLElement;
  cb: (x: number, y: number, strength: number) => void;
  ease: number;
  margin: number;
  /** viewport-space geometry, re-read once per frame (see frame()) */
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
  /** current (eased) and target values */
  cx: number;
  cy: number;
  cs: number;
  tx: number;
  ty: number;
  ts: number;
  settled: boolean;
}

const scenes = new Set<Scene>();
const fields = new Set<Field>();

let ticking = false;
let lastScrollY = -1;
let velocity = 0;
let pointerX = -9999;
let pointerY = -9999;
let pointerLive = false;
let observer: IntersectionObserver | null = null;
const sceneByEl = new WeakMap<Element, Scene>();
const fieldByEl = new WeakMap<Element, Field[]>();

/** Scenes hold document-space offsets: they are read on registration, on
 *  resize and whenever the document itself changes size — never per frame. */
function measure(scene: Scene) {
  const rect = scene.el.getBoundingClientRect();
  scene.top = rect.top + window.scrollY;
  scene.height = rect.height;
}

function measureAll() {
  scenes.forEach(measure);
  lastScrollY = -1; // force a recompute
  wake();
}

function progressFor(scene: Scene, scrollY: number, vh: number) {
  const { top, height, mode } = scene;
  switch (mode) {
    case "pin":
      return clamp01((scrollY - top) / Math.max(1, height - vh));
    case "cover":
      return clamp01((scrollY + vh - top) / Math.max(1, vh));
    case "exit":
      return clamp01((scrollY + vh - (top + height)) / Math.max(1, vh));
    case "through":
    default:
      return clamp01((scrollY + vh - top) / Math.max(1, height + vh));
  }
}

function frame() {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const scrolled = scrollY !== lastScrollY;

  if (scrolled) {
    velocity = lastScrollY < 0 ? 0 : scrollY - lastScrollY;
    lastScrollY = scrollY;
    scenes.forEach((scene) => {
      if (!scene.visible) return;
      const p = progressFor(scene, scrollY, vh);
      if (Math.abs(p - scene.last) < 0.0002) return;
      scene.last = p;
      scene.cb(p, velocity);
    });
  } else if (velocity !== 0) {
    velocity = 0;
    scenes.forEach((scene) => {
      if (scene.visible) scene.cb(scene.last, 0);
    });
  }

  let busy = scrolled;

  /* Fields read live geometry: several of them live on sticky stages, whose
     document offset is meaningless while pinned. All the reads happen in
     one pass, before any style is written, so the frame costs a single
     layout flush rather than one per field. */
  if (pointerLive) {
    fields.forEach((field) => {
      if (!field.visible) return;
      const rect = field.el.getBoundingClientRect();
      field.left = rect.left;
      field.top = rect.top;
      field.width = rect.width;
      field.height = rect.height;
    });
  }

  fields.forEach((field) => {
    if (!field.visible) return;
    if (pointerLive) {
      const localX = pointerX - field.left;
      const localY = pointerY - field.top;
      const m = field.margin;
      const inside =
        localX > -m &&
        localY > -m &&
        localX < field.width + m &&
        localY < field.height + m;
      field.tx = field.width ? localX / field.width : 0.5;
      field.ty = field.height ? localY / field.height : 0.5;
      field.ts = inside ? 1 : 0;
    } else {
      field.ts = 0;
    }
    if (field.ts === 0) {
      field.tx = 0.5;
      field.ty = 0.5;
    }

    const e = field.ease;
    field.cx = lerp(field.cx, field.tx, e);
    field.cy = lerp(field.cy, field.ty, e);
    field.cs = lerp(field.cs, field.ts, e);

    const delta =
      Math.abs(field.cx - field.tx) +
      Math.abs(field.cy - field.ty) +
      Math.abs(field.cs - field.ts);

    if (delta < 0.0004) {
      if (field.settled) return;
      field.settled = true;
      field.cx = field.tx;
      field.cy = field.ty;
      field.cs = field.ts;
    } else {
      field.settled = false;
      busy = true;
    }
    field.cb(field.cx, field.cy, field.cs);
  });

  if (!busy) sleep();
}

function wake() {
  if (ticking) return;
  if (!scenes.size && !fields.size) return;
  ticking = true;
  gsap.ticker.add(frame);
}

function sleep() {
  if (!ticking) return;
  ticking = false;
  gsap.ticker.remove(frame);
}

function ensureGlobals() {
  if (observer) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const scene = sceneByEl.get(entry.target);
        if (scene) {
          scene.visible = entry.isIntersecting;
          if (entry.isIntersecting) {
            measure(scene);
            scene.last = -1;
          }
        }
        const list = fieldByEl.get(entry.target);
        if (list) {
          list.forEach((field) => {
            field.visible = entry.isIntersecting;
            if (!entry.isIntersecting) field.cb(0.5, 0.5, 0);
          });
        }
      });
      lastScrollY = -1;
      wake();
    },
    { rootMargin: "25% 0px 25% 0px" },
  );

  const onScroll = () => wake();
  const onResize = () => measureAll();
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      pointerLive = false;
      wake();
      return;
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerLive = true;
    wake();
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.relatedTarget === null) {
      pointerLive = false;
      wake();
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerout", onPointerLeave, { passive: true });
  window.addEventListener("blur", () => {
    pointerLive = false;
    wake();
  });

  /* The page grows as images decode and fonts swap — remeasure instead of
     holding stale offsets. */
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => measureAll());
    ro.observe(document.documentElement);
  }
  window.addEventListener("load", () => measureAll());
}

/* ---------- React bindings ---------- */

/** Scroll progress for one element. The callback must be cheap: it runs
 *  at most once per frame, and only while the element is near the viewport. */
export function useScene(
  ref: React.RefObject<HTMLElement | null>,
  mode: SceneMode,
  cb: (progress: number, velocity: number) => void,
) {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    ensureGlobals();

    const scene: Scene = {
      el,
      mode,
      cb: (p, v) => cbRef.current(p, v),
      top: 0,
      height: 0,
      visible: false,
      last: -1,
    };
    measure(scene);
    scenes.add(scene);
    sceneByEl.set(el, scene);
    observer?.observe(el);

    /* Paint the correct state immediately, before the first scroll. */
    scene.cb(progressFor(scene, window.scrollY, window.innerHeight), 0);
    wake();

    return () => {
      sceneByEl.delete(el);
      scenes.delete(scene);
      /* One element can carry both a scene and a pointer field (every
         photograph does). Only stop observing when nothing is left. */
      if (!fieldByEl.has(el)) observer?.unobserve(el);
      if (!scenes.size && !fields.size) sleep();
    };
  }, [ref, mode]);
}

/**
 * Eased pointer field in element space. x/y are 0..1 across the element
 * (they run outside that range near it), strength fades 1 → 0 as the
 * pointer leaves. Never attaches on coarse pointers or reduced motion.
 */
export function useField(
  ref: React.RefObject<HTMLElement | null>,
  cb: (x: number, y: number, strength: number) => void,
  options: { ease?: number; margin?: number; enabled?: boolean } = {},
) {
  const { ease = 0.12, margin = 120, enabled = true } = options;
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (!isFinePointer() || prefersReducedMotion()) return;
    ensureGlobals();

    const field: Field = {
      el,
      cb: (x, y, s) => cbRef.current(x, y, s),
      ease,
      margin,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      visible: false,
      cx: 0.5,
      cy: 0.5,
      cs: 0,
      tx: 0.5,
      ty: 0.5,
      ts: 0,
      settled: true,
    };
    fields.add(field);
    const list = fieldByEl.get(el) ?? [];
    list.push(field);
    fieldByEl.set(el, list);
    observer?.observe(el);
    wake();

    return () => {
      const current = fieldByEl.get(el);
      if (current) {
        const next = current.filter((f) => f !== field);
        if (next.length) fieldByEl.set(el, next);
        else {
          fieldByEl.delete(el);
          if (!sceneByEl.has(el)) observer?.unobserve(el);
        }
      }
      fields.delete(field);
      if (!scenes.size && !fields.size) sleep();
    };
  }, [ref, ease, margin, enabled]);
}

/** Sets a CSS custom property without touching React state. */
export function setVar(el: HTMLElement | null, name: string, value: string | number) {
  if (el) el.style.setProperty(name, typeof value === "number" ? value.toFixed(4) : value);
}

/** Smoothly tweens the window scroll position; cooperates with Lenis,
 *  which resyncs to the real scroll position on every native scroll. */
export function scrollToY(target: number, duration = 1.1) {
  const start = window.scrollY;
  const delta = target - start;
  if (Math.abs(delta) < 2) return;
  if (prefersReducedMotion()) {
    window.scrollTo(0, target);
    return;
  }
  const proxy = { t: 0 };
  gsap.killTweensOf(proxy);
  gsap.to(proxy, {
    t: 1,
    duration,
    ease: "power2.inOut",
    onUpdate: () => window.scrollTo(0, start + delta * proxy.t),
  });
}
