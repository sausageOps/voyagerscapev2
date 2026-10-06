"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HOMEPAGE EXPERIMENT — shared motion primitives.
 *
 * These are the local, dependency-free implementations of the four React Bits
 * behaviours the experiment uses (Scroll Reveal, Variable Proximity, Image
 * Trail, Text Loop). They are written against the existing Voyagerscape rules:
 *
 *   - every loop is driven by a single rAF that only runs while the host
 *     section is on screen AND the pointer is a fine pointer,
 *   - every effect is a no-op under prefers-reduced-motion,
 *   - nothing listens on window scroll; visibility comes from
 *     IntersectionObserver, which keeps offscreen chapters at zero cost.
 */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

/**
 * SCROLL REVEAL — the single reveal system for the whole page.
 *
 * Any element carrying [data-reveal] inside the scope gets data-inview="true"
 * once, the first time it crosses the threshold. All of the actual motion is
 * CSS transition, so there is no JS running during the reveal itself.
 */
export function useScrollReveal<T extends HTMLElement>(scopeRef: React.RefObject<T>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const nodes = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (nodes.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((n) => n.setAttribute("data-inview", "true"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).setAttribute("data-inview", "true");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [scopeRef]);
}

/** True while the element is intersecting — used to gate every rAF loop. */
export function useOnScreen<T extends HTMLElement>(
  ref: React.RefObject<T>,
  rootMargin = "15% 0px",
): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return onScreen;
}

/**
 * VARIABLE PROXIMITY — hero typography only.
 *
 * Each [data-prox] character is weighted by its distance to the pointer. The
 * read happens in a pointermove listener; all writes happen in one rAF frame,
 * so the handler never causes layout thrash. Characters are only measured on
 * mount/resize, not per frame.
 */
export function useVariableProximity<T extends HTMLElement>(
  scopeRef: React.RefObject<T>,
  { radius = 260, enabled = true }: { radius?: number; enabled?: boolean } = {},
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || !enabled) return;

    const chars = Array.from(scope.querySelectorAll<HTMLElement>("[data-prox]"));
    if (chars.length === 0) return;

    let centres: { x: number; y: number }[] = [];
    const measure = () => {
      centres = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    let frame = 0;
    let px = -9999;
    let py = -9999;
    let dirty = false;

    const render = () => {
      frame = 0;
      dirty = false;
      for (let i = 0; i < chars.length; i += 1) {
        const c = centres[i];
        if (!c) continue;
        const d = Math.hypot(c.x - px, c.y - py);
        const f = d > radius ? 0 : 1 - d / radius;
        // eased so the falloff reads as a soft lens rather than a hard circle
        const eased = f * f * (3 - 2 * f);
        chars[i].style.setProperty("--p", eased.toFixed(3));
      }
    };

    const schedule = () => {
      if (dirty) return;
      dirty = true;
      frame = requestAnimationFrame(render);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      schedule();
    };
    const onLeave = () => {
      px = -9999;
      py = -9999;
      schedule();
    };

    measure();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      chars.forEach((c) => c.style.removeProperty("--p"));
    };
  }, [scopeRef, radius, enabled]);
}

/**
 * Pointer field for a single section: writes --px/--py (0..1, element space)
 * and --pdx/--pdy (-1..1 from centre) on the host. Used for the hero's
 * image/typography displacement. One listener, one rAF, gated on visibility.
 */
export function usePointerField<T extends HTMLElement>(
  ref: React.RefObject<T>,
  enabled: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let frame = 0;
    let x = 0.5;
    let y = 0.5;
    let tx = 0.5;
    let ty = 0.5;
    let running = false;

    const loop = () => {
      x += (tx - x) * 0.085;
      y += (ty - y) * 0.085;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      el.style.setProperty("--pdx", (x * 2 - 1).toFixed(4));
      el.style.setProperty("--pdy", (y * 2 - 1).toFixed(4));
      if (Math.abs(tx - x) > 0.0008 || Math.abs(ty - y) > 0.0008) {
        frame = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      start();
    };
    const onLeave = () => {
      tx = 0.5;
      ty = 0.5;
      start();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref, enabled]);
}
