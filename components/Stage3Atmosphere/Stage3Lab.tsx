"use client";

import styles from "./Stage3Lab.module.css";
import Stage3Atmosphere from "./Stage3Atmosphere";
import { STAGE3_PALETTE_SWATCHES } from "./palette";

/**
 * Isolated evaluation shell for the Stage 3 atmosphere. Not the homepage,
 * and intentionally not a reproduction of it — a neutral dark surface, one
 * rounded frame, and a line of technical labels.
 */
export default function Stage3Lab() {
  return (
    <div className={styles.shell}>
      <div className={styles.labels}>
        <span>stage 3 / procedural atmosphere</span>
        <span>webgl · fullscreen quad · domain warp</span>
        <span className={styles.swatches}>
          {STAGE3_PALETTE_SWATCHES.map((swatch) => (
            <span
              key={swatch.name}
              className={styles.swatch}
              style={{ background: swatch.hex }}
              title={`${swatch.name} ${swatch.hex}`}
            />
          ))}
        </span>
      </div>

      <div className={styles.frame}>
        <Stage3Atmosphere />
      </div>

      <div className={styles.labels}>
        <span>frame static · atmosphere clipped</span>
        <span>pointer bends domain · no cursor light</span>
        <span>reduced-motion + visibility aware</span>
      </div>
    </div>
  );
}
