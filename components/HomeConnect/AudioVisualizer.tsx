"use client";

import { useEffect, useRef } from "react";
import styles from "./AudioVisualizer.module.css";

const BARS = 28;

/** Lightweight level meter — DOM bars, transform-only updates. */
export default function AudioVisualizer({
  level,
  active,
  label,
}: {
  level: number;
  active: boolean;
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const history = useRef<number[]>(new Array(BARS).fill(0.04));

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const bars = Array.from(root.children) as HTMLElement[];
    history.current.shift();
    history.current.push(active ? Math.max(0.06, level) : 0.04);
    history.current.forEach((value, index) => {
      const bar = bars[index];
      if (bar) bar.style.transform = `scaleY(${Math.max(0.05, value).toFixed(3)})`;
    });
  }, [level, active]);

  return (
    <div className={styles.wrap} data-active={active ? "true" : "false"} role="img" aria-label={label}>
      <div className={styles.bars} ref={ref}>
        {Array.from({ length: BARS }).map((_, index) => (
          <span key={index} className={styles.bar} />
        ))}
      </div>
    </div>
  );
}
