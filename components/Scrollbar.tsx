"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";
import { useUI } from "@/lib/ui-store";
import { useRouteTransition } from "@/components/RouteTransition";
import { useLenis } from "@/components/SmoothScroll";
import styles from "./Scrollbar.module.css";

/* Track is 80svh, thumb is 6svh: the thumb can travel 74svh. */
const TRAVEL = 80 - 6;
const IDLE_FADE_DELAY_MS = 1500;

/**
 * Right-edge progress indicator (adapted from the Giats original).
 *
 * Scroll source: the app's existing Lenis instance (SmoothScroll context).
 * Progress is read from the instance (`lenis.scroll` / `lenis.limit`), not
 * from the event payload: Lenis also emits input-delta payloads that carry
 * neither value.
 * When smooth scrolling is off (reduced motion, coarse pointer) the same
 * indicator follows native document scroll instead.
 *
 * Hidden while the page is loading, the menu or terminal page is open, or a
 * route transition is running. Native scrollbars are hidden on <html> only
 * while this component is mounted (see Scrollbar.module.css).
 */
export default function Scrollbar() {
  const lenis = useLenis();
  const { loaded, terminalOpen, mobileMenuOpen } = useUI();
  const { transitioning } = useRouteTransition();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);

  const hidden = !loaded || terminalOpen || mobileMenuOpen || transitioning;

  /* Mark <html> so the native-scrollbar hiding rule applies to the real
     scrolling element only while this indicator exists. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("vs-custom-scrollbar");
    return () => root.classList.remove("vs-custom-scrollbar");
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return undefined;

    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

    if (hidden) {
      gsap.to(track, { opacity: 0, duration: 0.3, ease: "none", overwrite: "auto" });
      return undefined;
    }

    const readPosition = (): { scroll: number; limit: number } => {
      if (lenis) return { scroll: lenis.scroll, limit: lenis.limit };
      const root = document.documentElement;
      return {
        scroll: window.scrollY,
        limit: Math.max(0, root.scrollHeight - window.innerHeight),
      };
    };

    const update = () => {
      const { scroll, limit } = readPosition();
      const progress = limit > 0 ? scroll / limit : 0;
      const top = Math.max(0, Math.min(TRAVEL, progress * TRAVEL));

      gsap.to(track, { opacity: 1, duration: 0.3, ease: "none", overwrite: "auto" });
      gsap.to(thumb, { top: `${top}svh`, duration: 0.3, ease: "none", overwrite: "auto" });

      if (fadeTimeout !== null) clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => {
        gsap.to(track, { opacity: 0, duration: 0.5, ease: "none", overwrite: "auto" });
      }, IDLE_FADE_DELAY_MS);
    };

    if (lenis) {
      lenis.on("scroll", update);
    } else {
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
    }
    update();

    return () => {
      if (lenis) {
        lenis.off("scroll", update);
      } else {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
      }
      if (fadeTimeout !== null) clearTimeout(fadeTimeout);
    };
  }, [lenis, hidden]);

  return (
    <div id="scrollbar" ref={trackRef} className={styles.scrollbar} aria-hidden="true">
      <div ref={thumbRef} className={styles.inner} />
    </div>
  );
}
