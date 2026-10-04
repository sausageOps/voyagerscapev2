"use client";

import { gsap, EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * ROTATING WORDS — the footer identity line's engine, made callable.
 * ==================================================================
 *
 * This is the existing `IdentityWords` rotation, lifted out of that
 * component unchanged so a second surface can drive it. Nothing about
 * the behaviour was redesigned: same clip windows, same roll, same
 * easing, same width choreography, same defaults. `IdentityWords` now
 * calls this with the constants it always used, so the footer renders
 * and animates exactly as before.
 *
 * THE CONTRACT
 * ------------
 * Markup is the caller's: each rotating position is an element carrying
 * `data-identity-window` (relative, overflow hidden, width owned here),
 * containing a hidden in-flow sizer and one absolutely positioned
 * `data-identity-word` per entry in that position's word list. Windows
 * are matched to `slots` in DOM order.
 *
 * All slots must hold the same number of words: the master timeline is
 * phase-locked to one cycle length, and a short slot would drift.
 */

export interface RotationConfig {
  /** One word list per rotating position, all of equal length. */
  slots: readonly (readonly string[])[];
  /** Per-position phase offset in seconds — the stagger. */
  offsets: readonly number[];
  /** How long a position rests on a word. */
  hold?: number;
  /** A beat of calm before the first change — never change on arrival. */
  leadIn?: number;
  /** Travel time of a single word's roll. */
  roll?: number;
  /** The incoming word trails the outgoing one by a beat. */
  cascade?: number;
  /** Shrinks lag the roll: the wider word must leave before closing. */
  widthLag?: number;
}

/* The footer's values. They are the defaults so that component's call
   site stays a pure description of its vocabulary. */
const HOLD = 7.2;
const LEAD_IN = 0.6;
const ROLL = 0.5;
const CASCADE = 0.06;
const WIDTH_LAG = 0.4;

/** Sub-pixel guard: a window must never round down to a hair less than
 *  its word. */
const PX_GUARD = 1;

/** Travel time of a window's width, scaled by the size of the hop so a
 *  large resize (AI → Photography & Art) never whips. Growth always
 *  completes at at + 0.1s, before the incoming word peeks into view. */
const widthDuration = (delta: number) => gsap.utils.clamp(0.32, 0.26 + delta * 0.01, 0.6);

/**
 * Starts the rotation inside `root` and returns a teardown function.
 * Handles font readiness and width-only resizes exactly as the footer
 * always has.
 */
export function mountRotation(root: HTMLElement, config: RotationConfig): () => void {
  const {
    slots: SLOTS,
    offsets: OFFSETS,
    hold = HOLD,
    leadIn = LEAD_IN,
    roll = ROLL,
    cascade = CASCADE,
    widthLag = WIDTH_LAG,
  } = config;

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
      if (!SLOTS[i] || words.length !== SLOTS[i].length) return null;
      // Natural width of every word, as actually rendered — measured in
      // place, ceil + guard so the window can never shave a glyph edge.
      const widths = words.map((word) => Math.ceil(word.getBoundingClientRect().width) + PX_GUARD);
      return { win, words, widths };
    });
    if (slots.length !== SLOTS.length || slots.some((slot) => slot === null)) return;
    const measured = slots as { win: HTMLElement; words: HTMLElement[]; widths: number[] }[];

    ctx = gsap.context(() => {
      // Take over from the CSS resting state: first word in view, the
      // rest parked just below the clip window; each window hugging its
      // first word.
      measured.forEach(({ win, words, widths }) => {
        if (prefersReducedMotion()) {
          // Reduced motion: one stable, grammatical phrase, calm and
          // fully readable — each chip hugs its resting word.
          gsap.set(win, { width: widths[0] });
          return;
        }
        gsap.set(words, { opacity: 1 });
        gsap.set(words.slice(1), { yPercent: 120 });
        gsap.set(win, { width: widths[0] });
      });

      if (prefersReducedMotion()) return;

      const cycle = leadIn + SLOTS[0].length * hold;

      // One master timeline: every position's every change is scheduled
      // at an absolute time, so the whole cycle is phase-locked and
      // repeats seamlessly. Within the cycle the positions must end
      // exactly where they began — which is why two equality cases are
      // handled specially: a mid-cycle "hold" (the same word twice in a
      // row) is skipped, and an equal-text wrap (Explorer → Explorer)
      // teleports the elements instantly — invisible, since the text
      // and therefore the rendering are identical — restoring the
      // initial element state that the next loop expects.
      const master = gsap.timeline({ repeat: -1 });

      measured.forEach(({ win, words, widths }, k) => {
        const texts = SLOTS[k];
        let visible = 0;

        texts.forEach((_, i) => {
          const next = (i + 1) % texts.length;
          const outgoing = words[visible];
          const incoming = words[next];
          const at = leadIn + i * hold + (OFFSETS[k] ?? 0);

          // A hold: the word carries over — nothing rolls, nothing moves.
          if (texts[next] === texts[visible]) {
            if (i === texts.length - 1) {
              // Equal-text wrap: swap the identical words in place so the
              // cycle ends on element one, ready for the next loop.
              master.set(outgoing, { yPercent: 120 }, at);
              master.set(incoming, { yPercent: 0 }, at);
              visible = next;
            }
            return;
          }

          const fromWidth = widths[visible];
          const toWidth = widths[next];

          master.to(outgoing, { yPercent: -120, duration: roll, ease: EASE.inOut }, at);
          master.fromTo(
            incoming,
            { yPercent: 120 },
            { yPercent: 0, duration: roll, ease: EASE.inOut, immediateRender: false },
            at + cascade,
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
              master.to(win, { width: toWidth, duration: dur, ease: EASE.inOut }, at + widthLag);
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
}
