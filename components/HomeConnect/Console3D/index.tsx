"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import ConsoleCanvas from "./ConsoleCanvas";
import { CONSOLE_MODES, MODE_COPY, type ConsoleMode } from "./types";
import styles from "./Console3D.module.css";

interface Console3DProps {
  /** Used if the browser loses WebGL after the Canvas has mounted. */
  fallback: React.ReactNode;
}

/**
 * DOM host for the procedural WebGL console. The scene owns its tactile motion;
 * this host owns state, keyboard access, capability failure, and the existing
 * cursor contract. None of these controls navigate the site — they are only
 * prototype states for the object.
 */
export default function Console3D({ fallback }: Console3DProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);
  const [mode, setMode] = useState<ConsoleMode>("EXPLORE");
  const [turns, setTurns] = useState(0);
  const [slider, setSlider] = useState(0.44);
  const [armed, setArmed] = useState(false);
  const [encoder, setEncoder] = useState(0);
  const announcedMode = useRef(mode);

  useEffect(() => {
    announcedMode.current = mode;
  }, [mode]);

  const selectMode = useCallback((next: ConsoleMode) => {
    setMode(next);
  }, []);

  const turnWheel = useCallback(() => {
    setTurns((value) => value + 1);
    setMode((current) => CONSOLE_MODES[(CONSOLE_MODES.indexOf(current) + 1) % CONSOLE_MODES.length]);
  }, []);

  const adjustSlider = useCallback(() => {
    setSlider((value) => (value > 0.56 ? 0.23 : 0.77));
  }, []);

  const turnEncoder = useCallback(() => {
    setEncoder((value) => value + 1);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        turnWheel();
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        turnWheel();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setTurns((value) => Math.max(0, value - 1));
        setMode((current) => CONSOLE_MODES[(CONSOLE_MODES.indexOf(current) + CONSOLE_MODES.length - 1) % CONSOLE_MODES.length]);
      }
    },
    [turnWheel],
  );

  if (lost) return <>{fallback}</>;

  const copy = MODE_COPY[mode];

  return (
    <div className={styles.stage}>
      <div
        ref={setContainer}
        className={styles.hit}
        role="group"
        tabIndex={0}
        data-cursor="console"
        data-cursor-label="Operate"
        aria-label={`Voyagerscape Console. ${mode} mode active.`}
        aria-describedby="console-instructions"
        onKeyDown={onKeyDown}
      >
        <div className={styles.canvas} aria-hidden="true">
          <div className={styles.gl}>
            <ConsoleCanvas
              container={container}
              mode={mode}
              turns={turns}
              slider={slider}
              armed={armed}
              encoder={encoder}
              onContextLost={() => setLost(true)}
              onMode={selectMode}
              onWheel={turnWheel}
              onSlider={adjustSlider}
              onArm={() => setArmed((value) => !value)}
              onEncoder={turnEncoder}
            />
          </div>
        </div>
      </div>

      <p id="console-instructions" className="vs-sr-only">
        Turn the main wheel with Enter, Space or arrow keys. The mode bank selects a console state; no page navigation occurs.
      </p>
      <div className={styles.a11yControls} aria-label="Console controls">
        <button type="button" onClick={turnWheel}>Turn central wheel</button>
        {CONSOLE_MODES.map((next) => (
          <button key={next} type="button" onClick={() => selectMode(next)} aria-pressed={mode === next}>
            Select {next}
          </button>
        ))}
        <button type="button" onClick={adjustSlider}>Adjust range slider</button>
        <button type="button" onClick={() => setArmed((value) => !value)} aria-pressed={armed}>Toggle signal latch</button>
        <button type="button" onClick={turnEncoder}>Turn fine control</button>
      </div>
      <span className="vs-sr-only" aria-live="polite">
        {mode}. {copy.channel}. {copy.note}
      </span>
    </div>
  );
}
