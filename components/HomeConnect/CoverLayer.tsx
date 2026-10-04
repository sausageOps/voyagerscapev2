"use client";

/**
 * COVER LAYER — Aceternity UI "Cover", adapted to the warped wordmark.
 * ---------------------------------------------------------------
 * Source of the behaviour: https://ui.aceternity.com/registry/cover.json
 * (`components/ui/cover.tsx` + its `sparkles` registry dependency).
 *
 * The original is a wrapper component. It measures its own box, derives
 * the beam count from the height (`Math.floor(height / 10)`), spaces the
 * beams with `(i + 1) * height / (numberOfBeams + 1)`, sweeps a
 * transparent → colour → transparent gradient along each one while
 * hovered, lays a tsparticles sparkle field over the children and pins
 * four CircleIcons to the corners.
 *
 * Two things make a straight `<Cover>{children}</Cover>` impossible here:
 *
 *   1. "Voyagerscape™" is not DOM text any more. After the WarpText
 *      layer hands over, those spans are `visibility: hidden` and the
 *      glyphs are painted by the OGL canvas. Wrapping them would
 *      decorate an invisible box, and inserting a wrapper would change
 *      the very rects the warp rasteriser measures.
 *   2. Its dependencies are not in this project — `motion` and
 *      `@tsparticles/*`. Installing them for a micro-interaction would
 *      duplicate animation infrastructure on a page already running two
 *      WebGL contexts.
 *
 * So the component's GEOMETRY AND BEHAVIOUR are reproduced as a
 * free-standing overlay that tracks the word's live bounding rect, with
 * the animation expressed as compositor-only CSS (see the stylesheet).
 * Nothing in the warp pipeline is touched, read or re-timed: this file
 * only ever calls `getBoundingClientRect()` on elements it does not own.
 *
 * Tracking target: the union of every `[data-warp-src]` rect inside the
 * hero — which is exactly the wordmark span plus the ™ span, and
 * nothing else. The rotating words carry `[data-identity-word]`, so
 * "Explore" and the whole second row are structurally excluded; no
 * coordinate, word list or index is hardcoded anywhere.
 *
 * Failure leaves the hero exactly as it was, and reduced motion keeps
 * the existing static treatment. Touch/coarse devices still build the
 * resting visual layer; only hover/proximity activation is omitted.
 */

import { useEffect } from "react";
import type { RefObject } from "react";

import styles from "./CoverLayer.module.css";

type CoverLayerProps = {
  targetRef: RefObject<HTMLElement>;
};

/** Deterministic 0..1 sequence — the sparkle scatter must be stable
 *  across rebuilds so motes never jump when the word is re-measured. */
