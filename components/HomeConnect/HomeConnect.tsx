"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import BrandMark from "@/components/BrandMark";
import NavMenu from "@/components/NavMenu";
import HeroObject from "./HeroObject";
import styles from "./HomeConnect.module.css";

export default function HomeConnect() {
  const { setTerminalOpen, terminalOpen } = useUI();
  const recorder = useRecorder();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const move = (event: PointerEvent) => {
      pointer.current.tx = event.clientX / window.innerWidth;
      pointer.current.ty = event.clientY / window.innerHeight;
    };
    const tick = () => {
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.045;
      p.y += (p.ty - p.y) * 0.045;
      root.style.setProperty("--mouse-x", `${p.x * 100}%`);
      root.style.setProperty("--mouse-y", `${p.y * 100}%`);
      root.style.setProperty("--type-shift-x", `${(p.x - 0.5) * 10}px`);
      root.style.setProperty("--type-shift-y", `${(p.y - 0.5) * 6}px`);
      root.style.setProperty("--object-shift-x", `${(p.x - 0.5) * 16}px`);
      root.style.setProperty("--object-shift-y", `${(p.y - 0.5) * 10}px`);
      raf.current = window.requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  const onShutter = useCallback(() => {
    if (recorder.recordingState === "recording") void recorder.stop();
    else if (recorder.hasClip) recorder.preview();
  }, [recorder]);

  return (
    <section className={styles.frame} ref={canvasRef} aria-label="Voyagerscape opening experience">
      <div className={styles.atmosphere} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.brand}><BrandMark /></div>
        <NavMenu />
        <button
          type="button"
          className={styles.hint}
          onClick={() => setTerminalOpen(!terminalOpen)}
          aria-expanded={terminalOpen}
          aria-controls="vs-command-terminal"
          data-cursor="link"
          data-cursor-label="Terminal"
        >
          <span>Press</span><kbd>/</kbd><span>for ?</span>
        </button>
      </header>

      <div className={styles.centerpiece}>
        <div className={styles.wordLayer} aria-hidden="true">
          VOYAGERSCAPE
        </div>
        <div className={styles.objectLayer}>
          <HeroObject
            recordingState={recorder.recordingState}
            playbackState={recorder.playbackState}
            level={recorder.level}
            onShutter={onShutter}
          />
        </div>
      </div>

      <div className={styles.footerDetail} aria-hidden="true">
        <i /><i /><i /><span>VSC / 01</span>
      </div>
      <p className={styles.srOnly}>Voyagerscape. An interactive archive monitor. Click the monitor to change channel.</p>
    </section>
  );
}
