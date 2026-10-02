"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./HomeCanvas.module.css";

export default function HomeCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const finePointer = window.matchMedia("(any-pointer: fine)");
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const setTargetFromPointer = (event: PointerEvent) => {
      const bounds = frame.getBoundingClientRect();
      const insideX = (event.clientX - bounds.left) / bounds.width;
      const insideY = (event.clientY - bounds.top) / bounds.height;
      target.x = Math.max(-0.5, Math.min(0.5, insideX - 0.5)) * 600;
      target.y = Math.max(-0.5, Math.min(0.5, insideY - 0.5)) * 448;
    };

    const resetTarget = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = (timestamp: number) => {
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;

      // Ambient offsets are intentionally small and live in this same RAF
      // loop as the pointer response. Each field has its own slow phase.
      const seconds = timestamp / 1000;
      const lavenderX = Math.sin((seconds / 13) * Math.PI * 2) * 34;
      const lavenderY = Math.cos((seconds / 15) * Math.PI * 2) * 24;
      const mintX = Math.cos((seconds / 14) * Math.PI * 2) * 30;
      const mintY = Math.sin((seconds / 16) * Math.PI * 2) * 27;
      const blueX = Math.sin((seconds / 11) * Math.PI * 2) * 22;
      const blueY = Math.cos((seconds / 13) * Math.PI * 2) * 18;
      const creamX = Math.cos((seconds / 18) * Math.PI * 2) * 18;
      const creamY = Math.sin((seconds / 20) * Math.PI * 2) * 14;

      frame.style.setProperty("--field-strong-x", `${(lavenderX + current.x).toFixed(2)}px`);
      frame.style.setProperty("--field-strong-y", `${(lavenderY + current.y).toFixed(2)}px`);
      frame.style.setProperty("--field-opposite-x", `${(mintX - current.x * 0.72).toFixed(2)}px`);
      frame.style.setProperty("--field-opposite-y", `${(mintY - current.y * 0.72).toFixed(2)}px`);
      frame.style.setProperty("--field-diagonal-x", `${(blueX + current.x * 0.5).toFixed(2)}px`);
      frame.style.setProperty("--field-diagonal-y", `${(blueY - current.y * 0.42).toFixed(2)}px`);
      frame.style.setProperty("--field-soft-x", `${(creamX + current.x * 0.26).toFixed(2)}px`);
      frame.style.setProperty("--field-soft-y", `${(creamY + current.y * 0.26).toFixed(2)}px`);
      raf = window.requestAnimationFrame(tick);
    };

    if (finePointer.matches) {
      frame.addEventListener("pointermove", setTargetFromPointer, { passive: true });
      frame.addEventListener("pointerleave", resetTarget, { passive: true });
    }
    raf = window.requestAnimationFrame(tick);

    return () => {
      if (finePointer.matches) {
        frame.removeEventListener("pointermove", setTargetFromPointer);
        frame.removeEventListener("pointerleave", resetTarget);
      }
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.canvas} ref={ref} data-home-canvas>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={`${styles.field} ${styles.lavender}`} />
        <span className={`${styles.field} ${styles.pink}`} />
        <span className={`${styles.field} ${styles.blue}`} />
        <span className={`${styles.field} ${styles.cream}`} />
      </div>
      {children}
    </div>
  );
}
