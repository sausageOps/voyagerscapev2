"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, revealUp, prefersReducedMotion } from "@/lib/motion";
import WordBlocks, { type WordDef } from "@/components/primitives/WordBlocks";
import { mountRotation } from "@/lib/rotating-words";
import WarpTextLayer from "./WarpTextLayer";
import CoverLayer from "./CoverLayer";
import rot from "@/components/IdentityWords.module.css";
import GreetingPill from "./GreetingPill";
import MessageCTA from "./MessageCTA";
import RecorderPanel from "./RecorderPanel";
import styles from "./HomeConnect.module.css";

const GENERAL_EMAIL = "hello@voyagerscape";

/* =========================================================
   HERO VOCABULARY

   The same rotation the footer identity line runs (see
   lib/rotating-words.ts), promoted into the hero. Two rules:

   1. "Voyagerscape" is NOT in any list. It is a plain, fixed word in
      the middle of the run — no window, no rotation, no tween.
   2. Nothing is combined at runtime. The lead is an authored word that
      reads correctly in front of the fixed word, and the lower three
      positions share one index, so the trio always shows an authored
      set rather than three independent words.

   Every list is the same length, which is what the engine's
   phase-locked cycle requires.
   ========================================================= */

/* The lead and the trio advance on the same index, so entry i below is
   one authored state: a lead that means something in front of the fixed
   word, paired with a trio from the same world. Read the two arrays as
   columns of one table. */

/** Only states that carry the invitation. The prepositional readings
 *  (Inside / Beyond / Through / Around / Across) are deliberately
 *  absent: correct English, but too weak a message. */
const LEAD_WORDS: readonly string[] = [
  "Enter",       // 01  Explore · Observe · Create     — core identity
  "Explore",     // 02  Explore · Observe · Capture    — photography
  "Discover",    // 03  Discover · Notice · Create     — discovery
  "Experience",  // 04  Wander · Notice · Imagine      — curiosity
  "Explore",     // 05  Explore · Focus · Create       — attention
  "Visit",       // 06  Travel · Observe · Capture     — photography
  "Discover",    // 07  Discover · Imagine · Create    — imagination
  "Explore",     // 08  Explore · Frame · Capture      — visual storytelling
  "Welcome to",  // 09  Explore · Observe · Create     — core identity
  "Discover",    // 10  Seek · Discover · Create       — discovery
  "Experience",  // 11  Seek · Observe · Imagine       — curiosity
  "Explore",     // 12  Wander · Observe · Experiment  — experimentation
  "Visit",       // 13  Travel · Frame · Capture       — photographic
  "Explore",     // 14  Explore · Observe · Capture    — photography
  "Discover",    // 15  Discover · Observe · Build     — making
  "Experience",  // 16  Wander · Notice · Imagine      — curiosity
  "Explore",     // 17  Explore · Focus · Create       — attention
  "Visit",       // 18  Wander · Focus · Compose       — visual exploration
  "Explore",     // 19  Explore · Frame · Capture      — visual storytelling
  "Experience",  // 20  Journey · Observe · Compose    — story
  "Discover",    // 21  Discover · Imagine · Create    — imagination
  "Visit",       // 22  Travel · Observe · Capture     — photography
  "Enter",       // 23  Journey · Notice · Create      — movement
  "Discover",    // 24  Seek · Observe · Imagine       — curiosity
];

/**
 * Every trio is an authored progression — GO SOMEWHERE → NOTICE
 * SOMETHING → MAKE SOMETHING — never three synonyms picked apart.
 *
 * The eight core sets carry the brand and so appear twice in the cycle;
 * the eight variation sets appear once. No set ever follows itself, and
 * where a word repeats across two neighbouring states that position
 * simply holds while the others roll — the engine's existing behaviour.
 */
