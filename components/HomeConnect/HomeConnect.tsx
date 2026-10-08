"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, revealUp } from "@/lib/motion";
import GreetingPill from "./GreetingPill";
import MessageCTA from "./MessageCTA";
import RecorderPanel from "./RecorderPanel";
import styles from "./HomeConnect.module.css";

const GENERAL_EMAIL = "hello@voyagerscape";

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

  /* Entry: coordinated timeline for the greeting and contact control. */
  useEffect(() => {
    if (!loaded || !rootRef.current) return;
    const ctx = gsap.context(() => {
      revealUp("[data-hero-fade]", { delay: 0.12, stagger: 0.07, y: 12 });
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
        </div>
      </div>
    </div>
  );
}
