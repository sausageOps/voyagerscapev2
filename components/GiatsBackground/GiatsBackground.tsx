"use client";

/*
 * Ported from Giats `src/components/canvas/background/Index.jsx`.
 *
 * One R3F Canvas, one renderer, one animation loop, mounted once in
 * AppFrame so it persists across route changes. The source's DPR handling
 * is kept (min(1, devicePixelRatio) as the lower bound, max 1).
 *
 * Adapted for Voyagerscape:
 *   - rendered only after mount (WebGL never runs during server render);
 *   - wrapper is pointer-events:none so it never blocks clicks, scroll or
 *     drag. The inline style is needed because R3F's wrapper sets
 *     pointer-events:auto itself;
 *   - under prefers-reduced-motion the frameloop is "demand": the scene is
 *     painted once and on theme change, with no continuous animation.
 */

import { useEffect, useState } from "react";
import type * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { prefersReducedMotion } from "@/lib/motion";
import { useTheme } from "@/lib/theme-provider";
import Background from "./Background";
import styles from "./GiatsBackground.module.css";

type CanvasSettings = { dpr: number; reducedMotion: boolean };

export default function GiatsBackground() {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<CanvasSettings | null>(null);

  useEffect(() => {
    setSettings({
      dpr: Math.min(1, window.devicePixelRatio),
      reducedMotion: prefersReducedMotion(),
    });
  }, []);

  if (!settings) return null;

  return (
    <div className={styles.root} aria-hidden="true" data-giats-background>
      <Canvas
        flat
        linear
        dpr={[settings.dpr, 1]}
        frameloop={settings.reducedMotion ? "demand" : "always"}
        style={{ pointerEvents: "none" }}
        gl={
          {
            antialias: false,
            stencil: false,
            depth: false,
            // Kept exactly as in the source. It is not a WebGLRenderer
            // parameter, so the cast is needed; resolution is governed by `dpr`.
            pixelRatio: 0.5,
          } as Partial<THREE.WebGLRendererParameters>
        }
      >
        <Background isDark={isDark} />
      </Canvas>
    </div>
  );
}
