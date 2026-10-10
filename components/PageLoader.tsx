"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { gsap, prefersReducedMotion, splitLines } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { useSmoothScroll } from "@/components/SmoothScroll";
import styles from "./PageLoader.module.css";

const WORD = "Voyagerscape";
/** The short name that rises into the wordmark's place (Giats: "Call me Giats"). */
const SHORT_NAME = "Stay Curious";

/* ---- Readiness ------------------------------------------------------
   Exit is gated by READINESS, never by a fixed timer: the document must be
   loaded (and the display font settled) AND the minimum hold must have
   elapsed. The counter below is presentation only. */
const MIN_HOLD_MS = 700;
/** Reduced motion: hold briefly, then clear without animating. */
const REDUCED_HOLD_MS = 200;
/** The display font is awaited, but never longer than this. */
const FONTS_MAX_WAIT_MS = 2500;

/* ---- Counter (Giats Loader: a 0 → 100% count, bottom-right) ----------
   While waiting for readiness the count climbs but is capped BELOW 100, so
   it never claims completion before the document is ready. On readiness it
   snaps to 100% (COUNTER_FINISH) and the exit begins. */
const COUNTER_WAIT_CAP = 90;
const COUNTER_WAIT_DURATION = 2.4;
const COUNTER_WAIT_EASE = "power1.out";
const COUNTER_FINISH = 0.4;

/* ---- Exit (Giats Loader.jsx onComplete choreography) ----------------
   Giats runs these relative to the moment its counter reaches 100%. That is
   T0 here. Values are Giats' own: lines lift `top: -12vw` over 1s
   (power4.inOut); the window shrinks to 0.9 with a 1.3888888889vw radius
   (0.8s delay, 0.5s, power2.inOut); the window then slides off to the left
   (1.7s delay, 0.5s, power2.inOut). */
const T0 = COUNTER_FINISH;
const LIFT_Y = "-12vw";
const LIFT_DURATION = 1;
const LIFT_EASE = "power4.inOut";
const SHRINK_AT = T0 + 0.8;
const SHRINK_DURATION = 0.5;
const SHRINK_SCALE = 0.9;
const SHRINK_RADIUS = "1.3888888889vw";
const EXIT_AT = T0 + 1.7;
const EXIT_DURATION = 0.5;
const EXIT_EASE = "power2.inOut";
/** markLoaded fires as the window starts to leave: the page's entrances
    (hero, header) rise into the space it uncovers. */
const ENTRANCE_ARM_AT = EXIT_AT;

/** Wall-clock failsafe: GSAP advances on rAF, which a background tab can
    freeze entirely — this guarantees the loader is gone regardless. Counted
    from the start of the exit. */
const FORCE_COMPLETE_MS = 4000;

const SCROLL_LOCK_KEY = "page-loader";

/**
 * STARTUP LOADER — Voyagerscape, in the original Giats loader's choreography.
 *
 * Ported from Giats `src/components/dom/Loader.jsx`:
 *   • a counter that climbs to 100% in the bottom corner,
 *   • the name, which lifts out of its mask line by line,
 *   • the window that shrinks to a rounded card and slides off to the left,
 *     uncovering the page beneath.
 *
 * Deliberate adaptations (see the report accompanying this change):
 *   • Readiness-gated, not the five-second fixed count. The counter is
 *     capped below 100% until the document is ready.
 *   • The window is a dedicated, scoped layer (`.panel`). Giats moves the
 *     page's own `<main>` and `<header>` directly; V2 controls both, so the
 *     page is left untouched and the loader owns the motion.
 *   • The short name is "Stay Curious" (approved copy), not Giats' wording.
 *     It takes the wordmark's place as the wordmark lifts out, as Giats'
 *     short name does.
 *
 * Contracts preserved from the previous loader:
 *   • `markLoaded()` arms the hero/header entrances. The store's `loaded`
 *     flag gates them, fired as the window leaves.
 *   • Scroll is locked (ref-counted, `smooth` so the single Lenis engine is
 *     stopped too) and released on completion AND on unmount.
 *   • The reduced-motion branch clears instantly after a short hold.
 *   • Two fail-safes: a wall-clock timer, and a pure-CSS failsafe on the
 *     root that removes the cover after 6s even if scripts never run.
 *
 * Effect discipline: the effect runs ONCE per mount. The UI store's context
 * value changes on every dispatch, so `markLoaded` and the scroll controls
 * are read through refs instead of being effect dependencies.
 */
