"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import TileCurtain from "./TileCurtain";
import styles from "./PageLoader.module.css";

const WORD = "Voyagerscape";

/* ---- Timing ---------------------------------------------------------
   The shimmer is governed by READINESS, never by a fixed timeout: the
   wave loops for as long as the document needs, with a small minimum
   presentation hold so a fast load still shows one full ripple (and a
   slow load simply keeps shimmering). */
const MIN_HOLD_MS = 700;
/** Reduced motion: hold briefly, then clear without animating. */
const REDUCED_HOLD_MS = 200;

/* ---- Shimmer wave (character-level, Motion Primitives reference) ----
   One ripple travels through the word, staggered FROM THE CENTER — the
   same direction the tile curtain exits, so the intro hands off to the
   reveal as one continuous motion. Peak values follow the reference's
   vocabulary (zDistance 10, xDistance 2, yDistance −2, rotateY ~10,
   subtle scale) deliberately dialed back a notch for the cream/ink
   editorial palette. */
const WAVE_CHAR_DURATION = 0.45;
const WAVE_CHAR_STAGGER = 0.05;
const WAVE_REPEAT_DELAY = 0.55;

/* ---- Exit: text → tiles handoff ----
   The wave decelerates into a flat settle, the word fades with a slight
   rise, and the EXISTING curtain exit begins while the fade is still
   finishing — the reveal reads as the wave's continuation. */
const EXIT_SETTLE = 0.3;
const EXIT_FADE = 0.34;
const EXIT_TILES_AT = 0.4;

/* ---- Tile exit (EXISTING VALUES — unchanged) ---- */
const TILE_DURATION = 0.62;
const TILE_STAGGER = 0.042;
/** markLoaded fires this far into the tile exit (existing behaviour). */
const ENTRANCE_ARM_AT = EXIT_TILES_AT + 0.3;
/** Wall-clock failsafe: GSAP advances on rAF, which a background tab can
    freeze entirely — this guarantees the loader is gone regardless. */
const FORCE_COMPLETE_MS = 4000;

const SCROLL_LOCK_KEY = "page-loader";

/**
 * STARTUP LOADER — Voyagerscape shimmer intro + vertical tile curtain.
 *
 * The first-entry experience in two stages:
 *
 *   1. INTRO — the cream curtain (TileCurtain) covers the viewport from
 *      the very first paint (the SSR HTML draws it, so no JS is required
 *      to be covered), and a single centered “Voyagerscape” wordmark
 *      carries a subtle character-level shimmer wave (Motion Primitives
 *      Text Shimmer Wave, adapted to GSAP and the site's tokens: chars
 *      rest at --vs-ink-soft and ripple to --vs-ink with a tiny 3D lift,
 *      center-out). The wave loops for as long as the document needs —
 *      it is gated by readiness, not by a timer.
 *
 *   2. REVEAL — when the document is complete AND the minimum hold has
 *      elapsed, the wave settles flat, the word fades with a slight
 *      rise, and the EXISTING vertical tile exit takes over unchanged
 *      (0.62s per tile, 0.042 center-out stagger, sine.inOut). Nothing
 *      about the tile system changes — this loader simply hands off to
 *      it.
 *
 * Contracts preserved from the previous loader:
 *   • `markLoaded()` still arms the hero/header entrance timelines (the
 *     UI store's `loaded` flag), firing ~0.3s into the tile exit: the
 *     entrance timelines all start from opacity 0, so the hero rises
 *     THROUGH the lifting curtain — no flash, one continuous reveal.
 *   • `role="status"` region stays (the word itself is the label).
 *
 * Effect discipline: the effect runs ONCE per mount. The UI store's
 * context value is recreated on every state change (so `markLoaded` has a
 * new identity after any dispatch); listing it as a dependency would
 * tear down and restart the timelines on every store update. The
 * callback is read through a ref instead, and fires at most once.
 *
 * Safety: scroll is locked (ref-counted, released on complete AND on
 * unmount), a wall-clock timer force-completes even if the frame
 * pipeline is frozen, and a pure-CSS failsafe in PageLoader.module.css
 * hides the curtain after 6s even if scripts never run — the loader can
 * never permanently cover the site.
 */
