"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, revealUp, prefersReducedMotion } from "@/lib/motion";
import WordBlocks, { type WordDef } from "@/components/primitives/WordBlocks";
import HeroObject from "./HeroObject";
import GreetingPill from "./GreetingPill";
import MessageCTA from "./MessageCTA";
import RecorderPanel from "./RecorderPanel";
import styles from "./HomeConnect.module.css";

const GENERAL_EMAIL = "hello@voyagerscape";

/** Target identity statement: two connected horizontal rows under the CRT */
const HERO_WORDS: WordDef[] = [
  { text: "The", shape: "pill", round: true, accent: "lavender" },
  {
    text: "Voyagerscape",
    shape: "rounded",
    break: true,
    node: (
      <>
        Voyagerscape
        <span className={styles.tmBadge} aria-label="trademark">
          <svg
            viewBox="0 0 20 20"
            width="0.38em"
            height="0.38em"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8.75" />
            <text
              x="10"
              y="12.75"
              textAnchor="middle"
              fontSize="7.5"
              fontFamily="var(--font-mono), monospace"
              fontWeight="600"
              fill="currentColor"
              stroke="none"
              letterSpacing="-0.3"
            >
              TM
            </text>
          </svg>
        </span>
      </>
    ),
  },
  { text: "Explore", shape: "pill", round: true, accent: "cream" },
  { text: "Observe", shape: "rounded" },
  { text: "Create", shape: "pill", round: true, accent: "pink" },
];

export default function HomeConnect() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
        "[data-hero-device]",
        { opacity: 0, y: 22, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out", delay: 0.3 },
      );
      gsap.fromTo(
        "[data-hero-cta]",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.5 },
      );
    }, rootRef);
    return () => ctx.revert();
  }, [loaded]);

  const onShutter = useCallback(() => {
    if (recorder.recordingState === "recording") {
      void recorder.stop();
    } else if (recorder.hasClip) {
      recorder.preview();
    }
  }, [recorder]);

  return (
    <div className={styles.hero} ref={rootRef}>
      <div className={styles.inner}>
        {/* ---- Say Hi, top-left ---- */}
        <div className={styles.sayHi} data-hero-fade>
          <GreetingPill />
          <span className={styles.sayHiText}>{GENERAL_EMAIL}</span>
        </div>

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
          {/* ---- The object: optically centred in the upper hero area ---- */}
          <div className={styles.stage}>
            <div className={styles.objectWrap} data-hero-device>
              <HeroObject
                recordingState={recorder.recordingState}
                playbackState={recorder.playbackState}
                level={recorder.level}
                onShutter={onShutter}
              />
            </div>
          </div>

          {/* ---- Large centered headline underneath CRT (visually static) ---- */}
          <div className={styles.head}>
            <h1 className={styles.title}>
              <WordBlocks words={HERO_WORDS} reveal interactive={false} />
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