export default function PageLoader() {
  const { markLoaded } = useUI();
  const scroll = useSmoothScroll();

  /* Always-fresh values, never effect dependencies (see header). */
  const markLoadedRef = useRef(markLoaded);
  markLoadedRef.current = markLoaded;
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLHeadingElement | null>(null);
  const shortRef = useRef<HTMLHeadingElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const start = performance.now();

    const root = rootRef.current;
    const panel = panelRef.current;
    const name = nameRef.current;
    const shortEl = shortRef.current;
    const counterEl = counterRef.current;

    /* Name lines, split after the font settles. Falls back to the whole name
       as one line if the split has not run. */
    let lines: HTMLElement[] = name ? [name] : [];
    let shortLines: HTMLElement[] = shortEl ? [shortEl] : [];

    const counterState = { value: 0 };
    let counter: gsap.core.Tween | null = null;
    let exit: gsap.core.Timeline | null = null;

    let exitTimer = 0;
    let forceTimer = 0;
    let fontTimer = 0;
    let scheduled = false;
    let finished = false;
    let loadedFired = false;
    let cancelled = false;
    let readyFired = false;
    let fontsDone = false;

    /* Hold the page still, and freeze the single Lenis engine too. */
    // If the layout ceiling already passed (slow or failed hydration), the
    // page was released; do not lock it again. Otherwise hand the lock from the
    // pre-hydration CSS lock to the JS lock. `expired` is never overwritten.
    const htmlEl = document.documentElement;
    const ceilingPassed = htmlEl.getAttribute("data-loader") === "expired";
    if (!ceilingPassed) {
      lockScroll(SCROLL_LOCK_KEY, { smooth: true });
      if (htmlEl.getAttribute("data-loader") === "pending") {
        htmlEl.setAttribute("data-loader", "owned");
      }
    }
    // The ceiling fires while the loader is still waiting (for example, a
    // load event that never comes). Release the JS claim too, so Lenis
    // restarts and the page is scrollable. The loader's own gate is unchanged.
    const onCeiling = () => unlockScroll(SCROLL_LOCK_KEY);
    window.addEventListener("vs:loader-expired", onCeiling);

    const renderCounter = () => {
      if (counterRef.current) {
        counterRef.current.textContent = `${Math.round(counterState.value)}%`;
      }
    };

    const fireLoaded = () => {
      if (loadedFired) return;
      loadedFired = true;
      markLoadedRef.current();
    };

    const complete = () => {
      if (finished) return;
      finished = true;
      counter?.kill();
      exit?.kill();
      window.clearTimeout(forceTimer);
      unlockScroll(SCROLL_LOCK_KEY);
      // The layout script's ceiling must not fire after this, and the CSS
      // lock states no longer apply.
      document.documentElement.setAttribute("data-loader", "done");
      setDone(true);
      fireLoaded();
    };

    /* ---- The exit (Giats choreography, T0 = counter at 100%) ---- */
    const startExit = () => {
      if (finished) return;
      const currentRoot = rootRef.current;
      const currentPanel = panelRef.current;
      if (reduced || !currentRoot || !currentPanel) {
        // Reduced motion (or no nodes): clean, instant clear.
        complete();
        return;
      }

      counter?.kill();
      counter = null;

      // The cover can already be hidden by its CSS fail-safe (6s) if hydration
      // was slower than that. Then the page is visible under the cover, and the
      // top-of-page reset below would jump it, so it is skipped.
      const coverShown = getComputedStyle(currentRoot).visibility !== "hidden";

      const tl = gsap.timeline({ onComplete: complete });
      exit = tl;
      forceTimer = window.setTimeout(complete, FORCE_COMPLETE_MS);

      // 0. Counter reaches 100% (Giats' count completes here).
      tl.to(
        counterState,
        { value: 100, duration: COUNTER_FINISH, ease: "power2.out", onUpdate: renderCounter },
        0,
      );

      // 0b. Pages open at the top, under full cover (Giats: lenis.scrollTo(0)).
      if (coverShown) {
        tl.call(() => scrollRef.current.scrollTo(0, { immediate: true }), [], 0);
      }

      // T0. Giats' onComplete: the name and the counter lift out of their masks.
      if (lines.length > 0) {
        tl.to(lines, { y: LIFT_Y, duration: LIFT_DURATION, ease: LIFT_EASE }, T0);
      }
      if (counterEl) {
        tl.to(counterEl, { y: LIFT_Y, duration: LIFT_DURATION, ease: LIFT_EASE }, T0);
      }
      // The short name fades in and its lines rise into the wordmark's place.
      if (shortEl) {
        tl.to(shortEl, { opacity: 1, duration: 0.5 }, T0);
      }
      if (shortLines.length > 0) {
        tl.to(shortLines, { y: 0, duration: LIFT_DURATION, ease: LIFT_EASE }, T0);
      }

      // The window shrinks to a rounded card...
      tl.to(
        currentPanel,
        {
          scale: SHRINK_SCALE,
          borderRadius: SHRINK_RADIUS,
          duration: SHRINK_DURATION,
          ease: EXIT_EASE,
        },
        SHRINK_AT,
      );

      // ...then slides off to the left, uncovering the page.
      tl.to(
        currentPanel,
        { xPercent: -100, duration: EXIT_DURATION, ease: EXIT_EASE },
        EXIT_AT,
      );
      // Pointer events pass through only once the window is leaving.
      tl.set(currentRoot, { pointerEvents: "none" }, EXIT_AT);

      // Arm the page's entrances as the window leaves (existing contract).
      tl.call(fireLoaded, [], ENTRANCE_ARM_AT);
    };

    /* ---- Readiness gate: document loaded AND fonts settled ---- */
    const tryFinish = () => {
      if (cancelled || scheduled || !readyFired || !fontsDone) return;
      scheduled = true;
      const elapsed = performance.now() - start;
      const minimum = reduced ? REDUCED_HOLD_MS : MIN_HOLD_MS;
      exitTimer = window.setTimeout(startExit, Math.max(0, minimum - elapsed));
    };

    const onLoad = () => {
      readyFired = true;
      tryFinish();
    };

    const settleFonts = () => {
      if (cancelled || fontsDone) return;
      fontsDone = true;
      window.clearTimeout(fontTimer);
      if (name && !reduced) {
        const parts = splitLines(name);
        if (parts.length > 0) lines = parts;
      }
      if (shortEl && !reduced) {
        const parts = splitLines(shortEl);
        if (parts.length > 0) {
          shortLines = parts;
          // Giats starts the short name's lines 12vw below their slot.
          gsap.set(parts, { y: "12vw" });
        }
      }
      tryFinish();
    };

    /* ---- The counter climbs while the document loads (capped below 100) ---- */
    if (reduced) {
      counterState.value = 100;
      renderCounter();
      fontsDone = true;
    } else {
      counter = gsap.to(counterState, {
        value: COUNTER_WAIT_CAP,
        duration: COUNTER_WAIT_DURATION,
        ease: COUNTER_WAIT_EASE,
        onUpdate: renderCounter,
      });
      const fonts = typeof document !== "undefined" ? document.fonts : undefined;
      fontTimer = window.setTimeout(settleFonts, FONTS_MAX_WAIT_MS);
      if (fonts?.ready) {
        fonts.ready.then(settleFonts, settleFonts);
      } else {
        settleFonts();
      }
    }

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(forceTimer);
      window.clearTimeout(fontTimer);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("vs:loader-expired", onCeiling);
      counter?.kill();
      exit?.kill();
      // Never leave the page locked, whatever ended this loader.
      unlockScroll(SCROLL_LOCK_KEY);
    };
  }, []);

  if (done) return null;

  return (
    <div className={styles.root} ref={rootRef} role="status" aria-live="polite">
      <div className={styles.panel} ref={panelRef}>
        {/* Rendered once and never reconciled again: the effect above splits
            its text into lines directly. The text stays in the server HTML,
            so the first paint is already covered and already names the site. */}
        <h2 className={styles.name} ref={nameRef}>
          {WORD}
        </h2>
        <h2 className={styles.shortName} ref={shortRef}>
          {SHORT_NAME}
        </h2>
        <div className={styles.progress}>
          <span className={styles.progressValue} ref={counterRef} aria-hidden="true">
            0%
          </span>
        </div>
      </div>
    </div>
  );
}
