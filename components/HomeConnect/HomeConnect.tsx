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
import Directory from "./Directory";
import styles from "./HomeConnect.module.css";

const GENERAL_EMAIL = "hello@voyagerscape";

/**
 * Oversized statement, set as word capsules like the reference.
 *
 * The identity line, one word per line: the article opens, the name carries
 * the ™, and the three practice verbs hold the middle. "The" and "Create"
 * stay the soft pastel pills; the name and verbs sit in the ash-black
 * translucent glass, which floats them over the composition while keeping
 * the CRT visible through the material wherever the two meet.
 */
const HERO: WordDef[] = [
  { text: "The", accent: "pink", break: true },
  {
    text: "Voyagerscape",
    accent: "glass",
    node: (
      <>
        Voyagerscape
        {/* The trademark is a quiet legal detail, not a word: small, raised
            and secondary, never read aloud. */}
        <span className={styles.tm} aria-hidden="true">
          ™
        </span>
      </>
    ),
    break: true,
  },
  { text: "Explore", accent: "glass", break: true },
  { text: "Observe", accent: "glass", break: true },
  { text: "Create", accent: "lavender" },
];

export default function HomeConnect() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* Entry: one short coordinated timeline — say-hi row, word blocks, address,
     object, control, cards — rather than several competing delays. */
  useEffect(() => {
    if (!loaded || !rootRef.current) return;
    const ctx = gsap.context(() => {
      revealUp("[data-hero-fade]", { delay: 0.12, stagger: 0.07, y: 12 });
      revealUp("[data-word-reveal]", { delay: 0.16, stagger: 0.026, y: 20 });
      gsap.fromTo(
        "[data-hero-address]",
        { opacity: 0, y: 14, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", delay: 0.44 },
      );
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

  /* Keep the existing depth offset on the surrounding hero content, but do
     not apply document-scroll motion to the camera host. The rig owns only
     cursor, inertia, idle, depth and shutter motion; its world transform must
     stay independent of the document's scroll position. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const head = root.querySelector<HTMLElement>("[data-parallax='head']");
    const cards = root.querySelector<HTMLElement>("[data-parallax='cards']");
    if (!head || !cards) return;

    const setters = [
      { el: head, factor: -0.05, to: gsap.quickTo(head, "y", { duration: 0.5, ease: "power2.out" }) },
      { el: cards, factor: -0.03, to: gsap.quickTo(cards, "y", { duration: 0.5, ease: "power2.out" }) },
    ];

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      // capped so the effect never becomes a slide
      setters.forEach((s) => s.to(gsap.utils.clamp(-60, 60, y * s.factor)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      setters.forEach((s) => gsap.set(s.el, { clearProps: "transform" }));
    };
  }, [loaded]);

  /* The shutter is a playful physical action: it advances the indicator and,
     while a clip exists, scrubs playback. It never opens a gallery. */
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
        {/* ---- Statement, upper-left ---- */}
        <div className={styles.head} data-parallax="head">
          {/* Say hi: the rotating greeting pill beside the static general
              enquiries address, in the slot the transmission desk label held. */}
          <div className={styles.sayHi} data-hero-fade>
            <GreetingPill />
            {/* Deliberately plain text: the greeting pill is the only live
                element in this row. */}
            <span className={styles.sayHiText}>{GENERAL_EMAIL}</span>
          </div>

          <h1 className={styles.title}>
            <WordBlocks words={HERO} reveal interactive />
          </h1>
        </div>

        {/* ---- The object: optically centred in the composition ---- */}
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

        {/* ---- Floating control, upper-right on desktop ---- */}
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

        {/* ---- Small floating information cards at the lower corners ---- */}
        <Directory ready={loaded} />
      </div>
    </div>
  );
}
