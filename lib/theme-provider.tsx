"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme, originElement?: HTMLElement | null) => void;
  toggleTheme: (originElement?: HTMLElement | null) => void;
}

const STORAGE_KEY = "vs-theme";
const TRANSITION_DURATION = 650; // 550–750ms editorial timing
const TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"; // Smooth editorial ease

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const themeRef = useRef<Theme>("light");
  const isTransitioningRef = useRef(false);

  // Synchronize initial theme state from DOM (set by anti-flash script in layout)
  useEffect(() => {
    try {
      const root = document.documentElement;
      const initial =
        (root.getAttribute("data-theme") as Theme) ||
        (localStorage.getItem(STORAGE_KEY) as Theme) ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

      setThemeState(initial);
      themeRef.current = initial;
      root.setAttribute("data-theme", initial);
      root.classList.toggle("dark", initial === "dark");
    } catch {
      // Safe fallback if local storage or matchMedia is restricted
    }
  }, []);

  const applyTheme = useCallback((nextTheme: Theme) => {
    themeRef.current = nextTheme;
    setThemeState(nextTheme);

    const root = document.documentElement;
    root.setAttribute("data-theme", nextTheme);
    root.classList.toggle("dark", nextTheme === "dark");

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setTheme = useCallback(
    (nextTheme: Theme, originElement?: HTMLElement | null) => {
      if (nextTheme === themeRef.current && !isTransitioningRef.current) return;
      if (isTransitioningRef.current) return;

      const reduced = prefersReducedMotion();
      const hasViewTransition =
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        typeof (document as any).startViewTransition === "function";

      if (reduced || !hasViewTransition) {
        applyTheme(nextTheme);
        return;
      }

      // Calculate origin coordinates from the clicked/tapped toggle button
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      if (originElement && typeof originElement.getBoundingClientRect === "function") {
        const rect = originElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      // Calculate maximum distance to the furthest viewport corner for full coverage
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      isTransitioningRef.current = true;

      try {
        const transition = (document as any).startViewTransition(() => {
          applyTheme(nextTheme);
        });

        if (transition && transition.ready) {
          transition.ready
            .then(() => {
              const animation = document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                  ],
                },
                {
                  duration: TRANSITION_DURATION,
                  easing: TRANSITION_EASING,
                  pseudoElement: "::view-transition-new(root)",
                },
              );

              return animation.finished;
            })
            .catch(() => {
              // Gracefully handle animation cancel or failure
            })
            .finally(() => {
              isTransitioningRef.current = false;
            });
        } else {
          isTransitioningRef.current = false;
        }
      } catch {
        applyTheme(nextTheme);
        isTransitioningRef.current = false;
      }
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(
    (originElement?: HTMLElement | null) => {
      const next = themeRef.current === "dark" ? "light" : "dark";
      setTheme(next, originElement);
    },
    [setTheme],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
