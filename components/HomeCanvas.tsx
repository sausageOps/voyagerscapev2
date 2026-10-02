"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./HomeCanvas.module.css";

export default function HomeCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(any-pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      // Keep the response broad and atmospheric: the field moves a fraction
      // of the pointer distance rather than forming a cursor-sized light.
      target.x = (event.clientX / window.innerWidth - 0.5) * 230;
      target.y = (event.clientY / window.innerHeight - 0.5) * 170;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      const x = current.x.toFixed(2);
      const y = current.y.toFixed(2);
      canvas.style.setProperty("--pointer-x", `${x}px`);
      canvas.style.setProperty("--pointer-y", `${y}px`);
      canvas.style.setProperty("--pointer-x-soft", `${(current.x * 0.82).toFixed(2)}px`);
      canvas.style.setProperty("--pointer-y-soft", `${(current.y * 0.82).toFixed(2)}px`);
      canvas.style.setProperty("--pointer-x-counter", `${(current.x * -0.48).toFixed(2)}px`);
      canvas.style.setProperty("--pointer-y-counter", `${(current.y * -0.4).toFixed(2)}px`);
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.canvas} ref={ref}>
      <div className={styles.atmosphere} aria-hidden="true" />
      {children}
    </div>
  );
}
