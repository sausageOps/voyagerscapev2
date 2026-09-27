"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageRecorder, isRecordingSupported } from "@/lib/audio/recorder";
import { useUI } from "@/lib/ui-store";

/** Binds the recorder service to React state, with guaranteed teardown. */
export function useRecorder() {
  const { recordingState, setRecordingState, audioPlaybackState, setPlaybackState } = useUI();
  const recorderRef = useRef<MessageRecorder | null>(null);
  const rafRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasClip, setHasClip] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isRecordingSupported());
    recorderRef.current = new MessageRecorder();
    return () => {
      cancelAnimationFrame(rafRef.current);
      recorderRef.current?.dispose();
      recorderRef.current = null;
    };
  }, []);

  const tick = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setElapsedMs(recorder.elapsedMs());
    setLevel(recorder.getLevel());
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setError(null);
    setRecordingState("requesting");
    try {
      await recorder.recordMessage();
      setHasClip(false);
      setRecordingState("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = err instanceof Error ? err.name || err.message : "ERROR";
      setError(
        name === "NotAllowedError"
          ? "Microphone permission denied. Enable it in your browser settings to leave a voice note."
          : name === "UNSUPPORTED_BROWSER"
            ? "This browser cannot record audio. Email us instead."
            : "We could not reach your microphone.",
      );
      setRecordingState("error");
    }
  }, [setRecordingState, tick]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    cancelAnimationFrame(rafRef.current);
    setLevel(0);
    setRecordingState("processing");
    try {
      await recorder.stopRecording();
      setHasClip(true);
      setRecordingState("ready");
    } catch {
      setRecordingState("error");
      setError("Recording could not be finalised.");
    }
  }, [setRecordingState]);

  const preview = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (audioPlaybackState === "playing") {
      recorder.pausePreview();
      setPlaybackState("paused");
      cancelAnimationFrame(rafRef.current);
      setLevel(0);
      return;
    }
    recorder.previewRecording(() => {
      setPlaybackState("stopped");
      cancelAnimationFrame(rafRef.current);
      setLevel(0);
    });
    setPlaybackState("playing");
    // Simulated output level: the element is not routed through an analyser
    // to avoid a second AudioContext on mobile Safari.
    const pulse = () => {
      setLevel(0.25 + Math.random() * 0.4);
      rafRef.current = requestAnimationFrame(pulse);
    };
    rafRef.current = requestAnimationFrame(pulse);
  }, [audioPlaybackState, setPlaybackState]);

  const discard = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.deleteRecording();
    setHasClip(false);
    setElapsedMs(0);
    setLevel(0);
    setError(null);
    setPlaybackState("stopped");
    setRecordingState("idle");
  }, [setPlaybackState, setRecordingState]);

  const submit = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setRecordingState("submitting");
    const result = await recorder.submitRecording();
    if (result.ok) {
      setRecordingState("sent");
    } else {
      setError("Message could not be sent. Please try again.");
      setRecordingState("error");
    }
  }, [setRecordingState]);

  return {
    recordingState,
    playbackState: audioPlaybackState,
    elapsedMs,
    level,
    error,
    hasClip,
    supported,
    start,
    stop,
    preview,
    discard,
    submit,
  };
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
