"use client";

import { useEffect, useRef } from "react";

export interface PointerField {
  /**
   * Offset from the object's centre normalised against the VIEWPORT,
   * −1 … +1. Drives the body rotation, which should track the cursor
   * anywhere on the page.
   */
  x: number;
  y: number;
  /**
   * Offset normalised against the OBJECT's own size, −1 … +1 at roughly its
   * own edges. Drives the close-range cues — here, the glass highlight.
   *
   * Two normalisations rather than one because a single one cannot serve
   * both. Using the viewport figure for a close-range cue multiplies two
   * anti-correlated quantities: `x` is only large when the cursor is far
   * away, and `proximity` is only large when it is close, so their product
   * stays near zero everywhere. The local figure reaches ±1 while the
   * cursor is still well inside the proximity plateau.
   */
  lx: number;
  ly: number;
  /** 0 far away … 1 on the object. Drives the "it noticed you" cues. */
  proximity: number;
  /** True once a real mouse has been seen. Never set by touch. */
  active: boolean;
}

/**
 * POINTER FIELD
 * =============
 *
 * One passive `pointermove` listener on the window, writing into a mutable
 * ref. Nothing here causes a React render — the values are read inside
 * `useFrame`, which is the only consumer.
 *
 * Deliberately NOT R3F's `state.pointer`: that is only populated while the
 * cursor is over the canvas, so the object could only react once you were
 * already on top of it. The effect we want is peripheral — the monitor
 * should be turning toward you from across the page. So the offset is
 * measured against the viewport, not the canvas.
 *
 * TOUCH
 * -----
 * Touch and pen never activate the field, and on a coarse pointer the hook
 * does not attach at all. A finger is not a cursor: there is no hover state
 * to track, and faking one by latching onto the last tap position produces a
 * monitor that stares at wherever you last touched and then never moves
 * again. Coarse-pointer devices get idle motion only.
 *
 * Device orientation is intentionally not used either. On iOS it needs
 * `DeviceOrientationEvent.requestPermission()`, which is a user-facing
 * permission prompt for a decorative effect.
 */
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function usePointerField(container: HTMLElement | null, enabled: boolean) {
  const field = useRef<PointerField>({ x: 0, y: 0, lx: 0, ly: 0, proximity: 0, active: false });

  useEffect(() => {
    if (!enabled || !container) return;

    // Only fine pointers. matchMedia rather than a UA sniff.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    let rect = container.getBoundingClientRect();
    let rectStale = true;

    const refreshRect = () => {
      rectStale = true;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        field.current.active = false;
        return;
      }

      // The hero moves under a still pointer while the page scrolls, so the
      // rect cannot be cached across scrolls — but reading it on every single
      // pointermove is a layout thrash. Read it at most once per frame.
      if (rectStale) {
        rect = container.getBoundingClientRect();
        rectStale = false;
        requestAnimationFrame(() => {
          rectStale = true;
        });
      }

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const halfW = window.innerWidth / 2 || 1;
      const halfH = window.innerHeight / 2 || 1;

      const dx = event.clientX - cx;
      const dy = event.clientY - cy;

      const f = field.current;
      f.x = clamp(dx / halfW, -1, 1);
      f.y = clamp(dy / halfH, -1, 1);
      f.lx = clamp(dx / (rect.width * 0.55 || 1), -1, 1);
      f.ly = clamp(dy / (rect.height * 0.55 || 1), -1, 1);

      // Proximity in units of the object's own size, so it means the same
      // thing at 482px and at 260px. Smoothstepped with a plateau across the
      // object itself: a linear ramp from the centre means the cues are
      // already half faded while the cursor is still on the screen, which
      // is precisely when they should be at full strength.
      const size = Math.max(rect.width, rect.height);
      const inner = size * 0.22;
      const outer = size * 0.8;
      const dist = Math.hypot(dx, dy);
      const u = clamp((dist - inner) / Math.max(outer - inner, 1), 0, 1);
      f.proximity = 1 - u * u * (3 - 2 * u);
      f.active = true;
    };

    const onLeave = (event: PointerEvent) => {
      // Pointer genuinely left the window, not just crossed into a child.
      if (event.relatedTarget === null) field.current.active = false;
    };

    const onBlur = () => {
      field.current.active = false;
    };

    const onTouch = () => {
      field.current.active = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("scroll", refreshRect, { passive: true, capture: true });
    window.addEventListener("resize", refreshRect, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", refreshRect, { capture: true });
      window.removeEventListener("resize", refreshRect);
    };
  }, [container, enabled]);

  return field;
}
