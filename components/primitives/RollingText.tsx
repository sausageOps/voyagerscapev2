"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./RollingText.module.css";

interface RollingTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  text: string;
  /** The second line is optional when the visual label should not change. */
  hoverText?: string;
  initial?: boolean;
}

/** A masked, interruptible two-line label shared by interactive controls. */
export default function RollingText({ text, hoverText = text, initial = true, className, ...rest }: RollingTextProps) {
  const maskRef = useRef<HTMLSpanElement | null>(null);
  const currentRef = useRef<HTMLSpanElement | null>(null);
  const nextRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const mask = maskRef.current;
    const current = currentRef.current;
    const next = nextRef.current;
    if (!mask || !current || !next) return;

    const reduced = prefersReducedMotion();
    if (initial && !reduced) {
      gsap.set(next, { yPercent: 100, opacity: 1 });
      gsap.fromTo(current, { yPercent: 35, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.48, ease: "power3.out", delay: 0.05,
      });
    }

    const enter = () => {
      if (reduced) {
        gsap.to([current, next], { opacity: 0.7, duration: 0.12, overwrite: "auto" });
        return;
      }
      gsap.killTweensOf([current, next]);
      gsap.set(next, { yPercent: 100, opacity: 1 });
      gsap.to(current, { yPercent: -100, duration: 0.52, ease: "power3.out", overwrite: "auto" });
      gsap.to(next, { yPercent: 0, duration: 0.52, ease: "power3.out", overwrite: "auto" });
    };
    const leave = () => {
      if (reduced) {
        gsap.to([current, next], { opacity: 1, duration: 0.12, overwrite: "auto" });
        return;
      }
      gsap.killTweensOf([current, next]);
      gsap.to(current, { yPercent: 0, duration: 0.52, ease: "power3.out", overwrite: "auto" });
      gsap.to(next, { yPercent: 100, duration: 0.52, ease: "power3.out", overwrite: "auto" });
    };
    mask.addEventListener("pointerenter", enter);
    mask.addEventListener("pointerleave", leave);
    return () => {
      mask.removeEventListener("pointerenter", enter);
      mask.removeEventListener("pointerleave", leave);
      gsap.killTweensOf([current, next]);
    };
  }, [initial]);

  return (
    <span ref={maskRef} className={[styles.mask, className].filter(Boolean).join(" ")} {...rest}>
      <span ref={currentRef} className={`${styles.line} rolling-text__line`} aria-hidden="true">{text}</span>
      <span ref={nextRef} className={`${styles.line} rolling-text__line`} aria-hidden="true">{hoverText}</span>
      <span className="vs-sr-only">{text}</span>
    </span>
  );
}
