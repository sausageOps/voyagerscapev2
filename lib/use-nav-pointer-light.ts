"use client";

import { useEffect, useRef, type RefObject } from "react";

/** One shared, RAF-throttled pointer field for unified navigation glass. */
export function useNavPointerLight<T extends HTMLElement>(): RefObject<T> {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const paint = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--nav-light-x", `${pointerX - rect.left}px`);
      root.style.setProperty("--nav-light-y", `${pointerY - rect.top}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onPointerEnter = () => root.style.setProperty("--nav-light-opacity", "1");
    const onPointerLeave = () => root.style.setProperty("--nav-light-opacity", "0");

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerenter", onPointerEnter, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerenter", onPointerEnter);
      root.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return rootRef;
}
