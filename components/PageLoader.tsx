"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import TechLabel from "@/components/primitives/TechLabel";
import TileCurtain from "./TileCurtain";
import styles from "./PageLoader.module.css";

const STAGES = ["BOOT", "LINK", "READY"];

/* ---- Timing (tuned against the brief's targets) --------------------
   hold: 0.3–0.6s  →  0.42s minimum after the document is ready
   tile duration: 0.55–0.7s  →  0.62s per tile
   stagger: 0.035–0.055s  →  0.042s, center-out
   Total ≈ 0.42s hold + ~1.0s curtain exit — faster than the previous
   boot card (620ms + 1s slide), and the hero entrance begins *under*
   the lifting curtain rather than after it. */
const MIN_HOLD_MS = 420;
const TILE_DURATION = 0.62;
const TILE_STAGGER = 0.042;
/** Reduced motion: hold briefly, then clear without animating. */
const REDUCED_HOLD_MS = 200;
/** Curtain exit start → arming the page entrance (see note in finish). */
const ENTRANCE_ARM_DELAY = 0.3;
/** Wall-clock failsafe: GSAP advances on rAF, which a background tab can
    freeze entirely — this guarantees the loader is gone regardless. */
const FORCE_COMPLETE_MS = 4000;

const SCROLL_LOCK_KEY = "page-loader";

/**
 * STARTUP LOADER — vertical tile curtain.
 *
 * The Animata Vertical Tiles behaviour as the initial-load system: the
 * cream curtain (var(--vs-bg) tiles + the existing minimal Voyagerscape
 * boot identity — V:/ 01 tag, the Pixelify Sans wordmark, the BOOT →
 * LINK → READY stage row — in ink on the cream) covers the viewport from
 * the very first paint — the SSR HTML draws it, so no JS is required to
 * be covered — holds while the document finishes, then the tiles drop
 * away vertically in a center-out stagger and the page is already living
 * beneath them.
 *
 * Contracts preserved from the previous loader:
 *   • `markLoaded()` still arms the hero/header entrance timelines (the
 *     UI store's `loaded` flag). It now fires as the curtain starts to
 *     lift: the entrance timelines all start from opacity 0, so they can
 *     never flash, and the reveal reads as one continuous motion.
 *   • BOOT/LINK/READY stage labels and the `role="status"` region stay.
 *
 * Effect discipline: the effect runs ONCE per mount. The UI store's
 * context value is recreated on every state change (so `markLoaded` has a
 * new identity after any dispatch); listing it as a dependency would
 * tear down and restart this timeline on every store update — including
 * the `loaded` dispatches this loader itself makes. The callback is read
 * through a ref instead, and fires at most once per mount.
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
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let stageTimer = 0;
    let exitTimer = 0;
    let forceTimer = 0;
    let timeline: gsap.core.Timeline | null = null;
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
      timeline?.kill();
      window.clearTimeout(forceTimer);
      unlockScroll(SCROLL_LOCK_KEY);
      setDone(true);
      fireLoaded();
    };

    const advance = () => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    };
    stageTimer = window.setInterval(advance, reduced ? 90 : 230);

    const finish = () => {
      window.clearInterval(stageTimer);
      setStage(STAGES.length - 1);
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
        const items = root.querySelectorAll("[data-loader-item]");

        timeline = gsap.timeline({ onComplete: complete });
        forceTimer = window.setTimeout(complete, FORCE_COMPLETE_MS);

        // The identity settles out first — the same exit beat the old
        // boot card had, now dissolving into the curtain rather than
        // sliding away with it.
        if (items.length > 0) {
          timeline.to(items, {
            opacity: 0,
            y: -8,
            duration: 0.26,
            ease: "power2.in",
            stagger: 0.04,
          });
        }

        if (tiles.length > 0) {
          // Arm the page's entrance while the curtain is still moving:
          // every entrance timeline starts from opacity 0, so the hero
          // rises THROUGH the lifting tiles — no flash, and the load
          // reads as one continuous reveal.
          timeline.call(fireLoaded, [], ENTRANCE_ARM_DELAY);
          // The curtain itself: tiles drop away, middle first.
          timeline.to(
            tiles,
            {
              yPercent: 100,
              duration: TILE_DURATION,
              ease: "sine.inOut",
              stagger: { each: TILE_STAGGER, from: "center" },
            },
            0.12,
          );
        } else {
          timeline.call(fireLoaded, [], ENTRANCE_ARM_DELAY);
        }
      }, wait);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.clearInterval(stageTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(forceTimer);
      window.removeEventListener("load", finish);
      timeline?.kill();
      // Never leave the page locked, whatever ended this loader.
      unlockScroll(SCROLL_LOCK_KEY);
    };
  }, []);

  if (done) return null;

  return (
    <div className={styles.root} ref={rootRef} role="status" aria-live="polite">
      <TileCurtain />
      <div className={styles.inner}>
        <TechLabel nano className={styles.tag} data-loader-item>
          V:/ 01
        </TechLabel>
        <span className={styles.word} data-loader-item>
          Voyagerscape
        </span>
        <div className={styles.meta} data-loader-item>
          <TechLabel nano>{STAGES[stage]}</TechLabel>
          <span className={styles.track} aria-hidden="true">
            <span
              className={styles.fill}
              style={{ transform: `scaleX(${(stage + 1) / STAGES.length})` }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
