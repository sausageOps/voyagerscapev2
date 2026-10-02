"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./HomeCanvas.module.css";

export default function HomeCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(any-pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const setTargetFromPointer = (event: PointerEvent) => {
      const bounds = frame.getBoundingClientRect();
      const insideX = (event.clientX - bounds.left) / bounds.width;
      const insideY = (event.clientY - bounds.top) / bounds.height;
      target.x = Math.max(-0.5, Math.min(0.5, insideX - 0.5)) * 150;
      target.y = Math.max(-0.5, Math.min(0.5, insideY - 0.5)) * 112;
    };

    const resetTarget = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;

      const x = current.x.toFixed(2);
      const y = current.y.toFixed(2);
      frame.style.setProperty("--field-strong-x", `${x}px`);
      frame.style.setProperty("--field-strong-y", `${y}px`);
      frame.style.setProperty("--field-opposite-x", `${(-current.x * 0.72).toFixed(2)}px`);
      frame.style.setProperty("--field-opposite-y", `${(-current.y * 0.72).toFixed(2)}px`);
      frame.style.setProperty("--field-diagonal-x", `${(current.x * 0.5).toFixed(2)}px`);
      frame.style.setProperty("--field-diagonal-y", `${(-current.y * 0.42).toFixed(2)}px`);
      frame.style.setProperty("--field-soft-x", `${(current.x * 0.26).toFixed(2)}px`);
      frame.style.setProperty("--field-soft-y", `${(current.y * 0.26).toFixed(2)}px`);
      raf = window.requestAnimationFrame(tick);
    };

    frame.addEventListener("pointermove", setTargetFromPointer, { passive: true });
    frame.addEventListener("pointerleave", resetTarget, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      frame.removeEventListener("pointermove", setTargetFromPointer);
      frame.removeEventListener("pointerleave", resetTarget);
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
