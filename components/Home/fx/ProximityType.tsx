"use client";

/* =========================================================================
   PROXIMITY TYPE  —  hero headline, cursor-responsive
   -------------------------------------------------------------------------
   SELECTION RECORD
     section : 01 ARRIVAL — hero typography
     source  : React Bits — Variable Proximity / Text Pressure
               (MIT + Commons Clause, source-available, free to use)
     why     : per-letter proximity falloff is the one typographic
               interaction that stays *readable* — the headline never
               becomes a toy, it just leans toward the reader.
     change  : React Bits interpolates variable-font axes. Voyagerscape's
               display face is locked to Pixelify Sans, which ships as three
               *static* weights — there is no `wght` axis to interpolate and
               synthetic bolding smears a pixel grid. So the axis blend is
               re-expressed two ways that the locked fonts can actually do:
                 · a second, genuinely heavier cut (600) cross-fades in over
                   the resting cut (400) — real weight, zero reflow, because
                   the heavy copy is absolutely positioned over the light one;
                 · continuous scale / lift / lateral pressure on the glyph box.
               The result is "pressure" rather than "wobble", and the
               headline is legible at every value.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useField, clamp01 } from "../lib/engine";
import styles from "./ProximityType.module.css";

interface ProximityTypeProps {
  /** One array entry per rendered line. */
  lines: string[];
  /** The accessible, unsplit sentence. */
  label: string;
  className?: string;
  /** Pointer influence radius, in px. */
  radius?: number;
  as?: "h1" | "h2" | "p" | "div";
}

interface CharRef {
  el: HTMLSpanElement;
  x: number;
  y: number;
  /** -1 | 0 | 1 — which way lateral pressure pushes this glyph. */
  dir: number;
  value: number;
}

export default function ProximityType({
  lines,
  label,
  className = "",
  radius = 190,
  as: Tag = "h1",
}: ProximityTypeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const charsRef = useRef<CharRef[]>([]);
  const boxRef = useRef({ w: 1, h: 1 });

  const register = useCallback((el: HTMLSpanElement | null, dir: number) => {
    if (!el) return;
    if (charsRef.current.some((c) => c.el === el)) return;
    charsRef.current.push({ el, x: 0, y: 0, dir, value: 0 });
  }, []);

  /* Glyph centres are measured once per layout, never per frame. */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    boxRef.current = { w: rect.width || 1, h: rect.height || 1 };
    charsRef.current.forEach((char) => {
      const r = char.el.getBoundingClientRect();
      char.x = r.left - rect.left + r.width / 2;
      char.y = r.top - rect.top + r.height / 2;
    });
  }, []);

  useEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure, lines]);

  useField(
    rootRef,
    (nx, ny, strength) => {
      const { w, h } = boxRef.current;
      const px = nx * w;
      const py = ny * h;
      const r2 = radius * radius;
      const chars = charsRef.current;
      for (let i = 0; i < chars.length; i += 1) {
        const char = chars[i];
        const dx = px - char.x;
        const dy = py - char.y;
        const d2 = dx * dx + dy * dy;
        let next = 0;
        if (d2 < r2) {
          /* gaussian-ish falloff: firm core, long quiet tail */
          const t = 1 - Math.sqrt(d2) / radius;
          next = clamp01(t * t * (3 - 2 * t)) * strength;
        }
        if (Math.abs(next - char.value) < 0.004) continue;
        char.value = next;
        char.el.style.setProperty("--p", next.toFixed(3));
      }
    },
    { ease: 0.16, margin: radius },
  );

  const split = useMemo(
    () =>
      lines.map((line) => {
        const letters = Array.from(line);
        const mid = (letters.length - 1) / 2;
        return letters.map((ch, i) => ({
          ch,
          dir: i < mid ? -1 : i > mid ? 1 : 0,
          key: `${ch}-${i}`,
        }));
      }),
    [lines],
  );

  return (
    <Tag className={`${styles.root} ${className}`}>
      <span className="vs-sr-only">{label}</span>
      <span className={styles.visual} ref={rootRef as never} aria-hidden="true">
        {split.map((line, li) => (
          <span className={styles.line} key={li}>
            {line.map(({ ch, dir, key }) =>
              ch === " " ? (
                <span className={styles.space} key={key}>
                  &nbsp;
                </span>
              ) : (
                <span
                  className={styles.char}
                  data-char
                  key={key}
                  ref={(el) => register(el, dir)}
                  style={{ ["--dir" as string]: dir }}
                >
                  <span className={styles.face}>{ch}</span>
                  <span className={styles.heavy} aria-hidden="true">
                    {ch}
                  </span>
                </span>
              ),
            )}
          </span>
        ))}
      </span>
    </Tag>
  );
}
