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
 *                        the server-rendered markup, the no-WebGL fallback,
 *                        and the colour base the wave print draws over.
 *   <HomeAtmosphere /> → the React Bits Pattern Waves surface (WebGL2/OGL),
 *                        its marks printed over the fields and introduced by
 *                        the component's own intro (centre-out fade + rise).
 *
 * The atmosphere's only pointer reactivity is the subtle wake of ripples
 * Pattern Waves stirs (window-level, passive listeners; nothing is
 * intercepted). The CRT remains the page's only interactive object,
 * exactly as before.
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
