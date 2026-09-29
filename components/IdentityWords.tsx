"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion";
import styles from "./IdentityWords.module.css";

/**
 * Rotating footer identity line — Voyagerscape's own living signature.
 * Four small word chips read as one fragment of an identity statement;
 * the article is constant while the three positions afterwards rotate
 * independently, one at a time, so the sentence is continuously evolving
 * rather than being replaced as a block.
 *
 * Each rotating position reuses the GreetingPill's verified approach:
 * a clip window whose width is tweened to the active word — the word's
 * width measured in place, in the actual font, casing and tracking it is
 * shown in, plus a 1px guard. No fixed widths, no longest-word widths;
 * a chip hugs "Art" and breathes open to hold "Photography".
 *
 * The vocabulary is authored, not randomised: aligned pools cycle through
 * deliberately written combinations (modifier · craft · identity), so
 * every resting phrase — and every one-word-off mix the stagger passes
 * through — reads as editorial. The repeated appearances of the core
 * fields (photography, art, technology, cloud, AI, automotive) are
 * intentional weighting, not duplication.
 */

const LEAD = "A";

/**
 * Aligned rotating pools. Reading column i gives one authored phrase —
 * e.g. column 0 is "A Visual Photography Explorer", column 8 is "A Code
 * Pixels Human". The final "Voyager" is the site's own name, and doubles
 * as the wrap: every pool's last word differs from its first, so the
 * cycle's closing transition always lands back on the first chip word —
 * which is what lets one timeline repeat seamlessly forever.
 */
const SLOTS: readonly string[][] = [
  // Position 1 — modifier / field
  [
    "Visual", "Digital", "Automotive", "AI", "Visual", "Creative",
    "Digital", "Automotive", "Code", "Curious", "Visual", "Experimental",
    "Photography", "Future",
  ],
  // Position 2 — craft / material
  [
    "Photography", "Art", "Photography", "Cloud", "Automotive",
    "Technology", "AI", "Technology", "Pixels", "Creative", "Stories",
    "Machines", "Art", "Design",
  ],
  // Position 3 — identity, anchored on "Explorer" for long calm runs
  [
    "Explorer", "Explorer", "Explorer", "Explorer", "Explorer", "Human",
    "Explorer", "Nerd", "Human", "Technologist", "Explorer", "Human",
    "Technologist", "Voyager",
  ],
];

/** How long one position rests on a word before handing it on. */
const HOLD = 7.2;
/** The row's editorial beat: one position changes every OFFSET seconds,
 *  each position trailing the previous by this stagger, so the row never
 *  changes everywhere at once and every in-between phrase holds ~2.4s. */
const OFFSET = 2.4;
/** A beat of calm before the first change — never change on arrival. */
const LEAD_IN = 0.6;
/** Travel time of a single word's roll. */
const ROLL = 0.5;
/** The incoming word trails the outgoing one by a beat. */
const CASCADE = 0.06;
/** Shrinks lag the roll: the wider outgoing word must have fully left
 *  the window before the window may start closing around the new one. */
const WIDTH_LAG = 0.4;
/** Sub-pixel guard: a window must never round down to a hair less than
 *  its word. */
const PX_GUARD = 1;
/** Travel time of a window's width, scaled by the size of the hop so a
 *  large resize (Visual → Experimental) never whips. Growth always
 *  completes at at + 0.1s, before the incoming word peeks into view. */
const widthDuration = (delta: number) => gsap.utils.clamp(0.32, 0.26 + delta * 0.01, 0.6);

