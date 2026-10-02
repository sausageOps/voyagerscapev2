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
    let ambientStart = 0;

    // Autonomous ambient drift. Each field gets two slow, non-harmonic
    // oscillators per axis so the motion is quasi-periodic: the four fields
    // never settle into a shared rhythm or repeat the same path. Amplitudes
    // stay far below the pointer response, which remains the dominant motion.
    const TAU = Math.PI * 2;
    const drift = (
      seconds: number,
      amplitude: number,
      slowPeriod: number,
      slowPhase: number,
      fastPeriod: number,
      fastPhase: number,
    ) =>
      amplitude *
      (0.72 * Math.sin((seconds / slowPeriod) * TAU + slowPhase) +
        0.28 * Math.sin((seconds / fastPeriod) * TAU + fastPhase));

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
      if (!ambientStart) ambientStart = timestamp;
      const seconds = (timestamp - ambientStart) / 1000;
      // Ease the drift in from the base layout so nothing jumps on mount.
      const settle = Math.min(1, seconds / 2.4);
      const intro = settle * settle * (3 - 2 * settle);

      const lavenderX = intro * drift(seconds, 34, 12.7, 0.0, 19.3, 2.1);
      const lavenderY = intro * drift(seconds, 26, 14.6, 1.7, 23.1, 4.4);
      const mintX = intro * drift(seconds, 30, 15.4, 2.6, 24.7, 0.8);
      const mintY = intro * drift(seconds, 27, 13.9, 4.9, 21.3, 3.3);
      const blueX = intro * drift(seconds, 28, 10.9, 5.2, 17.7, 1.4);
      const blueY = intro * drift(seconds, 22, 12.8, 3.1, 19.9, 5.7);
      const creamX = intro * drift(seconds, 26, 18.5, 1.1, 27.4, 3.9);
      const creamY = intro * drift(seconds, 20, 16.3, 5.8, 25.1, 2.4);

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
