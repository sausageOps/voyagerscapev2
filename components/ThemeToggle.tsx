"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { useTheme } from "@/lib/theme-provider";
import styles from "./ThemeToggle.module.css";

export interface ThemeToggleProps {
  className?: string;
  id?: string;
}

export default function ThemeToggle({ className = "", id }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const rootRef = useRef<HTMLButtonElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTheme(rootRef.current);
    }
  };

  const handleToggleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLElement | null;
    const dayTarget = target?.closest("[data-option='day']");
    const nightTarget = target?.closest("[data-option='night']");

    if (dayTarget) {
      e.stopPropagation();
      setTheme("light", rootRef.current);
      return;
    }

    if (nightTarget) {
      e.stopPropagation();
      setTheme("dark", rootRef.current);
      return;
    }

    toggleTheme(rootRef.current);
  };

  return (
    <button
      id={id}
      ref={rootRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-theme={theme}
      data-cursor="link"
      data-cursor-label={isDark ? "Light" : "Dark"}
      className={`${styles.toggle} ${className}`.trim()}
      onClick={handleToggleClick}
      onKeyDown={handleKeyDown}
    >
      {/* =========================================================
          DESKTOP / TABLET (>=768px): [ DAY | NIGHT ] with Active Capsule
          ========================================================= */}
      <span className={styles.desktopTrack} aria-hidden="true">
        {/* Contrasting Inner Active Capsule */}
        <span
          className={`${styles.activeCapsule} ${isDark ? styles.capsuleNight : styles.capsuleDay}`}
        />
        <span
          data-option="day"
          className={`${styles.desktopLabel} ${styles.day} ${!isDark ? styles.active : ""}`}
        >
          Day
        </span>
        <span
          data-option="night"
          className={`${styles.desktopLabel} ${styles.night} ${isDark ? styles.active : ""}`}
        >
          Night
        </span>
      </span>

      {/* =========================================================
          MOBILE (<768px): Single Icon Capsule (52×44) [LOCKED]
          ========================================================= */}
      <span className={styles.mobileIconWrap} aria-hidden="true">
        {isDark ? (
          <svg
            className={`${styles.icon} ${styles.sun}`}
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="3.2" />
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
            className={`${styles.icon} ${styles.moon}`}
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13.5 9.2A5.8 5.8 0 1 1 6.8 2.5a4.6 4.6 0 0 0 6.7 6.7z" />
          </svg>
        )}
      </span>
    </button>
  );
}