function seeded(i: number): number {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export default function CoverLayer({ targetRef }: CoverLayerProps) {
  useEffect(() => {
    const target = targetRef.current;
    const host = target?.parentElement;
    if (!target || !host) return undefined;

    // Pointer capability controls only hover/proximity interaction. The
    // resting Cover visual is available on touch/coarse devices as well.
    const hasPointerInteraction = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    let below: HTMLDivElement | null = null;
    let above: HTMLDivElement | null = null;
    let fieldBelow: HTMLDivElement | null = null;
    let fieldAbove: HTMLDivElement | null = null;
    let raf = 0;
    let moveRaf = 0;
    let active = false;
    let built = 0;
    let disposed = false;
    let pointer: { x: number; y: number } | null = null;

    const makePass = (variant: string): [HTMLDivElement, HTMLDivElement] => {
      const pass = document.createElement("div");
      pass.className = `${styles.layer} ${variant}`;
      pass.setAttribute("aria-hidden", "true");
      const inner = document.createElement("div");
      inner.className = styles.field;
      pass.appendChild(inner);
      host.appendChild(pass);
      return [pass, inner];
    };

    try {
      /* Two passes, one on each side of the warp canvas (z-index 1):
         the beams/haze pass paints under the glyphs so the letterforms
         occlude it, the sparkle/sheen pass paints over them. The warp
         canvas itself is never read, moved or re-parented. */
      [below, fieldBelow] = makePass(styles.below);
      [above, fieldAbove] = makePass(styles.above);
    } catch {
      // Nothing is half-built: if the overlay cannot be created the
      // hero simply never gets one.
      below?.remove();
      above?.remove();
      return undefined;
    }

    const backPass = fieldBelow;
    const frontPass = fieldAbove;

    /** The word's live box: the union of the warp layer's own static
     *  pieces — `[data-warp-src]` is the wordmark span plus the ™ span
     *  and nothing else, so the rotating words ([data-identity-word])
     *  and the whole second row are excluded structurally. Re-read
     *  every time, never cached, so rotation width tweens, resizes and
     *  font swaps are all followed. Both Cover passes and the warp
     *  renderer therefore describe the same geometry. */
    const wordRect = (): DOMRect | null => {
      const parts = target.querySelectorAll<HTMLElement>("[data-warp-src]");
      if (!parts.length) return null;
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      parts.forEach((part) => {
        const box = part.getBoundingClientRect();
        if (!box.width || !box.height) return;
        left = Math.min(left, box.left);
        top = Math.min(top, box.top);
        right = Math.max(right, box.right);
        bottom = Math.max(bottom, box.bottom);
      });
      if (!Number.isFinite(left) || right <= left) return null;
      return new DOMRect(left, top, right - left, bottom - top);
    };

    /* Aceternity's own geometry: beam count from the box height, beams
       spaced evenly across it, four corner marks. Rebuilt only when the
       word's height actually changes — never per frame. */
    const build = (height: number): void => {
      /* Aceternity's own geometry: the beam count comes from the
         region's height and the beams are spaced evenly down it. ONE
         collection — these same elements animate in both states. */
      const beams = Math.min(8, Math.max(5, Math.floor(height / 10)));
      const stars = 22;
      const marks = 4;

      let back = `<span class="${styles.surfaceLight}"></span>`;
      back += `<span class="${styles.surfaceDark}"></span>`;
      back += `<span class="${styles.rim}"></span>`;

      /* Stars: hover only. Deterministic from the index, so timing and
         scatter are identical on every rebuild and can never shuffle. */
      for (let i = 0; i < stars; i += 1) {
        const x = seeded(i + 3) * 100;
        const y = seeded(i + 31) * 100;
        const scale = 0.7 + seeded(i + 59) * 0.9;
        const twinkle = 1.7 + seeded(i + 83) * 1.8;
        const drift = 7 + seeded(i + 101) * 6;
        const delay = seeded(i + 127) * 2.4;
        back +=
          `<span class="${styles.star}${i % 3 === 0 ? ` ${styles.far}` : ""}" ` +
          `style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%;` +
          `--scale:${scale.toFixed(2)};--drift:${drift.toFixed(2)}s;` +
          `--twinkle:${twinkle.toFixed(2)}s;--delay:${delay.toFixed(2)}s"></span>`;
      }

      /* Beams: distributed down the region, each with its own rest and
         hover tempo. Rest is slow (2.2–3.4s) and widely staggered so
         the light state reads as a few separate lights crossing at
         different heights; hover is the official component's faster
         tempo (0.55–0.85s) with a tight stagger. Every value is a pure
         function of the index — no Math.random(), so a rebuild or a
         React re-render can never change a beam's identity or timing. */
      for (let i = 0; i < beams; i += 1) {
        const y = ((i + 1) * height) / (beams + 1);
        const dur = 2.2 + seeded(i + 11) * 1.2;
        const durHover = 0.55 + seeded(i + 29) * 0.3;
        const delay = i * 0.42 + seeded(i + 47) * 0.35;
        const delayHover = i * 0.06 + seeded(i + 61) * 0.08;
        back +=
          `<span class="${styles.beam}" style="--y:${y.toFixed(2)}px;` +
          `--dur:${dur.toFixed(2)}s;--durHover:${durHover.toFixed(2)}s;` +
          `--delay:${delay.toFixed(2)}s;--delayHover:${delayHover.toFixed(2)}s"></span>`;
      }

      // Corner indicators: hover only, above the glyph layer.
      let front = "";
      for (let i = 0; i < marks; i += 1) {
        const left = i % 2 === 0 ? "3px" : "calc(100% - 6px)";
        const top = i < 2 ? "3px" : "calc(100% - 6px)";
        front +=
          `<span class="${styles.mark}" style="left:${left};top:${top};` +
          `--delay:${(i * 0.18).toFixed(2)}s"></span>`;
      }

      backPass.innerHTML = back;
      frontPass.innerHTML = front;
      built = Math.round(height);
    };

    /* Clean restart on every state change.
       Switching tempo mid-flight would leave a beam jumping, and any
       element whose animation stops while it is part-way through would
       hold that frame on screen — the stamping. Clearing animation-name
       for one forced reflow restarts every animation from 0%, and
       because all the per-element timing lives in custom properties,
       nothing is lost when the longhand is reset. */
    const restart = (): void => {
      [backPass, frontPass].forEach((pass) => {
        const nodes = pass.querySelectorAll<HTMLElement>("span");
        nodes.forEach((node) => {
          node.style.animationName = "none";
        });
        // Forced reflow: makes the removal take effect before it is undone.
        void pass.offsetWidth;
        nodes.forEach((node) => {
          node.style.animationName = "";
        });
      });
    };

    /* Handover gate. The cover surface paints over the DOM text (it is
       a positioned layer, the hero text is not), so it may only open
       once WarpText has taken the glyphs onto the canvas — at which
       point those spans are visibility:hidden. If WebGL never starts,
       the DOM text stays visible and the cover never opens: the hero
       is left exactly as it is, with no dark box over readable text. */
    const handedOver = (): boolean => {
      const parts = target.querySelectorAll<HTMLElement>("[data-warp-src]");
      if (!parts.length) return false;
      return Array.from(parts).every(
        (part) => getComputedStyle(part).visibility === "hidden",
      );
    };

    /** Write the tracked rect onto the overlay, in the layer's own
     *  coordinate space. The bleed lets the light spill a little past
     *  the glyph edges for depth without becoming a panel. */
    const sync = (): boolean => {
      const word = wordRect();
      if (!word || !below) return false;
      const base = below.getBoundingClientRect();
      // Compact: a small, even inset around the word's own box, so the
      // cover reads as a window on the word rather than a panel.
      const bleedX = word.height * 0.1;
      const bleedY = word.height * 0.07;
      const width = word.width + bleedX * 2;
      const height = word.height + bleedY * 2;
      const left = word.left - base.left - bleedX;
      const top = word.top - base.top - bleedY;

      // One rect, written to both passes: the two effects can never
      // drift apart because they are driven by the same measurement.
      [backPass, frontPass].forEach((pass) => {
        pass.style.left = `${left}px`;
        pass.style.top = `${top}px`;
        pass.style.width = `${width}px`;
        pass.style.height = `${height}px`;
        // Beam thickness and mote size follow the type scale.
        pass.style.setProperty("--beam-h", `${Math.max(1.5, height * 0.022).toFixed(2)}px`);
        pass.style.setProperty("--spark-s", `${Math.max(2, height * 0.024).toFixed(2)}px`);
      });

      if (Math.abs(Math.round(height) - built) > 2) build(height);

      /* The resting LIGHT state is shown only once WarpText owns the
         glyphs (those spans go visibility:hidden). Before that — and
         if WebGL never starts — the layer stays fully transparent and
         the hero is exactly as it would be without this component. */
      const ready = handedOver();
      [backPass, frontPass].forEach((pass) => {
        pass.classList.toggle(styles.ready, ready);
      });
      return ready;
    };

    /* Proximity: the effect wakes as the pointer approaches the word —
       the word's own box plus a third of its height — and sleeps the
       moment it leaves. */
    const near = (x: number, y: number): boolean => {
      const word = wordRect();
      if (!word || !handedOver()) return false;
      const padX = word.height * 0.35;
      const padY = word.height * 0.3;
      return (
        x >= word.left - padX &&
        x <= word.right + padX &&
        y >= word.top - padY &&
        y <= word.bottom + padY
      );
    };

    /* While active the rect is re-read each frame, which is what keeps
       the overlay locked to the word through a rotation width tween.
       While idle nothing runs: no rAF, no animation (the CSS keyframes
       are paused), no work at all. */
    const follow = (): void => {
      if (disposed || !active) return;
      sync();
      raf = requestAnimationFrame(follow);
    };

    const setActive = (next: boolean): void => {
      if (next === active) return;
      active = next;
      if (next) {
        if (!sync()) {
          active = false;
          return;
        }
        backPass.classList.add(styles.active);
        frontPass.classList.add(styles.active);
        restart();
        raf = requestAnimationFrame(follow);
      } else {
        backPass.classList.remove(styles.active);
        frontPass.classList.remove(styles.active);
        restart();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        if (disposed || !pointer) return;
        if (!active) sync();
        setActive(near(pointer.x, pointer.y));
      });
    };

    const onLeave = (): void => setActive(false);

    if (hasPointerInteraction) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("blur", onLeave);
      document.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onLeave);
    }

    // Layout changes while idle are picked up here; while active the
    // follow loop is already re-reading every frame.
    /* Resting tracking. The cover is now visible at rest, so it has to
       follow the word even when nothing is hovering it. The lead word's
       clip window is width-tweened by the rotation engine, and that
       tween re-centres the line — observing those windows means the
       cover is re-synced exactly on the frames the geometry actually
       moves, with no polling and no idle loop. */
    const resizeObserver = new ResizeObserver(() => sync());
    resizeObserver.observe(target);
    target
      .querySelectorAll<HTMLElement>("[data-identity-window]")
      .forEach((win) => resizeObserver.observe(win));

    const onResize = (): void => {
      sync();
    };
    window.addEventListener("resize", onResize, { passive: true });

    /* First measurements: on mount, once webfonts settle, and once more
       after the warp layer has had time to hand over. */
    sync();
    const settle = window.setTimeout(sync, 420);
    const settleLate = window.setTimeout(sync, 1400);
    if (document.fonts?.ready) void document.fonts.ready.then(() => sync());

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (moveRaf) cancelAnimationFrame(moveRaf);
      if (hasPointerInteraction) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("blur", onLeave);
        document.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onLeave);
      }
      window.removeEventListener("resize", onResize);
      window.clearTimeout(settle);
      window.clearTimeout(settleLate);
      resizeObserver.disconnect();
      below?.remove();
      above?.remove();
    };
  }, [targetRef]);

  return null;
}
