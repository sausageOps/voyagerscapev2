"use client";

/* =========================================================================
   04 — MADE WITH LIGHT   (and 15 — the code identity)
   -------------------------------------------------------------------------
   One pinned plate. The photograph is sampled into light, taken apart into
   data and form, and put back together — and the pointer is the light
   source while it happens. The two briefs (an interactive light field, and
   "image → data → form → image") are the same object here on purpose:
   two separate experiments would have said the same thing twice.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-provider";
import LightField, { type LightFieldHandle } from "../fx/LightField";
import { LIGHT_FRAME } from "../data";
import { clamp01, isFinePointer, prefersReducedMotion, setVar, useField, useScene } from "../lib/engine";
import styles from "./LightLab.module.css";

const STAGES = ["Image", "Data", "Form", "Image"];

export default function LightLab() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<LightFieldHandle | null>(null);
  const [stage, setStage] = useState(0);
  const stageIndexRef = useRef(0);
  const { isDark } = useTheme();
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useScene(trackRef, "pin", (p) => {
    fieldRef.current?.setProgress(p);
    setVar(stageRef.current, "--p", p);

    const next = p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3;
    if (next !== stageIndexRef.current) {
      stageIndexRef.current = next;
      setStage(next);
    }

    /* No pointer? Then the scroll carries the light across the plate. */
    if (!isFinePointer()) {
      fieldRef.current?.setPointer(0.5, clamp01(0.12 + p * 0.76), 0.9);
    }
  });

  useField(
    plateRef,
    (x, y, strength) => {
      fieldRef.current?.setPointer(x, y, strength);
    },
    { ease: 0.1, margin: 40 },
  );

  return (
    <section
      className={styles.chapter}
      id="light"
      data-chapter-section="light"
      aria-labelledby="light-title"
      data-reduced={reduced ? "true" : "false"}
    >
      <div className={styles.track} ref={trackRef}>
        <div className={styles.stage} ref={stageRef}>
          <header className={styles.head}>
            <span className={`${styles.index} vs-tech`}>04 — Experiment</span>
            <h2 className={styles.title} id="light-title">
              Made with light.
            </h2>
            <p className={styles.note}>
              A photograph is only a measurement of light. Take the measurement
              apart and you get data; give the data a structure and you get
              form; let it settle and the photograph comes back — changed.
            </p>
          </header>

          <div className={styles.plate} ref={plateRef} data-cursor="label" data-cursor-label="Light">
            <LightField
              ref={fieldRef}
              src={LIGHT_FRAME.src}
              width={LIGHT_FRAME.width}
              height={LIGHT_FRAME.height}
              alt={LIGHT_FRAME.alt}
              isDark={isDark}
            />
          </div>

          <div className={styles.readout}>
            <ol className={styles.stages}>
              {STAGES.map((label, i) => (
                <li
                  className={`${styles.stageItem} vs-tech vs-tech--nano`}
                  key={`${label}-${i}`}
                  data-active={stage === i ? "true" : "false"}
                >
                  <span className={styles.stageDot} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ol>
            <p className={`${styles.hint} vs-tech vs-tech--nano`}>
              Move across the plate — the light answers
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
