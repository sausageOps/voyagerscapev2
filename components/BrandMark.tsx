"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./BrandMark.module.css";

/** Compact brand pill that reveals the full word from inside itself. */
export default function BrandMark({ compact }: { compact?: boolean }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const full = el.querySelector<HTMLElement>("[data-brand-full]");
    const glyph = el.querySelector<HTMLElement>("[data-brand-glyph]");
    if (!full || !glyph) return;
    const enter = () => {
      if (prefersReducedMotion()) return;
      gsap.killTweensOf([el, full, glyph]);
      gsap.to(el, { width: compact ? 132 : 146, duration: 0.55, ease: "power3.out", overwrite: "auto" });
      gsap.to(glyph, { x: -6, opacity: 0, duration: 0.22, ease: "power2.out", overwrite: "auto" });
      gsap.fromTo(full, { x: 12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.42, delay: 0.08, ease: "power3.out", overwrite: "auto" });
    };
    const leave = () => {
      gsap.killTweensOf([el, full, glyph]);
      gsap.to(el, { width: compact ? 44 : 52, duration: 0.46, ease: "power3.out", overwrite: "auto" });
      gsap.to(glyph, { x: 0, opacity: 1, duration: 0.3, ease: "power3.out", overwrite: "auto" });
      gsap.to(full, { x: 8, opacity: 0, duration: 0.2, ease: "power2.in", overwrite: "auto" });
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      gsap.killTweensOf([el, full, glyph]);
    };
  }, [compact]);

  return (
    <Link ref={ref} href="/" className={[styles.mark, compact ? styles.compact : ""].filter(Boolean).join(" ")}
      aria-label="Voyagerscape — home" data-cursor="link" data-cursor-label="Home" data-magnetic data-tactile="brand">
      <span className={styles.glyph} data-brand-glyph aria-hidden="true">V:/</span>
      <span className={styles.full} data-brand-full aria-hidden="true">VOYAGERSCAPE</span>
      <span className={styles.caret} aria-hidden="true" />
    </Link>
  );
}