const LOWER_SETS: readonly (readonly [string, string, string])[] = [
  ["Explore", "Observe", "Create"],      // core
  ["Explore", "Observe", "Capture"],     // core
  ["Discover", "Notice", "Create"],
  ["Wander", "Notice", "Imagine"],       // core
  ["Explore", "Focus", "Create"],        // core
  ["Travel", "Observe", "Capture"],      // core
  ["Discover", "Imagine", "Create"],     // core
  ["Explore", "Frame", "Capture"],       // core
  ["Explore", "Observe", "Create"],      // core
  ["Seek", "Discover", "Create"],
  ["Seek", "Observe", "Imagine"],        // core
  ["Wander", "Observe", "Experiment"],
  ["Travel", "Frame", "Capture"],
  ["Explore", "Observe", "Capture"],     // core
  ["Discover", "Observe", "Build"],
  ["Wander", "Notice", "Imagine"],       // core
  ["Explore", "Focus", "Create"],        // core
  ["Wander", "Focus", "Compose"],
  ["Explore", "Frame", "Capture"],       // core
  ["Journey", "Observe", "Compose"],
  ["Discover", "Imagine", "Create"],     // core
  ["Travel", "Observe", "Capture"],      // core
  ["Journey", "Notice", "Create"],
  ["Seek", "Observe", "Imagine"],        // core
];

/** Window order must match DOM order: lead, then the trio. */
const HERO_SLOTS: readonly (readonly string[])[] = [
  LEAD_WORDS,
  LOWER_SETS.map((set) => set[0]),
  LOWER_SETS.map((set) => set[1]),
  LOWER_SETS.map((set) => set[2]),
];

/** Hero dwell — a touch quicker than the footer's 7.2s, still calm. */
const HERO_HOLD = 6;
const HERO_LEAD_IN = 1.2;
/** The lead changes first; the trio follows 1.6s later and rolls as one
 *  group, with the footer's own hairline cascade between its members so
 *  it reads as a single thought changing, not three counters. */
const HERO_OFFSETS = [0, 1.6, 1.72, 1.84];

/** The hero's accessible name. The rolling words are atmosphere, so AT
 *  gets one stable sentence (the footer line does exactly this). */
const HERO_SENTENCE = "Enter Voyagerscape. Explore, observe, create.";

/**
 * One rotating position, in the footer's exact geometry: a clip window
 * with a hidden in-flow sizer and one absolutely positioned word per
 * entry. Dropped inside an existing hero pill, so the pill's own
 * surface, colour, radius, padding and type scale are untouched — only
 * its contents roll.
 *
 * The window's line-height is the footer's 1.25 (a clip box tight to
 * 1.10 would shave the display face's ascenders), pulled back by half
 * the difference so the pill occupies exactly the height it always has.
 */
