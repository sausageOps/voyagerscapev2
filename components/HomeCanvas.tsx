"use client";

import { type ReactNode } from "react";
import styles from "./HomeCanvas.module.css";

/**
 * HOMEPAGE CANVAS — the rounded full-viewport frame.
 *
 * The frame and its atmosphere layer are transparent. The global
 * GiatsBackground (mounted once in AppShell) shows through, and the frame's
 * solid edge bands come from GiatsFrame. Nothing here mounts WebGL.
 */
export default function HomeCanvas({ children }: { children: ReactNode }) {
  return (
    <div className={styles.canvas} data-home-canvas>
      <div className={styles.atmosphere} aria-hidden="true" />
      {children}
    </div>
  );
}
