"use client";

/* =========================================================================
   03 — VISUAL WORLD  ·  "A wall, not a feed."
   -------------------------------------------------------------------------
   SELECTION RECORD
     composition : Velora — Parallax Grid + 21st.dev — scroll choreography
                   → re-authored as an explicit editorial grid: frames are
                     *placed* (row/column spans that overlap and leave the
                     wall deliberately unbalanced), never flowed into a
                     three-column gallery. Each frame carries its own
                     depth, so the wall separates as you pass it.
     frame state : Animata — Disclose Image / React Bits — Image Transition
                   → every frame has a second state: the crop shifts and
                     its plate arrives. Hover on pointer devices, focus for
                     keyboards, always-on for touch.
     signature   : React Bits — Image Trail → components/Home/fx/ImageTrail
   ========================================================================= */

import { useRef } from "react";
import ImageTrail from "../fx/ImageTrail";
import { WALL } from "../data";
import { setVar, useScene } from "../lib/engine";
import styles from "./VisualWorld.module.css";

/** Depth per frame, in px of travel across the passage. Order matches WALL. */
const DEPTH = [74, -46, 58, -30, 86, -58];

export default function VisualWorld() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const wallRef = useRef<HTMLDivElement | null>(null);

  useScene(sectionRef, "through", (p) => {
    /* −1 … 1 across the passage: one variable, six different travels. */
    setVar(wallRef.current, "--par", (p - 0.5) * 2);
  });

  return (
    <section
      className={styles.chapter}
      id="world"
      data-chapter-section="world"
      aria-labelledby="world-title"
      ref={sectionRef}
    >
      <header className={styles.head}>
        <span className={`${styles.index} vs-tech`}>03 — Visual world</span>
        <h2 className={styles.title} id="world-title">
          A wall, not a feed.
        </h2>
        <p className={styles.note}>
          Hung, not posted. Move through it and the frames separate — the wall
          keeps a little of what passes.
        </p>
      </header>

      <div className={styles.wall} ref={wallRef}>
        {WALL.map((frame, i) => (
          <figure
            className={styles.figure}
            key={frame.src}
            style={{ ["--depth" as string]: `${DEPTH[i] ?? 0}px` }}
            data-slot={i + 1}
            tabIndex={0}
            role="group"
            data-cursor="label"
            data-cursor-label="Inspect"
            aria-label={`${frame.title}. ${frame.place}, ${frame.year}.`}
          >
            <span className={styles.frameBox}>
              <img
                className={styles.image}
                src={frame.src}
                width={frame.width}
                height={frame.height}
                alt={frame.alt}
                loading="lazy"
                decoding="async"
              />
            </span>
            <figcaption className={styles.plate}>
              <span className={`${styles.plateIndex} vs-tech vs-tech--nano`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={styles.plateTitle}>{frame.title}</span>
              <span className={`${styles.plateMeta} vs-tech vs-tech--nano`}>
                {frame.place} · {frame.year} · {frame.exposure}
              </span>
            </figcaption>
          </figure>
        ))}

        <p className={styles.fragment}>
          Nothing here is arranged by date.
          <em>It is arranged by weather.</em>
        </p>

        <ImageTrail frames={WALL} />
      </div>
    </section>
  );
}
