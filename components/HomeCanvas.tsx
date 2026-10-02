"use client";

import { type ReactNode } from "react";
import styles from "./HomeCanvas.module.css";
import HomeAtmosphere from "./HomeAtmosphere";

/**
 * HOMEPAGE CANVAS — the rounded full-viewport frame.
 *
 * The atmosphere stack, back to front:
 *
 *   .atmosphere        → cream base + the four static field washes. This is
 *                        the server-rendered markup, the no-WebGPU fallback,
 *                        and the layer the shader covers when it is ready.
 *   <HomeAtmosphere /> → the ShaderTown Mesh Gradient (WebGPU), faded in
 *                        over the fields once its first frame is drawn.
 *
 * The atmosphere is autonomous: the old pointer-driven field animation was
 * removed with the renderer swap, and no pointer reactivity was added in its
 * place. The CRT remains the page's only pointer-reactive object, exactly as
 * before.
 */
export default function HomeCanvas({ children }: { children: ReactNode }) {
  return (
    <div className={styles.canvas} data-home-canvas>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={`${styles.field} ${styles.lavender}`} />
        <span className={`${styles.field} ${styles.pink}`} />
        <span className={`${styles.field} ${styles.blue}`} />
        <span className={`${styles.field} ${styles.cream}`} />
        <HomeAtmosphere />
      </div>
      {children}
    </div>
  );
}