export default function IdentityWords() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let cancelled = false;
    let ctx: gsap.Context | undefined;
    let resizeTimer = 0;

    /* The windows' widths must follow rendered text, so measure only once
       the self-hosted display face has resolved. The row's type scale is
       viewport-clamped, so a width change means the measured widths are
       stale: rebuild in that case only — height-only resizes (a mobile
       URL bar collapsing on scroll) must never restart the rotation. */
    let baseWidth = 0;
    const start = () => {
      if (cancelled) return;
      baseWidth = window.innerWidth;

      const slots = Array.from(
        root.querySelectorAll<HTMLElement>("[data-identity-window]"),
      ).map((win, i) => {
        const words = Array.from(win.querySelectorAll<HTMLElement>("[data-identity-word]"));
        if (words.length !== SLOTS[i].length) return null;
        // Natural width of every word, as actually rendered — measured in
        // place, ceil + guard so the window can never shave a glyph edge.
        const widths = words.map((word) => Math.ceil(word.getBoundingClientRect().width) + PX_GUARD);
        return { win, words, widths };
      });
      if (slots.some((slot) => slot === null)) return;
      const measured = slots as { win: HTMLElement; words: HTMLElement[]; widths: number[] }[];

      ctx = gsap.context(() => {
        // Take over from the CSS resting state: first word in view, the
        // rest parked just below the clip window; each window hugging its
        // first word.
        measured.forEach(({ win, words, widths }) => {
          if (prefersReducedMotion()) {
            // Reduced motion: static phrase, calm and fully readable — the
            // chip simply hugs its resting word.
            gsap.set(win, { width: widths[0] });
            return;
          }
          gsap.set(words, { opacity: 1 });
          gsap.set(words.slice(1), { yPercent: 120 });
          gsap.set(win, { width: widths[0] });
        });

        if (prefersReducedMotion()) return;

        const cycle = LEAD_IN + SLOTS[0].length * HOLD;

        // One master timeline: every position's every change is scheduled
        // at an absolute time, so the whole cycle is phase-locked and
        // repeats seamlessly. Within the cycle the positions must end
        // exactly where they began — which is why "holds" (the same word
        // twice in a row, e.g. the long Explorer runs) are skipped rather
        // than rolled: skipping leaves the visible element untouched, and
        // each pool's wrap transition is authored to return to word one.
        const master = gsap.timeline({ repeat: -1 });

        measured.forEach(({ win, words, widths }, k) => {
          const texts = SLOTS[k];
          let visible = 0;

          texts.forEach((_, i) => {
            const next = (i + 1) % texts.length;
            // A hold: the word carries over — nothing rolls, nothing moves.
            if (i !== texts.length - 1 && texts[next] === texts[visible]) return;

            const at = LEAD_IN + i * HOLD + k * OFFSET;
            const outgoing = words[visible];
            const incoming = words[next];
            const fromWidth = widths[visible];
            const toWidth = widths[next];

            master.to(outgoing, { yPercent: -120, duration: ROLL, ease: EASE.inOut }, at);
            master.fromTo(
              incoming,
              { yPercent: 120 },
              { yPercent: 0, duration: ROLL, ease: EASE.inOut, immediateRender: false },
              at + CASCADE,
            );

            const delta = Math.abs(toWidth - fromWidth);
            if (delta > 0.5) {
              const dur = widthDuration(delta);
              if (toWidth > fromWidth) {
                // Wider incoming: open the window first — it is already
                // large enough the moment the new word peeks in.
                master.to(win, { width: toWidth, duration: dur, ease: EASE.inOut }, at - (dur - 0.1));
              } else {
                // Narrower incoming: hold width until the wider word has
                // fully left, then settle around the new one.
                master.to(win, { width: toWidth, duration: dur, ease: EASE.inOut }, at + WIDTH_LAG);
              }
            }

            visible = next;
          });
        });

        // Pin the exact cycle length so skipped holds can never shorten
        // the timeline and drift the phases.
        master.set({}, {}, cycle);
      }, root);
    };

    const onResize = () => {
      if (window.innerWidth === baseWidth) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (cancelled || window.innerWidth === baseWidth) return;
        ctx?.revert();
        start();
      }, 240);
    };

    if (document.fonts.status === "loaded") start();
    else void document.fonts.ready.then(start);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      ctx?.revert();
    };
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
        <span className={`${styles.chip} ${styles.lead}`}>{LEAD}</span>
        {SLOTS.map((pool, s) => (
          <span className={styles.chip} key={s}>
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
