"use client";

import { type ReactNode } from "react";
import styles from "./HomeCanvas.module.css";

/**
 * HOMEPAGE CANVAS — the rounded full-viewport frame.
 *
 * The frame and its atmosphere layer retain the theme's static surface color
 * (`--vs-frame-bg`). The atmosphere layer is intentionally kept as a clipped,
 * inert base surface; no animated/WebGL background is mounted here.
 */
export default function HomeCanvas({ children }: { children: ReactNode }) {
  return (
    <div className={styles.canvas} data-home-canvas>
      <div className={styles.atmosphere} aria-hidden="true" />
      {children}
    </div>
  );
}
