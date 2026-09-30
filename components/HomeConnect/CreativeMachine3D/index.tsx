"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AudioPlaybackState, RecordingState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import { usePointerField } from "../Camera3D/motion/usePointerField";
import CreativeMachineCanvas from "./CreativeMachineCanvas";
import { type MachineActionSignal } from "./scene/MachineRig";
import { MACHINE_STATUS_TEXT, resolveMachineStatus } from "./status";
import styles from "./CreativeMachine3D.module.css";

export interface CreativeMachine3DProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  level: number;
  onShutter: () => void;
  /** Rendered if the browser loses WebGL after the initial capability check. */
  fallback: React.ReactNode;
}

/**
 * Host for the new Voyagerscape Creative Machine.
 *
 * This keeps the existing capability gate, pointer-field strategy, native
 * button activation and runtime context-loss recovery, but deliberately does
 * not depend on any of the old camera geometry or scene components.
 */
export default function CreativeMachine3D({
  recordingState,
  playbackState,
  level,
  onShutter,
  fallback,
}: CreativeMachine3DProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);
  const [responding, setResponding] = useState(false);
  const timer = useRef<number | null>(null);
  const action = useRef<MachineActionSignal>({ seq: 0 });
  const controlHover = useRef(false);
  const reducedMotion = prefersReducedMotion();
  const status = resolveMachineStatus(recordingState, playbackState);
  const pointer = usePointerField(container, !reducedMotion);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const activate = useCallback(() => {
    action.current.seq += 1;
    setResponding(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        timer.current = null;
        setResponding(false);
      },
      reducedMotion ? 120 : 820,
    );
    onShutter();
  }, [onShutter, reducedMotion]);

  const setHover = useCallback((value: boolean) => {
    controlHover.current = value;
  }, []);

  const onPointerEnter = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch") setHover(true);
  }, [setHover]);
  const onPointerLeave = useCallback(() => setHover(false), [setHover]);

  if (lost) return <>{fallback}</>;

  return (
    <div className={styles.stage} data-status={status}>
      <div className={styles.canvas} ref={setContainer} aria-hidden="true">
        <div className={styles.gl}>
          <CreativeMachineCanvas
            status={status}
            level={level}
            onContextLost={() => setLost(true)}
            container={container}
            reducedMotion={reducedMotion}
            pointer={pointer}
            controlHover={controlHover}
            action={action}
          />
        </div>
      </div>
      <button
        type="button"
        className={styles.control}
        onClick={activate}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        data-cursor="creative-machine-control"
        data-cursor-label="Pulse"
        aria-label="Activate the creative machine control"
      />
      <span className="vs-sr-only" aria-live="polite">
        Creative machine: {responding ? "Pulse initiated" : MACHINE_STATUS_TEXT[status]}
      </span>
    </div>
  );
}
