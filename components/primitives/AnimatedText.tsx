"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, revealChars, splitChars } from "@/lib/motion";

interface AnimatedTextProps {
  as?: ElementType;
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
  /** Rendered after the animated text, inside the same block. */
  children?: ReactNode;
}

/**
 * Character-level entrance reveal. Text is rendered server-side as plain
 * content (no hydration mismatch) and split on the client before animating.
 */
export default function AnimatedText({
  as,
  text,
  delay = 0,
  stagger = 0.012,
  className,
  children,
}: AnimatedTextProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const chars = splitChars(el);
      revealChars(chars, { delay, stagger });
    }, el);
    return () => ctx.revert();
  }, [delay, stagger]);

  return (
    <>
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
      {children}
    </>
  );
}
