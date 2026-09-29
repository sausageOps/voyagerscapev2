"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion";
import styles from "./GreetingPill.module.css";

/**
 * Rotating greeting pill — the "say hi" companion to the static general
 * enquiries address. The greetings are absolutely positioned and centred
 * geometrically inside one clip window whose width is tweened to the active
 * greeting — text width plus its consistent horizontal padding, no fixed or
 * minimum width. The words' layout never depends on the animated width or on
 * each other (that independence is what keeps every glyph inside the pill).
 *
 * The pill is decorative micro-interaction content: it is hidden from
 * assistive tech so a screen reader never announces the changing greetings —
 * the address beside it carries the meaning.
 */

interface Greeting {
  text: string;
  /** Language tag: lets the browser pick the correct script font (Chinese /
   * Japanese / Korean share Han code points but not glyph variants). */
  lang?: string;
  /** Cursive and conjunct scripts (Arabic, Devanagari) must not be
   * letter-spaced — tracking breaks joining and shaping. Latin, Cyrillic and
   * CJK keep the pill's tracking. */
  tracked?: boolean;
}

const GREETINGS: Greeting[] = [
  { text: "Hello" },
  { text: "Namaste" },
  { text: "Bonjour" },
  { text: "Hola" },
  { text: "Ciao" },
  { text: "Hallo" },
  { text: "你好", lang: "zh" },
  { text: "こんにちは", lang: "ja" },
  { text: "안녕하세요", lang: "ko" },
  { text: "नमस्ते", lang: "hi", tracked: false },
  { text: "مرحبا", lang: "ar", tracked: false },
  { text: "Olá" },
  { text: "Hej" },
  { text: "Salut" },
  { text: "Cześć", lang: "pl" },
  { text: "Привет", lang: "ru" },
];

/** How long each greeting rests fully in view. */
const HOLD = 2.4;
/** Travel time of the roll itself. */
const ROLL = 0.5;
/** The incoming word trails the outgoing one by a beat. */
const CASCADE = 0.06;
/** Cadence from one roll to the next. */
const STEP = HOLD + ROLL + CASCADE;
/** Travel time of the pill's width — scaled by the size of the hop so a
 *  large resize never whips. Growth always completes at at + 0.1s, before
 *  the incoming word first peeks into the window at ≈ at + 0.2s. */
const widthDuration = (delta: number) => gsap.utils.clamp(0.32, 0.26 + delta * 0.01, 0.6);
/** Shrink lags the roll: the wider outgoing word has fully left the window
 *  at ≈ at + 0.36s, so the window may only start closing after this. */
const WIDTH_LAG = 0.4;
/** Sub-pixel guard: the window must never round down to a hair less than its
 *  text — especially scripts with no trailing letter-spacing to spare. */
const PX_GUARD = 1;

export default function GreetingPill({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let cancelled = false;
    let ctx: gsap.Context | undefined;

    /* The pill's width must follow the rendered text, so measure only once
       the self-hosted fonts have resolved — by hydration next/font has
       normally already settled this. */
    const start = () => {
      if (cancelled) return;
      const track = root.querySelector<HTMLElement>("[data-greeting-track]");
      const words = Array.from(root.querySelectorAll<HTMLElement>("[data-greeting]"));
      if (!track || words.length < 2) return;

      // Natural width of every greeting, as actually rendered — measured in
      // place, in the same computed font stack, size, casing and tracking the
      // word is shown in (no proxy element, no character-count estimates).
      // ceil + 1px guards against device-pixel rounding so the window can
      // never shave a glyph edge at rest.
      const widths = words.map((word) => Math.ceil(word.getBoundingClientRect().width) + PX_GUARD);

      ctx = gsap.context(() => {
        if (prefersReducedMotion()) {
          // Static: the pill simply hugs the visible greeting.
          gsap.set(track, { width: widths[0] });
          return;
        }

        // Take over from the CSS resting state: first word in view, the rest
        // parked just below the clip window.
        gsap.set(words, { opacity: 1 });
        gsap.set(words.slice(1), { yPercent: 120 });
        gsap.set(track, { width: widths[0] });

        // One seamless loop: each word rolls up out of the window while the
        // next follows it in from below. The window's width travels with the
        // roll — opening before the incoming word peeks in, settling once a
        // wider word has left — so no visible word is ever clipped by the
        // window. One cohesive motion, never a snap.
        const roll = gsap.timeline({ repeat: -1 });
        words.forEach((word, i) => {
          const next = words[(i + 1) % words.length];
          const at = (i + 1) * STEP;
          roll.to(word, { yPercent: -120, duration: ROLL, ease: EASE.inOut }, at);
          roll.fromTo(
            next,
            { yPercent: 120 },
            {
              yPercent: 0,
              duration: ROLL,
              ease: EASE.inOut,
              immediateRender: false,
            },
            at + CASCADE,
          );

          const fromWidth = widths[i];
          const toWidth = widths[(i + 1) % words.length];
          const delta = Math.abs(toWidth - fromWidth);
          // Equal widths (e.g. こんにちは → 안녕하세요): nothing to resize.
          if (delta <= 0.5) return;
          const dur = widthDuration(delta);
          if (toWidth > fromWidth) {
            // Wider incoming: open the window first — the tween finishes at
            // at + 0.1s, so the window is already large enough the moment
            // the new word peeks in from below.
            roll.to(track, { width: toWidth, duration: dur, ease: EASE.inOut }, at - (dur - 0.1));
          } else {
            // Narrower incoming: hold the current width until the wider word
            // has fully left the window, then settle around the new one.
            roll.to(track, { width: toWidth, duration: dur, ease: EASE.inOut }, at + WIDTH_LAG);
          }
        });
      }, root);
    };

    if (document.fonts.status === "loaded") start();
    else void document.fonts.ready.then(start);

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <span
      className={[styles.pill, className].filter(Boolean).join(" ")}
      ref={ref}
      aria-hidden="true"
    >
      <span className={styles.track} data-greeting-track>
        {/* Invisible in-flow sizer: sizes the window naturally before
            hydration (and without JS) to the first greeting, and holds the
            window's constant height. Never a [data-greeting], so it is not
            part of the roll or the measurement. */}
        <span className={styles.sizer} aria-hidden="true">
          {GREETINGS[0].text}
        </span>
        {GREETINGS.map((greeting, i) => (
          <span
            key={greeting.text}
            className={[
              styles.greeting,
              greeting.tracked === false ? styles.noTrack : "",
              i > 0 ? styles.dormant : "",
            ]
              .filter(Boolean)
              .join(" ")}
            lang={greeting.lang}
            data-greeting
          >
            {greeting.text}
          </span>
        ))}
      </span>
    </span>
  );
}
