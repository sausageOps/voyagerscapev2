"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import CrtCanvas from "./CrtCanvas";
import { usePointerField } from "./motion/usePointerField";
import { createChannelSignal } from "./motion/channelSignal";
import { resolveStatus, STATUS_TEXT } from "./status";
import styles from "./Crt3D.module.css";

export interface Crt3DProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  /** 0–1 live level. Not consumed: the tube runs the archive programmes. */
  level: number;
  onShutter: () => void;
  /** Rendered instead of the canvas if the GL context is lost at runtime. */
  fallback: React.ReactNode;
}

/**
 * VOYAGERSCAPE ARCHIVE MONITOR — 3D
 * =================================
 *
 * A late-1990s desktop CRT, built entirely from Three.js primitives and
 * lofted profiles; nothing is loaded.
 *
 * This component is only the host. It reproduces the hero's outer shell
 * exactly — the same `<button>`, the same `data-cursor` /
 * `data-cursor-label` attributes, the same polite live region — so the
 * existing cursor contract, keyboard path and screen-reader output are
 * unchanged by the swap of object.
 *
 * CURSOR CONTRACT
 * ---------------
 * `Cursor.tsx` is untouched. It resolves its target with
 * `document.elementFromPoint(...).closest("[data-cursor], button, …")`, and
 * the canvas is a DOM descendant of this button — so hovering the monitor
 * already walks up to the button and shows its label, including over the
 * part of the drawing surface that overhangs the button's own box. R3F's
 * events ride on the same DOM event the custom cursor is reading, so
 * nothing about the 3D layer changes that.
 *
 * INTERACTION
 * -----------
 * One action: change channel. Click, tap, Enter or Space all increment the
 * same counter, and the render loop turns that into a sync disturbance and
 * the next archive programme. The `onShutter` callback the hero already
 * passes in is still called, so the recorder behaviour the rest of the page
 * depends on is preserved.
 *
 * SCROLL
 * ------
 * Not coupled to scroll. `SmoothScroll.tsx` is untouched, nothing here
 * reads `window.scrollY`, and the object is in normal document flow.
 */
export default function Crt3D({
  recordingState,
  playbackState,
  onShutter,
  fallback,
}: Crt3DProps) {
  const status = resolveStatus(recordingState, playbackState);
  /* A callback ref held in state, not a useRef: the visibility observer
     inside the canvas needs the node as a dependency, and a plain ref would
     still be null on the render that mounts the observer. */
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [label, setLabel] = useState("SAN ANIKREAS");
  const pressTimer = useRef<number | null>(null);
  const mobileInteracting = useRef(false);

  const reducedMotion = prefersReducedMotion();

  useEffect(
    () => () => {
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    },
    [],
  );

  /* Cursor position, sampled on the window rather than the canvas so the
     object reacts to the pointer approaching it, not just arriving on it.
     Disabled outright under reduced motion and on coarse pointers. */
  const pointer = usePointerField(container, !reducedMotion);

  /* Click -> channel change. A ref, so a click does not re-render the scene
     to deliver one integer that only the render loop reads. */
  const channel = useRef(createChannelSignal());

  const onContextLost = useCallback(() => setLost(true), []);



  /* A tap stays on the existing button/click path. These pointer handlers
     only tell the rig to settle its touch-only drift, so a pointerdown
     followed by its synthetic click cannot fire the channel twice. */
  const onMobilePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      mobileInteracting.current = true;
    }
  }, []);
  const onMobilePointerEnd = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      mobileInteracting.current = false;
    }
  }, []);

  const onClick = useCallback(() => {
    channel.current.seq += 1;
    setPressed(true);

    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(
      () => {
        pressTimer.current = null;
        setPressed(false);
      },
      reducedMotion ? 90 : 190,
    );

    // The existing hero signal remains untouched.
    onShutter();
  }, [onShutter, reducedMotion]);

  /* A lost context would leave a hole in the hero — drop to the static
     fallback instead. */
  if (lost) return <>{fallback}</>;

  return (
    <div className={styles.stage} data-status={status}>
      <button
        type="button"
        className={styles.hit}
        onClick={onClick}
        onPointerDown={onMobilePointerDown}
        onPointerUp={onMobilePointerEnd}
        onPointerCancel={onMobilePointerEnd}
        onLostPointerCapture={onMobilePointerEnd}
        data-cursor="camera"
        data-cursor-label="Switch"
        aria-label="Archive monitor — change channel"
      >
        <div className={styles.canvas} ref={setContainer} aria-hidden="true">
          <div className={styles.gl}>
            <CrtCanvas
              status={status}
              pressed={pressed}
              onContextLost={onContextLost}
              container={container}
              reducedMotion={reducedMotion}
              pointer={pointer}
              channel={channel}
              mobileInteracting={mobileInteracting}
              onLabel={setLabel}
            />
          </div>
        </div>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Archive monitor. Now showing: {label}. Device status: {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
