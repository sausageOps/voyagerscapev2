"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import CameraCanvas from "./CameraCanvas";
import { usePointerField } from "./motion/usePointerField";
import { createShutterSignal } from "./motion/shutterSignal";
import { resolveStatus, STATUS_TEXT } from "./status";
import styles from "./Camera3D.module.css";

export interface Camera3DProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  /** 0–1 live level. Unused in Stage 1 — the readout is abstract geometry. */
  level: number;
  onShutter: () => void;
  /** Rendered instead of the canvas if the GL context is lost at runtime. */
  fallback: React.ReactNode;
}

/**
 * VOYAGERSCAPE OBSERVATION DEVICE — 3D
 * ====================================
 *
 * Stage 1 prototype. The object is built entirely from Three.js primitives and
 * extruded profiles; nothing is loaded.
 *
 * This component is only the host. It reproduces the SVG hero's outer shell
 * exactly — the same `<button>`, the same `aria-label`, the same
 * `data-cursor` / `data-cursor-label` attributes, the same polite live region
 * — so the existing cursor contract, keyboard path and screen-reader output
 * are unchanged by the swap.
 *
 * CURSOR CONTRACT
 * ---------------
 * `Cursor.tsx` is untouched. It resolves its target with
 * `document.elementFromPoint(...).closest("[data-cursor], button, …")`, and
 * the canvas is a DOM descendant of the button — so hovering the 3D object
 * already walks up to this button and shows the "Look" label, including over
 * the part of the drawing surface that overhangs the button's own box.
 * Nothing about R3F's pointer handling changes that, because R3F's events
 * ride on the same DOM event the custom cursor is reading.
 *
 * SCROLL
 * ------
 * Not coupled to scroll. Out of scope, and `SmoothScroll.tsx` is untouched.
 */
export default function Camera3D({
  recordingState,
  playbackState,
  onShutter,
  fallback,
}: Camera3DProps) {
  const status = resolveStatus(recordingState, playbackState);
  /* A callback ref held in state, not a useRef: the visibility observer inside
     the canvas needs the node as a dependency, and a plain ref would still be
     null on the render that mounts the observer. */
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const captureTimer = useRef<number | null>(null);
  const mobileInteracting = useRef(false);

  const reducedMotion = prefersReducedMotion();

  useEffect(
    () => () => {
      if (captureTimer.current !== null) window.clearTimeout(captureTimer.current);
    },
    [],
  );

  /* Cursor position, sampled on the window rather than the canvas so the
     object reacts to the pointer approaching it, not just arriving on it.
     Disabled outright under reduced motion and on coarse pointers. */
  const pointer = usePointerField(container, !reducedMotion);

  /* Click -> shutter actuation. A ref, so a click does not re-render the
     scene to deliver one integer that only the render loop reads. */
  const shutter = useRef(createShutterSignal());

  const onContextLost = useCallback(() => setLost(true), []);

  /* A tap remains on the existing button/click capture path. These pointer
     handlers only tell the rig to settle its touch-only idle rotation, so a
     pointerdown followed by its synthetic click cannot fire twice. */
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
    shutter.current.seq += 1;
    setCapturing(true);

    if (captureTimer.current !== null) window.clearTimeout(captureTimer.current);
    captureTimer.current = window.setTimeout(
      () => {
        captureTimer.current = null;
        setCapturing(false);
      },
      reducedMotion ? 80 : 420,
    );

    // The existing signal remains the sole shutter/recoil trigger.
    onShutter();
  }, [onShutter, reducedMotion]);

  /* A lost context would leave a hole in the hero — drop to the SVG instead. */
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
        data-cursor-label="Look"
        aria-label="Observation device — press the shutter"
      >
        <div className={styles.canvas} ref={setContainer} aria-hidden="true">
          <div className={styles.gl}>
            <CameraCanvas
              status={status}
              capture={capturing}
              onContextLost={onContextLost}
              container={container}
              reducedMotion={reducedMotion}
              pointer={pointer}
              shutter={shutter}
              mobileInteracting={mobileInteracting}
            />
          </div>
        </div>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Device status: {capturing ? "Capturing" : STATUS_TEXT[status]}
      </span>
    </div>
  );
}
