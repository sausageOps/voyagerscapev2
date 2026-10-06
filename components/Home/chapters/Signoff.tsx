"use client";

/* =========================================================================
   06 — VOYAGERSCAPE  ·  the final act
   -------------------------------------------------------------------------
   After six chapters of response, the page stops responding. Nothing here
   follows the pointer: the wordmark drifts a few per cent with the scroll,
   the lines arrive once, and then the composition simply holds. The
   contrast is the point — stillness only reads as stillness after motion.
   ========================================================================= */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion, setVar, useScene } from "../lib/engine";
import styles from "./Signoff.module.css";

const WORD = "VOYAGERSCAPE";

export default function Signoff() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const markRef = useRef<HTMLDivElement | null>(null);

  useScene(sectionRef, "through", (p) => {
    setVar(sectionRef.current, "--drift", (p - 0.5) * 2);
  });

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const letters = mark.querySelectorAll<HTMLElement>("[data-letter]");
    if (!letters.length || prefersReducedMotion()) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        gsap.fromTo(
          letters,
          { yPercent: 38, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.25,
            ease: "expo.out",
            stagger: 0.035,
            clearProps: "transform,opacity",
          },
        );
      },
      { threshold: 0.35 },
    );
    io.observe(mark);
    return () => io.disconnect();
  }, []);

  return (
    <section
      className={styles.chapter}
      id="voyagerscape"
      data-chapter-section="voyagerscape"
      aria-labelledby="signoff-title"
      ref={sectionRef}
    >
      <div className={styles.inner}>
        <span className={`${styles.index} vs-tech`}>06 — Voyagerscape</span>

        <h2 className={styles.mark} id="signoff-title" ref={markRef}>
          <span className="vs-sr-only">Voyagerscape</span>
          <span className={styles.markVisual} aria-hidden="true">
            {Array.from(WORD).map((letter, i) => (
              <span className={styles.letter} data-letter key={`${letter}-${i}`}>
                {letter}
              </span>
            ))}
          </span>
        </h2>

        <div className={styles.foot}>
          <p className={`${styles.disciplines} vs-tech`}>
            <span>Visuals</span>
            <i aria-hidden="true">/</i>
            <span>Ideas</span>
            <i aria-hidden="true">/</i>
            <span>Experiments</span>
          </p>

          <p className={styles.unfinished}>Kept deliberately unfinished.</p>

          <nav className={styles.ways} aria-label="Continue">
            <a className={styles.way} href="/art" data-cursor="link">
              <span>The art</span>
              <i aria-hidden="true">→</i>
            </a>
            <a className={styles.way} href="/connect" data-cursor="link">
              <span>Say something</span>
              <i aria-hidden="true">→</i>
            </a>
          </nav>
        </div>
      </div>
    </section>
  );
}
