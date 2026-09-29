"use client";

import { useCallback, useState } from "react";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import CameraCanvas from "./CameraCanvas";
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
 * WHAT STAGE 1 DELIBERATELY DOES NOT DO
 * -------------------------------------
 * No cursor-follow physics, no lens parallax, no focus-ring travel, no
 * aperture animation, no shutter timeline, no scroll coupling. `onShutter` is
 * still wired to the button so the recorder contract keeps working, but it
 * triggers no 3D motion. Those are Stages 3–5.
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

  const onContextLost = useCallback(() => setLost(true), []);

  /* A lost context would leave a hole in the hero — drop to the SVG instead. */
  if (lost) return <>{fallback}</>;

  return (
    <div className={styles.stage} data-status={status}>
      <button
        type="button"
        className={styles.hit}
        onClick={onShutter}
        data-cursor="camera"
        data-cursor-label="Look"
        aria-label="Observation device — press the shutter"
      >
        <div className={styles.canvas} ref={setContainer} aria-hidden="true">
          <CameraCanvas
            status={status}
            onContextLost={onContextLost}
            container={container}
            reducedMotion={prefersReducedMotion()}
          />
        </div>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Device status: {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
