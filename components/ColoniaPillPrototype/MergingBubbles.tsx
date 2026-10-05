"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-provider";
import { useUI } from "@/lib/ui-store";

export interface MergingBubblesProps {
  className?: string;
  onThemeClick?: () => void;
  onTerminalClick?: () => void;
  onDashClick?: () => void;
  onTargetClick?: () => void;
}

const TERMINAL_SYMBOLS = [">", "_", "?"] as const;
const TERMINAL_COLORS: Record<(typeof TERMINAL_SYMBOLS)[number], string> = {
  ">": "#C9B8E8", // Pale Lavender
  "_": "#A8DCC8", // Soft Mint
  "?": "#F2B8A2", // Warm Peach
};
const CYCLE_INTERVAL_MS = 1200;

/**
 * Cult UI — Two Separated 42px Circular Badges with Continuous Tangent Saddle
 * ===========================================================================
 * - Left Circle: cx=21, cy=21, diameter=42px (250° pure circular perimeter)
 *   -> REAL Day/Night Theme Toggle (integrated with global useTheme())
 * - Right Circle: cx=60, cy=21, diameter=42px (250° pure circular perimeter)
 *   -> REAL Command Terminal Trigger (integrated with global useUI())
 *      with auto-cycling ">" -> "_" -> "?" idle icon animation.
 * - Center-to-Center Distance: 39px (total width: 81px, height: 42px)
 * - Continuous Tangent Saddle: 100% LOCKED approved geometry.
 */
export function MergingBubbles({
  className = "",
  onThemeClick,
  onTerminalClick,
  onDashClick,
  onTargetClick,
}: MergingBubblesProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { terminalOpen, toggleTerminal } = useUI();
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [symbolIndex, setSymbolIndex] = useState(0);

  // Auto-cycle the terminal icon: >_ -> _ -> ? -> >_ ... (1200ms interval)
  useEffect(() => {
    if (terminalOpen) return;
    const interval = setInterval(() => {
      setSymbolIndex((prev) => (prev + 1) % TERMINAL_SYMBOLS.length);
    }, CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [terminalOpen]);

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleTheme(themeButtonRef.current);
    onThemeClick?.();
    onDashClick?.();
  };

  const handleTerminalTrigger = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleTerminal();
    onTerminalClick?.();
    onTargetClick?.();
  };

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`.trim()}
      style={{
        position: "relative",
        width: 81,
        height: 42,
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2))",
      }}
    >
      {/* Single Continuous Organic Silhouette with Exact Circular Tangency (100% LOCKED) */}
      <svg
        viewBox="0 0 81 42"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 81,
          height: 42,
          display: "block",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <path
          d="M 33 3.77
             C 36.2 6.0, 37.7 9.0, 40.5 9.0
             C 43.3 9.0, 44.8 6.0, 48 3.77
             A 21 21 0 1 1 48 38.23
             C 44.8 36.0, 43.3 33.0, 40.5 33.0
             C 37.7 33.0, 36.2 36.0, 33 38.23
             A 21 21 0 1 1 33 3.77 Z"
          fill="var(--vs-nav-pill, #24231F)"
          style={{
            transition: "fill 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>

      {/* Left Control: Real Global Theme Toggle (42px circle centered at X=21) */}
      <button
        ref={themeButtonRef}
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        data-theme={theme}
        data-cursor="link"
        data-cursor-label={isDark ? "Light" : "Dark"}
        onClick={handleThemeToggle}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 42,
          height: 42,
          borderRadius: "50%",
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          padding: 0,
          cursor: "pointer",
          zIndex: 1,
          color: "var(--vs-nav-text, #ffffff)",
          outline: "none",
          transition: "color 520ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {isDark ? (
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <circle cx="8" cy="8" r="3" />
            <line x1="8" y1="1.5" x2="8" y2="3" />
            <line x1="8" y1="13" x2="8" y2="14.5" />
            <line x1="1.5" y1="8" x2="3" y2="8" />
            <line x1="13" y1="8" x2="14.5" y2="8" />
            <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
            <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
            <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
            <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <path d="M13.5 9.2A5.8 5.8 0 1 1 6.8 2.5a4.6 4.6 0 0 0 6.7 6.7z" />
          </svg>
        )}
      </button>

      {/* Right Control: Real Command Terminal Trigger (42px circle centered at X=60) */}
      <button
        type="button"
        onClick={handleTerminalTrigger}
        aria-label="Open command terminal"
        aria-expanded={terminalOpen}
        data-cursor="link"
        style={{
          position: "absolute",
          top: 0,
          left: 39,
          width: 42,
          height: 42,
          borderRadius: "50%",
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          padding: 0,
          cursor: "pointer",
          zIndex: 1,
          outline: "none",
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, "SF Mono", monospace',
            fontSize: 12,
            fontWeight: 700,
            color: TERMINAL_COLORS[terminalOpen ? ">" : TERMINAL_SYMBOLS[symbolIndex]],
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            textAlign: "center",
            userSelect: "none",
            transition: "color 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          aria-hidden="true"
        >
          {terminalOpen ? ">" : TERMINAL_SYMBOLS[symbolIndex]}
        </span>
      </button>
    </div>
  );
}
