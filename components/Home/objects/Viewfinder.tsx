"use client";

/* =========================================================================
   VIEWFINDER  —  the page's one art object
   -------------------------------------------------------------------------
   SELECTION RECORD
     sections : 18 (mini widget / art object) and 19 (morphing status UI)
     source   : Cult UI — Dynamic Island (morphing states) + Animata micro
                widgets, re-authored entirely in the house material.
     why ONE  : the brief asks for a small art object *and* a chapter-aware
                status element. Two floating objects on one page is
                clutter, so this is one: a dial that reads the page.
                It never replaces navigation — it is instrumentation.

     What it reads:
       · chapter      → the name, and the ring's rest angle
       · scroll       → the film counter advances, the ring turns
       · pointer x/y  → aperture and shutter, the way a meter would move
     Hovering it opens the full reading; otherwise it stays a quiet pill.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "../data";
import { clamp, isFinePointer, useField, useScene } from "../lib/engine";
import styles from "./Viewfinder.module.css";

const SHUTTER = ["1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"];
const APERTURE = ["f1.4", "f2", "f2.8", "f4", "f5.6", "f8"];
const ISO = ["100", "160", "200", "320", "400", "640"];

export default function Viewfinder({
  scopeRef,
  chapter,
}: {
  scopeRef: React.RefObject<HTMLElement | null>;
  chapter: number;
}) {
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const ringRef = useRef<SVGGElement | null>(null);
  const frameRef = useRef<HTMLSpanElement | null>(null);
  const shutterRef = useRef<HTMLSpanElement | null>(null);
  const apertureRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [fine, setFine] = useState(true);

  useEffect(() => setFine(isFinePointer()), []);

  /* The dial reads the whole passage, not one chapter. */
  useScene(scopeRef, "pin", (p) => {
    const ring = ringRef.current;
    if (ring) ring.style.transform = `rotate(${(p * 220).toFixed(2)}deg)`;
    const frame = frameRef.current;
    if (frame) {
      const n = String(1 + Math.round(p * 35)).padStart(2, "0");
      if (frame.textContent !== n) frame.textContent = n;
    }
  });

  useField(
    scopeRef,
    (x, y) => {
      const s = SHUTTER[clamp(Math.round(y * (SHUTTER.length - 1)), 0, SHUTTER.length - 1)];
      const a = APERTURE[clamp(Math.round(x * (APERTURE.length - 1)), 0, APERTURE.length - 1)];
      if (shutterRef.current && shutterRef.current.textContent !== s) {
        shutterRef.current.textContent = s;
      }
      if (apertureRef.current && apertureRef.current.textContent !== a) {
        apertureRef.current.textContent = a;
      }
    },
    { ease: 0.07, margin: 0 },
  );

  const current = CHAPTERS[clamp(chapter, 0, CHAPTERS.length - 1)];

  return (
    <div className={styles.layer}>
      <button
        className={`${styles.object} vs-glass`}
        ref={rootRef}
        type="button"
        data-open={open ? "true" : "false"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Viewfinder — chapter ${current.index}, ${current.title}. Show the full reading.`}
        data-cursor="none"
      >
        <span className={styles.dial} aria-hidden="true">
          <svg viewBox="0 0 40 40" width="26" height="26">
            <circle className={styles.ringBase} cx="20" cy="20" r="14.5" />
            <g className={styles.ticks} ref={ringRef}>
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1="20"
                  y1="3.6"
                  x2="20"
                  y2={i % 3 === 0 ? "7.6" : "6"}
                  transform={`rotate(${i * 30} 20 20)`}
                />
              ))}
            </g>
            <circle className={styles.pupil} cx="20" cy="20" r="3.4" />
          </svg>
        </span>

        {/* The chapter is announced once, as a sentence; the rolling
            states below are decoration and stay out of the tree. */}
        <span className="vs-sr-only" role="status">
          Chapter {current.index} — {current.title}
        </span>

        <span className={styles.readout} aria-hidden="true">
          <span className={styles.rowTop}>
            <span className={`${styles.chapterIndex} vs-tech vs-tech--nano`}>
              {current.index}
            </span>
            <span className={styles.window}>
              {CHAPTERS.map((entry, i) => (
                <span
                  className={`${styles.state} vs-tech vs-tech--nano`}
                  key={entry.id}
                  data-active={i === chapter ? "true" : "false"}
                >
                  {entry.readout}
                </span>
              ))}
            </span>
          </span>

          <span className={`${styles.rowBottom} vs-tech vs-tech--nano`}>
            <span className={styles.cell}>
              Frame <span ref={frameRef}>01</span>
            </span>
            <span className={styles.cell}>ISO {ISO[clamp(chapter, 0, ISO.length - 1)]}</span>
            {fine ? (
              <>
                <span className={styles.cell} ref={shutterRef}>
                  1/250
                </span>
                <span className={styles.cell} ref={apertureRef}>
                  f2.8
                </span>
              </>
            ) : null}
          </span>
        </span>
      </button>
    </div>
  );
}
