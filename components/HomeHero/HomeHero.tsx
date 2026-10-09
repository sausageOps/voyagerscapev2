"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import GreetingPill from "@/components/HomeConnect/GreetingPill";
import MessageCTA from "@/components/HomeConnect/MessageCTA";
import RecorderPanel from "@/components/HomeConnect/RecorderPanel";
import styles from "./HomeHero.module.css";

const GENERAL_EMAIL = "hello@voyagerscape";

/**
 * HOMEPAGE HERO — Stage 1 of the editorial homepage rebuild.
 *
 * A full-bleed masthead composition inside the existing homepage frame
 * (HomeCanvas owns the frame; nothing here touches the shell):
 *
 *   FIELD ARCHIVE — 01            PHOTOGRAPHY / EXPLORATION / OBSERVATION
 *   ┌ VOYAGERSCAPE ─────────── oversized display run, cut by the frame ┐
 *   Photographs from                              photographic plate,
 *   the long way round.                          bleeding off the right
 *                                                edge, crossed by the run
 *   [say hi] [leave a message]                    ↓ scroll
 *
 * Composition principles (ToyFight-studied, Voyagerscape-authored):
 *   • one oversized statement that participates in the space — sized from
 *     the real glyph advances of Handjet 900 so it fills the frame exactly
 *     and is deliberately clipped ~2% on each side by the frame edge;
 *   • the photographic plate is a composition element, not a card: it
 *     bleeds off the right edge and the display run crosses over it;
 *   • large negative space, controlled asymmetry (statement tucked
 *     lower-left, metadata hung from the top edge);
 *   • a small number of physically-connected motions, one timeline.
 *
 * Typography, palette, glass, frame, nav, terminal and footer are all
 * existing system surfaces — consumed, not reinvented.
 */

const BRAND_LINE_1 = "VOYAGER".split("");
const BRAND_LINE_2 = "SCAPE".split("");

function BrandChars({ chars, start }: { chars: string[]; start: number }) {
  return (
    <>
      {chars.map((c, i) => (
        <span className={styles.char} data-brand-char key={`${start + i}-${c}`}>
          {c}
        </span>
      ))}
    </>
  );
}

export default function HomeHero() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLElement | null>(null);

  /* One entrance timeline: metadata → masthead characters (masked rise,
     slight spatial offset per character) → plate wipe + inner scale →
     statement → contact dock. Gated on the loader's `loaded` flag so the
     composition assembles as the tile curtain clears. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !loaded) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-brand-char]", { yPercent: 0, x: 0, opacity: 1 });
        gsap.set("[data-hero-plate]", { clipPath: "inset(0 0 0% 0)" });
        gsap.set("[data-hero-plate] img", { scale: 1 });
        gsap.set(
          "[data-hero-meta], [data-hero-statement], [data-hero-dock], [data-hero-cue]",
          { opacity: 1, y: 0 },
        );
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.fromTo(
        "[data-hero-meta]",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 },
        0.05,
      );

      tl.fromTo(
        "[data-brand-char]",
        {
          yPercent: 112,
          x: (i: number) => (i % 2 ? 12 : -12),
          opacity: 0,
        },
        {
          yPercent: 0,
          x: 0,
          opacity: 1,
          duration: 1.05,
          stagger: 0.032,
        },
        0.16,
      );

      tl.fromTo(
        "[data-hero-plate]",
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", duration: 1.15 },
        0.4,
      );
      tl.fromTo(
        "[data-hero-plate] img",
        { scale: 1.12 },
        { scale: 1, duration: 1.45 },
        0.4,
      );

      tl.fromTo(
        "[data-hero-statement]",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.9 },
        0.62,
      );

      tl.fromTo(
        "[data-hero-dock]",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.7 },
        0.78,
      );

      tl.fromTo(
        "[data-hero-cue]",
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        0.9,
      );
    }, root);

    return () => ctx.revert();
  }, [loaded]);

  return (
    <section className={styles.stage} ref={rootRef} aria-label="Voyagerscape">
      <div className={styles.metaTop}>
        <p className={`vs-tech ${styles.meta}`} data-hero-meta>
          Field Archive — 01
        </p>
        <p className={`vs-tech ${styles.meta}`} data-hero-meta>
          Photography / Exploration / Observation
        </p>
      </div>

      <div className={styles.composition}>
        <h1 className={styles.masthead}>
          <span className="vs-sr-only">Voyagerscape</span>
          <span className={styles.mastheadClip} aria-hidden="true">
            <span className={styles.mastheadInner}>
              {/* Two rigid groups: one continuous run on desktop,
                  deliberately stacked on mobile. */}
              <span className={styles.brandLine}>
                <BrandChars chars={BRAND_LINE_1} start={0} />
              </span>
              <span className={styles.brandLine}>
                <BrandChars chars={BRAND_LINE_2} start={BRAND_LINE_1.length} />
              </span>
            </span>
          </span>
        </h1>

        <figure className={styles.plate} data-hero-plate>
          <img
            src="/home/hero-plate.jpg"
            alt="A lone photographer standing on a black-sand shore, facing misted mountains across still water."
            draggable={false}
          />
        </figure>

        <p className={styles.statement} data-hero-statement>
          Photographs from
          <br />
          the long way round.
        </p>
      </div>

      {/* Contact dock — the existing Say-hi greeting and voice-message
          recorder, kept and quiet, corner-anchored as before. */}
      <div className={styles.dock} data-hero-dock>
        {recorderOpen ? (
          <div className={styles.panelFloat}>
            <RecorderPanel
              open={recorderOpen}
              onClose={() => {
                setRecorderOpen(false);
                if (recorder.recordingState === "recording") void recorder.stop();
              }}
              recordingState={recorder.recordingState}
              playbackState={recorder.playbackState}
              elapsedMs={recorder.elapsedMs}
              level={recorder.level}
              error={recorder.error}
              hasClip={recorder.hasClip}
              supported={recorder.supported}
              onStart={recorder.start}
              onStop={recorder.stop}
              onPreview={recorder.preview}
              onDiscard={recorder.discard}
              onSubmit={recorder.submit}
            />
          </div>
        ) : (
          <div className={styles.dockCta}>
            <MessageCTA open={recorderOpen} onOpen={() => setRecorderOpen(true)} />
          </div>
        )}
        <div className={styles.sayHi}>
          <GreetingPill />
          <span className={styles.sayHiText}>{GENERAL_EMAIL}</span>
        </div>
      </div>

      <p className={`vs-tech ${styles.scrollCue}`} data-hero-cue aria-hidden="true">
        Scroll ↓
      </p>
    </section>
  );
}
