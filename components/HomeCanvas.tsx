"use client";

import { type ReactNode } from "react";
import styles from "./HomeCanvas.module.css";
import HomeAtmosphere from "./HomeAtmosphere";

/**
 * HOMEPAGE CANVAS — the rounded full-viewport frame.
 *
 * The atmosphere is a single layer:
 *
 *   .atmosphere        → the clip (overflow + inherited radius) and the
 *                        frame's paper colour, #fffdf9, matching the
 *                        Pattern Waves backgroundColor exactly so the
 *                        canvas never seams against it.
 *   <HomeAtmosphere /> → the React Bits Pattern Waves surface (WebGL2/OGL),
 *                        the SOLE visual frame background: a terminal/glyph
 *                        print over a ripple surface, introduced by the
 *                        component's own intro (centre-out fade + rise).
 *
 * The legacy pastel field washes that used to sit under this canvas were
 * removed: Pattern Waves is opaque wherever it draws, so they were never
 * visible, and they are no longer the no-WebGL fallback — that fallback is
 * now the flat #fffdf9 paper, which is what the frame is meant to be.
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
        <HomeAtmosphere />
      </div>
      {children}
    </div>
  );
}
