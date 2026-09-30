"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import ConsoleFallback from "./Console3D/ConsoleFallback";

/**
 * CENTRAL HERO OBJECT — Voyagerscape Console experiment
 *
 * This branch swaps only the center visual. The existing page composition,
 * global cursor, motion preference detection and capability gate remain in
 * place. A non-WebGL or reduced-motion browser receives the same console as a
 * lightweight SVG rather than a blank canvas.
 */
const Console3D = dynamic(() => import("./Console3D"), {
  ssr: false,
  loading: () => null,
});

export interface HeroObjectProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  level: number;
  onShutter: () => void;
}

const MIN_WIDTH_FOR_3D = 0;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
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
  return hasWebGL();
}

export default function HeroObject(_props: HeroObjectProps) {
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    setUse3D(canRun3D());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setUse3D(canRun3D());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const fallback = <ConsoleFallback />;
  return use3D ? <Console3D fallback={fallback} /> : fallback;
}
