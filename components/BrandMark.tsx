"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./BrandMark.module.css";

/**
 * Original Voyagerscape terminal glyph: V:/ inside a soft black chip.
 *
 * On hover (fine pointers only) the same chip widens from its fixed left
 * anchor and the mark resolves into the full wordmark: the V stays put, the
 * ":/" tail collapses away and "OYAGERSCAPE" is revealed from behind a
 * horizontal mask. One object transforming, never a second button.
 *
 * Zero reflow: the interactive chip is absolutely positioned over an
 * invisible in-flow ghost of the compact state, so the header row — and the
 * greeting row beneath it — only ever sees the resting V:/ silhouette, at
 * every breakpoint.
 */

/** Everything after the shared leading "V" of V:/ → VOYAGERSCAPE. */
const WORD_TAIL = "OYAGERSCAPE";

export default function BrandMark({ compact }: { compact?: boolean }) {
  const rootRef = useRef<HTMLSpanElement | null>(null);

  /* The reveal animates real pixel widths (auto is not interpolable), so the
     two travel distances are measured from the live, rendered type — the
     natural ":/" tail on the ghost and the natural wordmark inside the mask.
     Until they are measured the custom properties are simply absent, which
     leaves the resting chip at its natural width: no clipping pre-hydration,
     no JS-dependent resting state. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const tail = root.querySelector<HTMLElement>("[data-mark-tail]");
      const word = root.querySelector<HTMLElement>("[data-mark-word]");
      if (!tail || !word) return;
      root.style.setProperty("--mark-tail-w", `${tail.getBoundingClientRect().width.toFixed(2)}px`);
      // +1px device-pixel guard so the final glyph can never be shaved.
      root.style.setProperty(
        "--mark-word-w",
        `${(word.getBoundingClientRect().width + 1).toFixed(2)}px`,
      );
    };

    measure();
    if (document.fonts?.status !== "loaded") void document.fonts?.ready.then(measure);

    return () => {
      cancelled = true;
    };
  }, []);

  const chip = (extra: string) =>
    [styles.chip, compact ? styles.compact : "", extra].filter(Boolean).join(" ");

  return (
    <span className={styles.root} ref={rootRef}>
      {/* In-flow ghost of the compact chip: reserves the V:/ footprint so the
          expansion can never push the header around. */}
      <span className={chip(styles.ghost)} aria-hidden="true">
        <span className={styles.glyph}>
          <span className={styles.v}>V</span>
          <span className={styles.tailNatural} data-mark-tail>
            <span className={styles.colon}>:</span>
            <span className={styles.slash}>/</span>
          </span>
        </span>
        <span className={styles.caret} />
      </span>

      <Link
        href="/"
        className={chip(styles.mark)}
        aria-label="Voyagerscape — home"
        data-cursor="link"
        data-cursor-label="Home"
        data-magnetic
      >
        <span className={styles.glyph} aria-hidden="true">
          <span className={styles.v}>V</span>
          <span className={styles.tail}>
            <span className={styles.tailInner}>
              <span className={styles.colon}>:</span>
              <span className={styles.slash}>/</span>
            </span>
          </span>
          <span className={styles.word}>
            <span className={styles.wordInner} data-mark-word>
              {WORD_TAIL}
            </span>
          </span>
        </span>
        <span className={styles.caret} aria-hidden="true" />
      </Link>
    </span>
  );
}
