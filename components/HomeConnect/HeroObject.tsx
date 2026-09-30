"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import CrtStatic from "./CrtStatic";

/**
 * HERO OBJECT — renderer selector
 * ===============================
 *
 * Decides between the WebGL monitor and the static SVG monitor, and is the
 * only place that decision is made.
 *
 * The gate runs BEFORE the dynamic import, so a device that fails it never
 * downloads three.js at all — the chunk is requested from inside the render
 * path, not at module scope.
 *
 * `components/HomeConnect/CrtStatic.tsx` is the production fallback. It is
 * never removed: it covers no-WebGL, reduced motion, data saver, very
 * low-end hardware, the server render, and runtime context loss. It is
 * built to the same proportions and the same box as the 3D object, so the
 * upgrade is a change of fidelity rather than a change of object, and there
 * is no layout shift when the chunk lands.
 */

const Crt3D = dynamic(() => import("./Crt3D"), {
  ssr: false, // R3F cannot server-render
  loading: () => null,
});

export interface HeroObjectProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  level: number;
  onShutter: () => void;
}

/**
 * Raise to 1024 to restrict WebGL to desktop only.
 *
 * Kept at 0: the brief asks for the monitor to stay visually dominant down
 * to 320px rather than degrading to a card. One constant, one edit.
 */
const MIN_WIDTH_FOR_3D = 0;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
    // Release the probe context immediately; browsers cap concurrent contexts.
    const lose = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (window.innerWidth < MIN_WIDTH_FOR_3D) return false;

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;

  /* NB: deliberately NOT gating on navigator.hardwareConcurrency. It reads
     like a sensible low-end check, but iOS Safari reports 2 on hardware that
     renders this scene at a locked 60fps, so the threshold excludes capable
     devices while catching almost no slow ones. WebGL support plus the data
     saver and reduced-motion signals are the honest tests. */

  return hasWebGL();
}

export default function HeroObject(props: HeroObjectProps) {
  /* Always false on the first client render so the markup matches the SVG the
     server produced; the upgrade happens in an effect, after hydration. */
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    setUse3D(canRun3D());

    // Respect a live change of the motion preference.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setUse3D(canRun3D());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const fallback = <CrtStatic {...props} />;

  if (!use3D) return fallback;

  return <Crt3D {...props} fallback={fallback} />;
}
