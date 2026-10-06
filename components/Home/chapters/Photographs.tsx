"use client";

/* =========================================================================
   05 — PHOTOGRAPHS  ·  "And then, the photographs."
   -------------------------------------------------------------------------
   SELECTION RECORD
     reveal : Aceternity — Hero Parallax / Animata — Images Reveal
              → each frame is uncovered by a clip-path wipe tied to its own
                position in the scroll, and its image travels through depth
                behind the frame. The payoff is slowness.
     second state : Aceternity — Lens
              → a loupe. Hovering a photograph magnifies it at full tonal
                contrast, exactly where the pointer is, as if the visitor
                leaned in. It is the one interaction in the page that says
                "inspect this", and it belongs here rather than on the wall.
     captions : always in the document, visible without hover — the plate
                is editorial information, not a reward.
   ========================================================================= */

import { useCallback, useEffect, useRef } from "react";
import { PHOTOGRAPHS, type Frame } from "../data";
import { range, setVar, smoothstep, useField, useScene } from "../lib/engine";
import styles from "./Photographs.module.css";

function Plate({ frame, slot }: { frame: Frame; slot: number }) {
  const figureRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useScene(figureRef, "through", (p) => {
    const el = figureRef.current;
    if (!el) return;
    setVar(el, "--in", smoothstep(0, 1, range(p, 0.06, 0.42)));
    setVar(el, "--depth", (p - 0.5) * 2);
  });

  /* The loupe is measured against the image box, not the figure: in two of
     the three compositions the box is only part of the figure's width, and
     a pointer normalised over the figure would offset the magnification. */
  useField(
    boxRef,
    (x, y, strength) => {
      const el = boxRef.current;
      if (!el) return;
      setVar(el, "--lx", x);
      setVar(el, "--ly", y);
      setVar(el, "--lens", strength);
    },
    { ease: 0.22, margin: -36 },
  );

  /* The loupe needs the frame's pixel size to magnify in place. */
  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    setVar(box, "--fw", `${box.offsetWidth}px`);
    setVar(box, "--fh", `${box.offsetHeight}px`);
  }, []);

  useEffect(() => {
    measure();
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <figure className={styles.figure} data-slot={slot} ref={figureRef as never}>
      <div className={styles.box} ref={boxRef} data-cursor="label" data-cursor-label="Look closer">
        <img
          className={styles.image}
          src={frame.src}
          width={frame.width}
          height={frame.height}
          alt={frame.alt}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.lens} aria-hidden="true">
          <span className={styles.lensInner}>
            <img
              className={styles.lensImage}
              src={frame.src}
              width={frame.width}
              height={frame.height}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
        </span>
      </div>

      <figcaption className={styles.plate}>
        <span className={`${styles.plateIndex} vs-tech vs-tech--nano`}>
          Frame {String(slot).padStart(2, "0")}
        </span>
        <span className={styles.plateTitle}>{frame.title}</span>
        <span className={`${styles.plateMeta} vs-tech vs-tech--nano`}>
          {frame.place} · {frame.year}
        </span>
        <span className={`${styles.plateExposure} vs-tech vs-tech--nano`}>{frame.exposure}</span>
      </figcaption>
    </figure>
  );
}

export default function Photographs() {
  return (
    <section
      className={styles.chapter}
      id="photographs"
      data-chapter-section="photographs"
      aria-labelledby="photographs-title"
    >
      <header className={styles.head}>
        <span className={`${styles.index} vs-tech`}>05 — Photography</span>
        <h2 className={styles.title} id="photographs-title">
          And then, the photographs.
        </h2>
        <p className={styles.note}>
          Everything before this was method. This is the reason for it.
        </p>
      </header>

      {PHOTOGRAPHS.map((frame, i) => (
        <Plate frame={frame} slot={i + 1} key={frame.src} />
      ))}
    </section>
  );
}
