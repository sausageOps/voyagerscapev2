"use client";

import { useEffect, type RefObject } from "react";

const LOCK_DISTANCE = 8;
const DISTANCE_RATIO = 0.28;
const MIN_FAST_DISTANCE = 35;
const VELOCITY_THRESHOLD = 0.65;
const SNAP_DURATION = 320;
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Touch/pen-only right-swipe dismissal for a right-side off-canvas layer.
 * Direction locking preserves vertical scrolling; the existing closed-state
 * CSS transition owns the final trip off screen after a successful gesture.
 */
export function useSwipeToClose(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    const layer = ref.current;
    if (!layer || !open) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dragX = 0;
    let direction: "pending" | "horizontal" | "vertical" = "pending";
    let suppressClick = false;
    let snapTimer = 0;

    const clearInlineMotion = () => {
      layer.style.removeProperty("transition");
      layer.style.removeProperty("transform");
      layer.style.removeProperty("will-change");
    };

    const snapOpen = () => {
      layer.style.transition = `transform ${SNAP_DURATION}ms ${SNAP_EASE}`;
      layer.style.transform = "translate3d(0, 0, 0)";
      const finish = (event?: TransitionEvent) => {
        if (event && event.target !== layer) return;
        window.clearTimeout(snapTimer);
        layer.removeEventListener("transitionend", finish);
        clearInlineMotion();
      };
      layer.addEventListener("transitionend", finish);
      snapTimer = window.setTimeout(finish, SNAP_DURATION + 80);
    };

    const resetPointer = () => {
      if (pointerId !== null && layer.hasPointerCapture(pointerId)) {
        layer.releasePointerCapture(pointerId);
      }
      pointerId = null;
      direction = "pending";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!window.matchMedia("(max-width: 1099px)").matches) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (!event.isPrimary || event.button !== 0) return;

      const target = event.target as Element | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      window.clearTimeout(snapTimer);
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = performance.now();
      dragX = 0;
      direction = "pending";
      suppressClick = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (direction === "pending") {
        if (Math.hypot(dx, dy) < LOCK_DISTANCE) return;
        if (Math.abs(dy) >= Math.abs(dx) || dx <= 0) {
          direction = "vertical";
          return;
        }
        direction = "horizontal";
        suppressClick = true;
        layer.setPointerCapture(event.pointerId);
        layer.style.transition = "none";
        layer.style.willChange = "transform";
      }

      if (direction !== "horizontal") return;
      event.preventDefault();
      dragX = Math.min(Math.max(0, dx), layer.clientWidth);
      layer.style.transform = `translate3d(${dragX}px, 0, 0)`;
    };

    const finishGesture = (event: PointerEvent, cancelled = false) => {
      if (event.pointerId !== pointerId) return;
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = dragX / elapsed;
      const shouldClose =
        !cancelled &&
        direction === "horizontal" &&
        (dragX >= layer.clientWidth * DISTANCE_RATIO ||
          (dragX >= MIN_FAST_DISTANCE && velocity >= VELOCITY_THRESHOLD));

      if (direction === "horizontal") {
        if (shouldClose) {
          // Keep the dragged position inline until React publishes the closed
          // state, then reveal the existing CSS close transition beneath it.
          onClose();
          requestAnimationFrame(() => {
            layer.style.removeProperty("transition");
            layer.style.removeProperty("transform");
            layer.style.removeProperty("will-change");
          });
        } else {
          snapOpen();
        }
      }
      resetPointer();
    };

    const onPointerUp = (event: PointerEvent) => finishGesture(event);
    const onPointerCancel = (event: PointerEvent) => finishGesture(event, true);
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    layer.addEventListener("pointerdown", onPointerDown);
    layer.addEventListener("pointermove", onPointerMove, { passive: false });
    layer.addEventListener("pointerup", onPointerUp);
    layer.addEventListener("pointercancel", onPointerCancel);
    layer.addEventListener("click", onClickCapture, true);

    return () => {
      window.clearTimeout(snapTimer);
      layer.removeEventListener("pointerdown", onPointerDown);
      layer.removeEventListener("pointermove", onPointerMove);
      layer.removeEventListener("pointerup", onPointerUp);
      layer.removeEventListener("pointercancel", onPointerCancel);
      layer.removeEventListener("click", onClickCapture, true);
      clearInlineMotion();
    };
  }, [onClose, open, ref]);
}
