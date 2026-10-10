"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { setSmoothScrollControl } from "@/lib/scroll-lock";

export interface SmoothScrollToOptions {
  /** Jump instead of animating. */
  immediate?: boolean;
  /** Animation duration in seconds (Lenis). Ignored when immediate. */
  duration?: number;
}

/**
 * The controls the rest of the site uses. Every method is safe to call when
 * smooth scrolling is off (reduced motion / coarse pointer): it falls back to
 * native scrolling instead of throwing, so callers never need their own guard.
 */
export interface SmoothScrollControls {
  /** The one shared Lenis instance, or null when smooth scrolling is off. */
  lenis: Lenis | null;
  /** Scroll to an absolute offset. Works while the engine is stopped. */
  scrollTo: (target: number, options?: SmoothScrollToOptions) => void;
}

/** Native fallback: used when there is no provider or smooth scrolling is off. */
const NATIVE_CONTROLS: SmoothScrollControls = {
  lenis: null,
  scrollTo: (target) => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  },
};

const ScrollControlContext = createContext<SmoothScrollControls>(NATIVE_CONTROLS);

/** The shared scroll controls (always defined; native when smooth is off). */
export function useSmoothScroll(): SmoothScrollControls {
  return useContext(ScrollControlContext);
}

/** The shared Lenis instance, or null when smooth scrolling is off. */
export function useLenis(): Lenis | null {
  return useContext(ScrollControlContext).lenis;
}

/** Inertia scrolling, disabled for reduced-motion and coarse pointers. */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const instance = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    });

    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      setLenis(null);
      gsap.ticker.remove(raf);
      instance.destroy();
    };
  }, []);

  /* Route the shared scroll lock's smooth stop/start through this instance.
     Holders (loader, menu) say WHO needs inertia frozen; the lock decides when
     the one engine actually stops and restarts. */
  useEffect(() => {
    if (!lenis) return;
    setSmoothScrollControl({
      stop: () => lenis.stop(),
      start: () => lenis.start(),
    });
    return () => setSmoothScrollControl(null);
  }, [lenis]);

  const controls = useMemo<SmoothScrollControls>(() => {
    if (!lenis) return NATIVE_CONTROLS;
    return {
      lenis,
      scrollTo: (target, options = {}) => {
        // `force` lets it run while the engine is stopped by a lock holder.
        lenis.scrollTo(target, {
          force: true,
          ...(options.immediate !== undefined ? { immediate: options.immediate } : {}),
          ...(options.duration !== undefined ? { duration: options.duration } : {}),
        });
      },
    };
  }, [lenis]);

  return (
    <ScrollControlContext.Provider value={controls}>{children}</ScrollControlContext.Provider>
  );
}
