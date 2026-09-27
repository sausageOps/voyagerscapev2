"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, revealUp, prefersReducedMotion } from "@/lib/motion";
import TechLabel from "@/components/primitives/TechLabel";
import WordBlocks, { type WordDef } from "@/components/primitives/WordBlocks";
import Camera from "./Camera";
import MessageCTA from "./MessageCTA";
import RecorderPanel from "./RecorderPanel";
import Directory from "./Directory";
import styles from "./HomeConnect.module.css";

const STUDIO_EMAIL = "studio@voyagerscape.co";

/** Oversized statement, set as word capsules like the reference. */
const HERO: WordDef[] = [
  { text: "Looking" },
  { text: "To" },
  { text: "Explore" },
  { text: "Your" },
  { text: "Next" },
  { text: "Idea?", break: true },
  { text: "Then" },
  { text: "Write" },
  { text: "Us" },
  { text: "At" },
  { text: STUDIO_EMAIL, accent: "pink", href: `mailto:${STUDIO_EMAIL}`, wide: true },
  {
    accent: "lavender",
    node: (
      <span className={styles.smiley} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9.2" strokeWidth="1.5" />
          <circle cx="8.8" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.2" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <path d="M8.2 14.4c1 1.3 2.3 1.9 3.8 1.9s2.8-.6 3.8-1.9" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    ),
  },
];

export default function HomeConnect() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* Entry: one short coordinated timeline — eyebrow, word blocks, address,
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

  /* Scroll: a small depth offset per layer. Driven by one rAF-throttled
     scroll listener writing through quickTo — no state updates. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const head = root.querySelector<HTMLElement>("[data-parallax='head']");
    const object = root.querySelector<HTMLElement>("[data-parallax='object']");
    const cards = root.querySelector<HTMLElement>("[data-parallax='cards']");
    if (!head || !object || !cards) return;

    const setters = [
      { el: head, factor: -0.05, to: gsap.quickTo(head, "y", { duration: 0.5, ease: "power2.out" }) },
      { el: object, factor: 0.075, to: gsap.quickTo(object, "y", { duration: 0.5, ease: "power2.out" }) },
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
          <TechLabel className={styles.eyebrow} data-hero-fade>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            <span className={styles.eyebrowFull}>Voyagerscape — transmission desk</span>
            <span className={styles.eyebrowShort}>Transmission desk</span>
          </TechLabel>

          <h1 className={styles.title}>
            <WordBlocks words={HERO} reveal interactive />
          </h1>
        </div>

        {/* ---- The object: optically centred in the composition ---- */}
        <div className={styles.stage}>
          <div className={styles.objectWrap} data-hero-device>
            <div data-parallax="object">
            <Camera
              recordingState={recorder.recordingState}
              playbackState={recorder.playbackState}
              level={recorder.level}
              onShutter={onShutter}
            />
            </div>
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
