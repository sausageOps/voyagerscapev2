"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./HomeCanvas.module.css";

export default function HomeCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 100;
      target.y = (event.clientY / window.innerHeight) * 100;
    };
    const tick = () => {
      current.x += (target.x - current.x) * 0.035;
      current.y += (target.y - current.y) * 0.035;
      canvas.style.setProperty("--mouse-x", `${current.x}%`);
      canvas.style.setProperty("--mouse-y", `${current.y}%`);
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className={styles.canvas} ref={ref}>{children}</div>;
}
