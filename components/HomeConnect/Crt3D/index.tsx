"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import CrtCanvas from "./CrtCanvas";
import { usePointerField } from "@/components/HomeConnect/Camera3D/motion/usePointerField";
import { SCREEN_STATES } from "./proportions";
import styles from "./Crt3D.module.css";

export interface Crt3DProps {
  /** Rendered instead of the canvas if the GL context is lost at runtime. */
  fallback: React.ReactNode;
}

/**
 * VOYAGERSCAPE CRT — 3D host
 * ==========================
 *
 * THROWAWAY VISUAL EXPERIMENT. A large physical visual terminal built entirely
 * from Three.js primitives and extruded profiles — nothing is loaded.
 *
 * This component is only the host. It reproduces the camera hero's outer shell
 * contract exactly — a real `<button>`, a `data-cursor` label, a polite live
 * region — so the existing custom cursor, keyboard path and screen-reader
 * output work unchanged. Clicking (or tapping) advances the terminal's screen
 * state and physically actuates a control.
 */
export default function Crt3D({ fallback }: Crt3DProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);
  const [stateIndex, setStateIndex] = useState(0);
  const clickSeq = useRef(0);
  const mobileInteracting = useRef(false);

  const reducedMotion = prefersReducedMotion();
  const pointer = usePointerField(container, !reducedMotion);

  const onContextLost = useCallback(() => setLost(true), []);

  const onMobilePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") mobileInteracting.current = true;
  }, []);
  const onMobilePointerEnd = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") mobileInteracting.current = false;
  }, []);

  const onClick = useCallback(() => {
    clickSeq.current += 1;
    setStateIndex((i) => (i + 1) % SCREEN_STATES.length);
  }, []);

  if (lost) return <>{fallback}</>;

  const current = SCREEN_STATES[stateIndex % SCREEN_STATES.length];

  return (
    <div className={styles.stage}>
      <button
        type="button"
        className={styles.hit}
        onClick={onClick}
        onPointerDown={onMobilePointerDown}
        onPointerUp={onMobilePointerEnd}
        onPointerCancel={onMobilePointerEnd}
        onLostPointerCapture={onMobilePointerEnd}
        data-cursor="crt"
        data-cursor-label="Tune"
        aria-label="Voyagerscape terminal — press to change signal"
      >
        <div className={styles.canvas} ref={setContainer} aria-hidden="true">
          <div className={styles.gl}>
            <CrtCanvas
              stateIndex={stateIndex}
              clickSeq={clickSeq}
              onContextLost={onContextLost}
              container={container}
              reducedMotion={reducedMotion}
              pointer={pointer}
              mobileInteracting={mobileInteracting}
            />
          </div>
        </div>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Terminal signal: {current}
      </span>
    </div>
  );
}