function rotatingSlot(words: readonly string[], warp = false) {
  return (
    <span
      className={rot.window}
      data-identity-window
      {...(warp ? { "data-warp-window": true } : {})}
      style={{ lineHeight: 1.25, marginBlock: "-0.075em" }}
    >
      <span className={rot.sizer} aria-hidden="true">
        {words[0]}
      </span>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={[rot.word, i > 0 ? rot.dormant : ""].filter(Boolean).join(" ")}
          data-identity-word
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/** Same five blocks, same shapes, same accents. Four now hold a rotating
 *  window; the middle one is the fixed word, exactly as before. */
const HERO_WORDS: WordDef[] = [
  {
    text: "lead",
    shape: "pill",
    round: true,
    /* De-pilled for the warp experiment: text only, no capsule. The two
       translucent backplates below are untouched. */
    block: false,
    accent: "lavender",
    node: rotatingSlot(HERO_SLOTS[0], true),
  },
  {
    text: "Voyagerscape",
    shape: "rounded",
    /* Backplate removed: the wordmark sits straight on Pattern Waves. */
    block: false,
    break: true,
    node: (
      <>
        <span data-warp-src>Voyagerscape</span>
        <span className={styles.tmBadge} aria-label="trademark">
          {/* Same warp pipeline as the wordmark: data-warp-src is all the
              layer needs — collect() picks the mark up as one more piece
              of the primary line, so it is rasterised into the SAME
              texture, sampled by the SAME shader and carried by the SAME
              pointer lens and refraction split. No second canvas, no
              second renderer, no shader change. If WebGL never hands
              over, this span is simply never hidden and the ™ stays
              exactly where CSS puts it. */}
          <span className={styles.tmMark} data-warp-src>
            ™
          </span>
        </span>
      </>
    ),
  },
  {
    text: "slot-explore",
    shape: "pill",
    round: true,
    block: false,
    accent: "cream",
    node: rotatingSlot(HERO_SLOTS[1], true),
  },
  {
    text: "slot-observe",
    shape: "rounded",
    /* The second backplate, removed with the first. */
    block: false,
    node: rotatingSlot(HERO_SLOTS[2], true),
  },
  {
    text: "slot-create",
    shape: "pill",
    round: true,
    block: false,
    accent: "pink",
    node: rotatingSlot(HERO_SLOTS[3], true),
  },
];

export default function HomeConnect() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLHeadingElement | null>(null);

  /* The hero rotation: the footer identity line's engine, driven over
     the hero's own pills. One root, so all four positions share a
     single phase-locked timeline and the trio can never desynchronise. */
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    return mountRotation(head, {
      slots: HERO_SLOTS,
      offsets: HERO_OFFSETS,
      hold: HERO_HOLD,
      leadIn: HERO_LEAD_IN,
    });
  }, []);

  /* Keep the say-hi row's left edge (styles.sayHi) exact, not approximate:
     `100vw`, which its CSS uses to reconstruct the hero's real width, counts
     the vertical scrollbar's track in most browsers, while every other
     width on the page (including the header's) does not. Measuring the gap
     here and exposing it as --vs-scrollbar-w is what lets that CSS land the
     row on the header's own gutter-from-viewport edge exactly. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const setScrollbarWidth = () => {
      root.style.setProperty(
        "--vs-scrollbar-w",
        `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`,
      );
    };
    setScrollbarWidth();
    window.addEventListener("resize", setScrollbarWidth);
    return () => window.removeEventListener("resize", setScrollbarWidth);
  }, []);

  /* Entry: coordinated timeline for hero elements */
  useEffect(() => {
    if (!loaded || !rootRef.current) return;
    const ctx = gsap.context(() => {
      revealUp("[data-hero-fade]", { delay: 0.12, stagger: 0.07, y: 12 });
      revealUp("[data-word-reveal]", { delay: 0.16, stagger: 0.03, y: 20 });
      gsap.fromTo(
        "[data-hero-cta]",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.5 },
      );
    }, rootRef);
    return () => ctx.revert();
  }, [loaded]);

  return (
    <div className={styles.hero} ref={rootRef}>
      {/* Frame-anchored greeting: independent of the inner hero column. */}
      <div className={styles.sayHi} data-hero-fade>
        <GreetingPill />
        <span className={styles.sayHiText}>{GENERAL_EMAIL}</span>
      </div>

      <div className={styles.inner}>
        {/* ---- Floating control, top-right ---- */}
        <div className={styles.controls} data-hero-cta>
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
            <MessageCTA open={recorderOpen} onOpen={() => setRecorderOpen(true)} />
          )}
        </div>

        <div className={styles.composition}>
          {/* Preserve the existing hero composition track. The Mac demo now
              lives in its About-page section below the archive monitor. */}
          <div className={styles.stage} aria-hidden="true" />

          {/* ---- Large centered headline underneath CRT (visually static) ---- */}
          <div className={styles.head}>
            <h1 className={styles.title} ref={headRef}>
              <span className="vs-sr-only">{HERO_SENTENCE}</span>
              {/* Decorative once it rolls; the sentence above is the
                  stable, announced version. display:contents keeps the
                  run the title's own flex child, so layout is unchanged. */}
              <span style={{ display: "contents" }} aria-hidden="true">
                <WordBlocks words={HERO_WORDS} reveal interactive={false} />
              </span>
            </h1>
            {/* React Bits WarpText over the main hero line. Renders no
                DOM of its own; it pins one OGL canvas inside .head. */}
            <WarpTextLayer targetRef={headRef} />
            {/* Additive only: an overlay above the warp canvas that
                tracks the Voyagerscape™ rect. The warp layer above is
                untouched and keeps rendering the glyphs. */}
            <CoverLayer targetRef={headRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
