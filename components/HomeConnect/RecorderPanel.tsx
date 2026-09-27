"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { formatTime } from "@/lib/use-recorder";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import AudioVisualizer from "./AudioVisualizer";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./RecorderPanel.module.css";

interface RecorderPanelProps {
  open: boolean;
  onClose: () => void;
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  elapsedMs: number;
  level: number;
  error: string | null;
  hasClip: boolean;
  supported: boolean;
  onStart: () => void;
  onStop: () => void;
  onPreview: () => void;
  onDiscard: () => void;
  onSubmit: () => void;
}

export default function RecorderPanel(props: RecorderPanelProps) {
  const {
    open,
    onClose,
    recordingState,
    playbackState,
    elapsedMs,
    level,
    error,
    hasClip,
    supported,
    onStart,
    onStop,
    onPreview,
    onDiscard,
    onSubmit,
  } = props;

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (prefersReducedMotion()) {
      gsap.set(panel, { opacity: open ? 1 : 0, y: 0, scale: 1 });
      return;
    }
    gsap.killTweensOf(panel);
    if (open) {
      gsap.fromTo(
        panel,
        { opacity: 0, y: 18, scale: 0.97, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "expo.out",
        },
      );
    } else {
      gsap.to(panel, { opacity: 0, y: 12, scale: 0.98, duration: 0.26, ease: "power2.in" });
    }
  }, [open]);

  useEffect(() => {
    if (open) firstActionRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const recording = recordingState === "recording";
  const busy = recordingState === "requesting" || recordingState === "processing";
  const sent = recordingState === "sent";

  const statusLine = (() => {
    switch (recordingState) {
      case "requesting":
        return "Requesting microphone…";
      case "recording":
        return "Recording — speak now";
      case "processing":
        return "Encoding clip";
      case "ready":
        return "Preview, then send";
      case "submitting":
        return "Transmitting";
      case "sent":
        return "Sent. Thank you";
      case "error":
        return "Error";
      default:
        return "Standby";
    }
  })();

  return (
    <div
      id="vs-recorder"
      className={styles.holder}
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <section
        ref={panelRef}
        className={`vs-glass vs-glass--solid ${styles.panel}`}
        role="dialog"
        aria-modal="false"
        aria-label="Leave a voice message"
      >
        <header className={styles.head}>
          <TechLabel>Voice Message</TechLabel>
          <div className={styles.headRight}>
            <TechLabel nano className={styles.timer}>
              {formatTime(elapsedMs)}
            </TechLabel>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Close voice message panel"
              tabIndex={open ? 0 : -1}
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.meter} data-state={recordingState}>
          <AudioVisualizer
            level={level}
            active={recording || playbackState === "playing"}
            label="Audio level"
          />
        </div>

        <p className={styles.status} aria-live="polite">
          {statusLine}
        </p>

        {!supported && (
          <p className={styles.note}>
            Voice capture is unsupported here — write to{" "}
            <a href="mailto:hello@voyagerscape.co">hello@voyagerscape.co</a>.
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {!hasClip && !error && supported && recordingState !== "sent" && (
          <p className={styles.note}>
            We ask for microphone access only while you record. Nothing is captured before you
            press record, and the clip stays on your device until you send it.
          </p>
        )}

        <div className={styles.actions}>
          {!hasClip && !sent && (
            <button
              ref={firstActionRef}
              type="button"
              className={styles.primary}
              onClick={recording ? onStop : onStart}
              disabled={busy || !supported}
              tabIndex={open ? 0 : -1}
              data-cursor="link"
            >
              <span className={styles.dot} data-live={recording ? "true" : "false"} />
              {recording ? "Stop" : busy ? "Wait" : "Record"}
            </button>
          )}

          {hasClip && !sent && (
            <>
              <button
                ref={firstActionRef}
                type="button"
                className={styles.secondary}
                onClick={onPreview}
                tabIndex={open ? 0 : -1}
              >
                {playbackState === "playing" ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={onDiscard}
                tabIndex={open ? 0 : -1}
              >
                Delete
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={onSubmit}
                disabled={recordingState === "submitting"}
                tabIndex={open ? 0 : -1}
              >
                {recordingState === "submitting" ? "Sending" : "Send"}
              </button>
            </>
          )}

          {sent && (
            <button
              ref={firstActionRef}
              type="button"
              className={styles.secondary}
              onClick={onDiscard}
              tabIndex={open ? 0 : -1}
            >
              Record another
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
