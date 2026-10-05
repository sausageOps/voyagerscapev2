"use client";

import { Component, type ReactNode } from "react";
import { useTheme } from "@/lib/theme-provider";
import PatternWaves from "./PatternWaves";
import styles from "./HomeCanvas.module.css";

/**
 * HOMEPAGE ATMOSPHERE — React Bits "Pattern Waves" (WebGL2 / OGL)
 * ==============================================================
 *
 * Theme-aware background layer:
 * - Light Mode: Near-black ink (#18181b) over warm-white paper base (#fffdf9)
 * - Dark Mode: Soft warm off-white marks (#847d75) over warm charcoal base (#171716)
 */

const BASE_PATTERN_WAVES_PROPS = {
  preset: "terminal",
  pattern: "glyph",
  wave: "ripple",
  spacing: 5,
  depth: 1.5,
  light: 90,
  shine: 0.9,
  contrast: 1.4,
  speed: 0.3,
  scale: 1.1,
  direction: 204,
} as const;

/**
 * WebGL/OGL failures (context creation, shader compile, extension probe)
 * must never take the homepage down: this boundary catches them, drops
 * the canvas layer, and leaves the frame's paper as the
 * atmosphere — the same fallback the no-WebGL2 path already lands on.
 */
class AtmosphereBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HomeAtmosphere() {
  const { isDark } = useTheme();

  const color = isDark ? "#847d75" : "#18181b";
  const backgroundColor = isDark ? "#171716" : "#fffdf9";

  return (
    <div className={styles.shader}>
      <AtmosphereBoundary>
        <PatternWaves
          {...BASE_PATTERN_WAVES_PROPS}
          color={color}
          backgroundColor={backgroundColor}
          className={styles.shaderHost}
        />
      </AtmosphereBoundary>
    </div>
  );
}
