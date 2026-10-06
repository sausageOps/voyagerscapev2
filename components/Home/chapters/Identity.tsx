"use client";

/* =========================================================================
   02 — IDENTITY  ·  "This is not only photography."
   -------------------------------------------------------------------------
   SELECTION RECORD
     statement : Magic UI — Text Reveal / React Bits — Scroll Reveal
                 → word-by-word ink density driven by scroll position.
                   Re-authored as CSS variables written by the shared
                   engine (the originals each mount their own observer and
                   a motion library we do not ship).
     index     : React Bits — Variable Proximity (dominance) crossed with
                 21st.dev — hover-preview card patterns.
                 → the six words ARE the index. One list, not two: a
                   typographic field that happens to be navigable, with a
                   live preview that explains what each word means at
                   Voyagerscape. Two separate blocks saying the same six
                   words would have been decoration.
     previews  : Animata — Disclose Image / Images Reveal for the mask,
                 React Bits — Pixel Transition for the CODE state.

   Dominance is continuous (distance to the pointer), not binary hover, so
   the hierarchy is something the visitor *holds*, not something they
   toggle. Touch and keyboard get the same thing through scroll position
   and focus.
   ========================================================================= */

import { useCallback, useEffect, useRef, useState } from "react";
import { DNA } from "../data";
import { clamp01, range, setVar, useField, useScene } from "../lib/engine";
import DnaPreview from "../fx/DnaPreview";
import styles from "./Identity.module.css";

const STATEMENT = "This is not only photography.";

export default function Identity() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const statementRef = useRef<HTMLParagraphElement | null>(null);
  const wordsRef = useRef<HTMLElement[]>([]);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rowsRef = useRef<HTMLLIElement[]>([]);
  const nearRef = useRef<number[]>(DNA.map(() => 0));
  /* Row geometry is cached: the pointer field runs every frame and must
     never read layout while it is writing styles. */
  const geoRef = useRef<{ height: number; centers: number[]; reach: number[] }>({
    height: 1,
    centers: [],
    reach: [],
  });
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const activeRef = useRef(0);
  activeRef.current = active;
  const heldRef = useRef(false);
  heldRef.current = held;

  const words = STATEMENT.split(" ");

  const registerWord = useCallback((el: HTMLElement | null, i: number) => {
    if (el) wordsRef.current[i] = el;
  }, []);

  const registerRow = useCallback((el: HTMLLIElement | null, i: number) => {
    if (el) rowsRef.current[i] = el;
  }, []);

  /* ---- statement: ink arrives word by word ---- */
  useScene(statementRef, "through", (p) => {
    const list = wordsRef.current;
    const n = list.length;
    const span = 0.42;
    for (let i = 0; i < n; i += 1) {
      const start = 0.3 + (i / n) * span;
      const v = range(p, start, start + 0.16);
      setVar(list[i], "--w", v);
    }
  });

  const measureRows = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = rowsRef.current;
    geoRef.current = {
      height: list.offsetHeight || 1,
      centers: rows.map((row) => (row ? row.offsetTop + row.offsetHeight / 2 : 0)),
      reach: rows.map((row) => (row ? row.offsetHeight * 1.9 : 1)),
    };
  }, []);

  useEffect(() => {
    measureRows();
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(measureRows);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measureRows]);

  /* ---- the index: proximity dominance ---- */
  useField(
    listRef,
    (x, y, strength) => {
      const rows = rowsRef.current;
      const geo = geoRef.current;
      if (!rows.length || !geo.centers.length) return;
      const py = y * geo.height;
      let best = -1;
      let bestValue = 0;

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row) continue;
        const d = Math.abs(py - geo.centers[i]);
        const reach = geo.reach[i] || 1;
        const t = clamp01(1 - d / reach);
        const value = t * t * (3 - 2 * t) * strength;
        if (Math.abs(value - nearRef.current[i]) > 0.004) {
          nearRef.current[i] = value;
          setVar(row, "--near", value);
        }
        if (value > bestValue) {
          bestValue = value;
          best = i;
        }
      }

      /* Lateral distance should not break the hold — only leaving does. */
      const holding = strength > 0.2 && bestValue > 0.25 && x > -0.4 && x < 1.4;
      if (holding && best >= 0 && best !== activeRef.current) setActive(best);
      setHeld((prev) => (prev === holding ? prev : holding));
    },
    { ease: 0.18, margin: 80 },
  );

  /* ---- touch / keyboard / no-pointer fallback: scroll decides ---- */
  useEffect(() => {
    const rows = rowsRef.current.filter(Boolean);
    if (!rows.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = rows.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) {
            setActive((prev) => {
              /* a held pointer always wins over the scroll fallback */
              if (heldRef.current) return prev;
              return index;
            });
          }
        });
      },
      { rootMargin: "-48% 0px -48% 0px", threshold: 0 },
    );
    rows.forEach((row) => io.observe(row));
    return () => io.disconnect();
  }, []);

  return (
    <section
      className={styles.chapter}
      id="identity"
      data-chapter-section="identity"
      aria-labelledby="identity-title"
      ref={sectionRef}
    >
      <header className={styles.head}>
        <span className={`${styles.index} vs-tech`}>02 — Identity</span>
        <h2 className={styles.statement} id="identity-title" ref={statementRef}>
          {words.map((word, i) => (
            <span
              className={styles.word}
              key={`${word}-${i}`}
              ref={(el) => registerWord(el, i)}
            >
              {word}
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          ))}
        </h2>
        <p className={styles.lede}>
          Voyagerscape is a visual practice, not a camera. Photography is where
          it starts — the rest is what happens to an image once you refuse to
          leave it alone.
        </p>
      </header>

      <div className={styles.field}>
        <ul className={styles.list} ref={listRef} data-held={held ? "true" : "false"}>
          {DNA.map((entry, i) => (
            <li
              className={styles.row}
              key={entry.index}
              ref={(el) => registerRow(el, i)}
              data-active={active === i ? "true" : "false"}
            >
              <button
                className={styles.rowButton}
                type="button"
                onFocus={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                data-cursor-label="Hold"
              >
                <span className={`${styles.rowIndex} vs-tech vs-tech--nano`}>{entry.index}</span>
                <span className={styles.rowWord}>{entry.word}</span>
                <span className={styles.rowNote}>{entry.note}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.previewColumn}>
          <DnaPreview entries={DNA} active={active} />
        </div>
      </div>
    </section>
  );
}
