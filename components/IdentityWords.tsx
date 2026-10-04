"use client";

import { useEffect, useRef } from "react";
import { mountRotation } from "@/lib/rotating-words";
import styles from "./IdentityWords.module.css";

/**
 * Rotating footer identity line — Voyagerscape's own living signature.
 * Four small word chips read as one grammatical identity statement:
 * ARTICLE · MODIFIER · FIELD · ROLE — "A Visual Photography Explorer",
 * "An AI Digital Art Explorer". Every chip rotates — the article
 * included — but never at random: the vocabulary below is authored as
 * complete phrases, and the word pools are aligned so that what is on
 * screen at rest is always one of those phrases (or a grammatically
 * sound hand-off between two of them).
 *
 * Grammar drives the choreography: the article is bound to the modifier
 * it describes, so those two positions roll together, while the field
 * and role positions trail one beat apart. The row therefore never
 * rests on "An Photography" or "A AI" — a coupled pair moves as one
 * unit, the nouns trail behind, and the sentence stays natural English
 * at every pause.
 *
 * Each position reuses the GreetingPill's verified approach: a clip
 * window whose width is tweened to the active word — the word's width
 * measured in place, in the actual font, casing and tracking it is shown
 * in, plus a 1px guard. No fixed widths, no longest-word widths; a chip
 * hugs "Art" and breathes open to hold "Cloud Technology".
 */

/**
 * Aligned word pools. Reading column i gives one authored phrase —
 * column 0 is "A Visual Photography Explorer", column 9 is "An AI
 * Digital Art Explorer". Articles and modifiers advance as one locked
 * pair (see OFFSETS); field and role trail one beat apart. Compound
 * fields ("AI & Cloud", "Digital Art", "Cloud Technology") sit in a
 * single chip so a phrase can run to five words while the row always
 * holds four chips.
 */
const SLOTS: readonly string[][] = [
  // Article — rotates A / An / The like any other word
  [
    "A", "A", "A", "A", "An", "An", "An", "An", "An", "An", "A", "A",
    "A", "The",
  ],
  // Modifier / identity adjective — locked to its article
  [
    "Visual", "Creative", "Curious", "Visual", "AI", "AI & Cloud",
    "Artistic", "Automotive", "Automotive", "AI", "Photography",
    "Digital", "Creative", "Curious",
  ],
  // Field / craft material — a noun phrase: free with any article
  [
    "Photography", "Digital", "Technology", "Art", "Creative",
    "Technology", "Machines", "Photography", "Visual", "Digital Art",
    "Technology", "Art", "Cloud Technology", "Creative",
  ],
  // Role / identity
  [
    "Explorer", "Artist", "Explorer", "Storyteller", "Technologist",
    "Explorer", "Experimenter", "Enthusiast", "Storyteller", "Explorer",
    "Creator", "Experimenter", "Explorer", "Technologist",
  ],
];

/** A beat of stagger between trailing positions: the row never changes
 *  everywhere at once, and every in-between phrase holds ~2.4s. */
const OFFSET = 2.4;
/** Per-position stagger: the article always travels with the modifier
 *  it describes (same beat — an article has no meaning apart from its
 *  word). Only the field and role may trail: noun phrases read
 *  grammatically with any article, so letting them lag can never
 *  produce "An Photography". */
const OFFSETS = [0, 0, OFFSET, OFFSET * 2];

export default function IdentityWords() {
  const ref = useRef<HTMLDivElement | null>(null);

  /* The rotation itself is the shared engine in lib/rotating-words.ts —
     this component's own code, unchanged, now callable from a second
     surface. Timing, easing and width choreography are its defaults. */
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return mountRotation(root, { slots: SLOTS, offsets: OFFSETS });
  }, []);

  return (
    <div className={styles.identity} ref={ref}>
      {/* The rotating run is decorative and is never announced; one stable
          sentence carries the identity to assistive technology. */}
      <span className="vs-sr-only">
        Voyagerscape is the practice of a visual explorer working across
        photography, art, technology, cloud, AI and automobiles.
      </span>
      <span className={styles.run} aria-hidden="true">
        {SLOTS.map((pool, s) => (
          <span
            className={[
              styles.chip,
              s === 0 ? styles.lead : "",
              s === 2 ? styles.pill : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={s}
          >
            <span className={styles.window} data-identity-window>
              {/* Invisible in-flow sizer: natural resting width and the
                  constant row height. Never a rotating word itself. */}
              <span className={styles.sizer} aria-hidden="true">
                {pool[0]}
              </span>
              {pool.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className={[styles.word, i > 0 ? styles.dormant : ""].filter(Boolean).join(" ")}
                  data-identity-word
                >
                  {word}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