export default function PageLoader() {
  const { markLoaded } = useUI();
  /* Always-fresh callback, never an effect dependency (see header). */
  const markLoadedRef = useRef(markLoaded);
  markLoadedRef.current = markLoaded;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let exitTimer = 0;
    let forceTimer = 0;
    let wave: gsap.core.Timeline | null = null;
    let exit: gsap.core.Timeline | null = null;
    let finished = false;
    let loadedFired = false;

    lockScroll(SCROLL_LOCK_KEY);

    const fireLoaded = () => {
      if (loadedFired) return;
      loadedFired = true;
      markLoadedRef.current();
    };

    const complete = () => {
      if (finished) return;
      finished = true;
      wave?.kill();
      exit?.kill();
      window.clearTimeout(forceTimer);
      unlockScroll(SCROLL_LOCK_KEY);
      setDone(true);
      fireLoaded();
    };

    /* Resolve the shimmer's two token colors once (GSAP tweens need
       concrete values; CSS keeps the same pair as the paint baseline). */
    const rootStyle = getComputedStyle(document.documentElement);
    const ink = rootStyle.getPropertyValue("--vs-ink").trim() || "#111111";
    const inkSoft = rootStyle.getPropertyValue("--vs-ink-soft").trim() || "#6e6a64";

    /* ---- THE WAVE: loops until readiness, center-out. ---- */
    const word = wordRef.current;
    const chars =
      word && !reduced
        ? gsap.utils.toArray<HTMLElement>(word.querySelectorAll("[data-shimmer-char]"))
        : [];
    if (chars.length > 0) {
      wave = gsap.timeline({ repeat: -1, repeatDelay: WAVE_REPEAT_DELAY });
      wave.fromTo(
        chars,
        { color: inkSoft, x: 0, y: 0, z: 0, scale: 1, rotateY: 0 },
        {
          color: ink,
          x: 2,
          y: -2,
          z: 10,
          scale: 1.05,
          rotateY: 8,
          duration: WAVE_CHAR_DURATION,
          ease: "sine.inOut",
          /* repeat+yoyo inside the stagger: each character rises to its
             peak and settles back, offset per character — the ripple. */
          stagger: { each: WAVE_CHAR_STAGGER, from: "center", repeat: 1, yoyo: true },
        },
      );
    } else if (word) {
      /* Reduced motion: a still, fully-ink wordmark. No per-character
         animation of any kind. */
      gsap.set(word.querySelectorAll("[data-shimmer-char]"), { color: ink });
    }

    const finish = () => {
      const elapsed = performance.now() - start;
      const minimum = reduced ? REDUCED_HOLD_MS : MIN_HOLD_MS;
      const wait = Math.max(0, minimum - elapsed);

      exitTimer = window.setTimeout(() => {
        const root = rootRef.current;
        if (!root || reduced) {
          // Reduced motion (or no curtain nodes): clean, instant clear.
          complete();
          return;
        }

        const tiles = root.querySelectorAll("[data-tile]");

        // The wave stops here — readiness has been reached. The exit
        // settles every character from wherever the ripple left it.
        wave?.kill();
        wave = null;

        exit = gsap.timeline({ onComplete: complete });
        forceTimer = window.setTimeout(complete, FORCE_COMPLETE_MS);

        // 1. Characters settle to flat, full ink — the wave's deceleration.
        if (chars.length > 0) {
          exit.to(
            chars,
            {
              color: ink,
              x: 0,
              y: 0,
              z: 0,
              scale: 1,
              rotateY: 0,
              duration: EXIT_SETTLE,
              ease: "power2.out",
              stagger: 0.012,
              overwrite: "auto",
            },
            0,
          );
        }

        // 2. The wordmark fades with a slight rise, dissolving into the
        //    curtain that is about to carry the reveal.
        if (word) {
          exit.to(
            word,
            { opacity: 0, y: -10, duration: EXIT_FADE, ease: "power2.in" },
            Math.max(0, EXIT_SETTLE - 0.06),
          );
        }

        // 3. The EXISTING curtain exit — values untouched. It begins
        //    while the fade is still finishing, so the tile reveal reads
        //    as the wave's continuation.
        if (tiles.length > 0) {
          exit.to(
            tiles,
            {
              yPercent: 100,
              duration: TILE_DURATION,
              ease: "sine.inOut",
              stagger: { each: TILE_STAGGER, from: "center" },
            },
            EXIT_TILES_AT,
          );
        }

        // 4. Arm the page's entrance ~0.3s into the tile exit (existing
        //    behaviour): every entrance starts from opacity 0, so the
        //    hero rises THROUGH the lifting curtain.
        exit.call(fireLoaded, [], ENTRANCE_ARM_AT);
      }, wait);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(forceTimer);
      window.removeEventListener("load", finish);
      wave?.kill();
      exit?.kill();
      // Never leave the page locked, whatever ended this loader.
      unlockScroll(SCROLL_LOCK_KEY);
    };
  }, []);

  if (done) return null;

  return (
    <div className={styles.root} ref={rootRef} role="status" aria-live="polite">
      <TileCurtain />
      <span className={styles.word} ref={wordRef} data-shimmer-word>
        {/* The animated characters are decorative; the word itself stays
            intact for assistive tech. */}
        <span className={styles.chars} aria-hidden="true">
          {WORD.split("").map((ch, i) => (
            <span key={`${WORD}-${i}`} className={styles.char} data-shimmer-char>
              {ch}
            </span>
          ))}
        </span>
        <span className="vs-sr-only">{WORD}</span>
      </span>
    </div>
  );
}
