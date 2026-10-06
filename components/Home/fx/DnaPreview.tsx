"use client";

/* =========================================================================
   DNA PREVIEW
   -------------------------------------------------------------------------
   One frame, six states. Each state is a different *treatment of the same
   medium* rather than a different widget, which is the point the chapter
   is making: photography, art, motion, design, code and experiment are
   things that happen to an image.

     photograph  — the frame, untouched
     art         — a crop pushed until it stops being a document
     motion      — the frame refuses to hold still
     design      — composition made visible: grid, margins, crop marks
     code        — the photograph sampled down to data and drawn back
     experiment  — the image coming apart in slices

   Only the active state is painted: inactive layers are clipped away and
   their animations are off. The CODE canvas is drawn once, on first
   activation, at 72px wide.
   ========================================================================= */

import { useEffect, useRef } from "react";
import type { DnaEntry } from "../data";
import styles from "./DnaPreview.module.css";

const TREATMENT: Record<string, string> = {
  photograph: "Photograph",
  art: "Abstraction",
  motion: "Sequence",
  design: "Composition",
  code: "Sampled data",
  experiment: "Distortion",
};

export default function DnaPreview({
  entries,
  active,
}: {
  entries: DnaEntry[];
  active: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawnRef = useRef(false);
  const codeEntry = entries.find((entry) => entry.preview === "code");
  const current = entries[active] ?? entries[0];

  /* CODE state: the photograph as data — sampled to a 72px grid and
     redrawn hard-edged. Costs one draw, ever. */
  useEffect(() => {
    if (drawnRef.current) return;
    if (current.preview !== "code") return;
    const canvas = canvasRef.current;
    if (!canvas || !codeEntry) return;

    const image = new Image();
    image.decoding = "async";
    image.src = codeEntry.frame.src;
    const draw = () => {
      const ratio = codeEntry.frame.height / codeEntry.frame.width;
      const w = 72;
      const h = Math.round(w * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(image, 0, 0, w, h);
      /* posterise: push the sample toward ink / paper so it reads as data */
      const data = ctx.getImageData(0, 0, w, h);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        const step = Math.round(l / 48) * 48;
        px[i] = step;
        px[i + 1] = step * 0.985;
        px[i + 2] = step * 0.95;
      }
      ctx.putImageData(data, 0, 0);
      drawnRef.current = true;
    };

    if (image.complete) draw();
    else image.addEventListener("load", draw, { once: true });
    return () => image.removeEventListener("load", draw);
  }, [current.preview, codeEntry]);

  return (
    <figure className={styles.preview} aria-hidden="true">
      <div className={styles.frame}>
        {entries.map((entry, i) => (
          <div
            className={styles.layer}
            key={entry.index}
            data-state={entry.preview}
            data-active={i === active ? "true" : "false"}
          >
            {entry.preview === "code" ? (
              <canvas className={styles.canvas} ref={canvasRef} />
            ) : (
              <img
                className={styles.image}
                src={entry.frame.src}
                width={entry.frame.width}
                height={entry.frame.height}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}

            {entry.preview === "motion" ? (
              <img
                className={styles.smear}
                src={entry.frame.src}
                width={entry.frame.width}
                height={entry.frame.height}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}

            {entry.preview === "experiment" ? (
              <>
                <img
                  className={`${styles.slice} ${styles.sliceA}`}
                  src={entry.frame.src}
                  width={entry.frame.width}
                  height={entry.frame.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <img
                  className={`${styles.slice} ${styles.sliceB}`}
                  src={entry.frame.src}
                  width={entry.frame.width}
                  height={entry.frame.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </>
            ) : null}

            {entry.preview === "design" ? <span className={styles.grid} /> : null}
          </div>
        ))}
        <span className={styles.corner} data-corner="tl" />
        <span className={styles.corner} data-corner="br" />
      </div>

      <figcaption className={styles.caption}>
        <span className={`${styles.treatment} vs-tech vs-tech--nano`}>
          {TREATMENT[current.preview]}
        </span>
        <span className={styles.captionTitle}>{current.frame.title}</span>
        <span className={`${styles.captionMeta} vs-tech vs-tech--nano`}>
          {current.frame.place} · {current.frame.year}
        </span>
      </figcaption>
    </figure>
  );
}
