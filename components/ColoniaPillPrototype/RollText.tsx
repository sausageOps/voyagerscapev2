"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./RollText.module.css";

export interface RollTextProps {
  text: string;
  className?: string;
  durationMs?: number;
  staggerMs?: number;
  easing?: string;
}

const DEFAULT_DURATION_MS = 250;
const DEFAULT_STAGGER_MS = 32;
const DEFAULT_EASING = "cubic-bezier(0.77, 0, 0.175, 1)";

/**
 * Animata Roll Text Component
 * ===========================
 * Reference: https://animata.design/docs/text/roll-text
 *
 * - Two stacked copies of each character inside a strict clipped viewport (height: 1.2em).
 * - Copy A (resting) sits at [0, 1.2em], Copy B (incoming) sits at [1.2em, 2.4em] (100% hidden).
 * - Staggered character roll translates track by -50% (-1.2em), smoothly replacing Copy A with Copy B.
 * - Robust native animation lifecycle: reliably replays indefinitely on every hover.
 * - Latching playback: finishes full duration even if cursor leaves mid-roll.
 * - Binds to parent interactive element (button / Link) for full-chamber hit area.
 * - Accessible sr-only text with aria-hidden animated presentation.
 */
export function RollText({
  text,
  className = "",
  durationMs = DEFAULT_DURATION_MS,
  staggerMs = DEFAULT_STAGGER_MS,
  easing = DEFAULT_EASING,
}: RollTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const trackRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const isRollingRef = useRef(false);

  const characters = text.split("");

  const triggerRoll = useCallback(() => {
    if (prefersReducedMotion()) return;
    if (isRollingRef.current) return;
    isRollingRef.current = true;

    const tracks = trackRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (tracks.length === 0) {
      isRollingRef.current = false;
      return;
    }

    const totalDuration = durationMs + (tracks.length - 1) * staggerMs;
    const animations: Animation[] = [];

    tracks.forEach((track, index) => {
      const anim = track.animate(
        [
          { transform: "translateY(0%)" },
          { transform: "translateY(-50%)" },
        ],
        {
          duration: durationMs,
          delay: index * staggerMs,
          easing: easing,
          fill: "none",
        },
      );
      animations.push(anim);
    });

    const lastAnim = animations[animations.length - 1];
    if (lastAnim) {
      lastAnim.onfinish = () => {
        isRollingRef.current = false;
      };
      lastAnim.oncancel = () => {
        isRollingRef.current = false;
      };
    } else {
      setTimeout(() => {
        isRollingRef.current = false;
      }, totalDuration + 20);
    }
  }, [durationMs, staggerMs, easing]);

  // Bind hover trigger to parent interactive element (button / Link)
  useEffect(() => {
    const parent = containerRef.current?.parentElement || containerRef.current;
    if (!parent) return;

    const onEnter = () => {
      triggerRoll();
    };

    parent.addEventListener("mouseenter", onEnter);

    return () => {
      parent.removeEventListener("mouseenter", onEnter);
    };
  }, [triggerRoll]);

  return (
    <span
      ref={containerRef}
      className={`${styles.container} ${className}`.trim()}
      aria-label={text}
    >
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true" className={styles.visualRow}>
        {characters.map((char, index) => {
          const displayChar = char === " " ? "\u00A0" : char;
          return (
            <span key={index} className={styles.charViewport}>
              <span
                ref={(el) => {
                  trackRefs.current[index] = el;
                }}
                className={styles.charTrack}
              >
                <span className={styles.charItem}>{displayChar}</span>
                <span className={styles.charItem}>{displayChar}</span>
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
