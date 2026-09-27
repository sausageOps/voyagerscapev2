"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import GlassControl from "@/components/primitives/GlassControl";
import styles from "./MessageCTA.module.css";

/** Floating glass CTA with pointer influence and press compression. */
export default function MessageCTA({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ctx: gsap.Context | undefined;
    if (!prefersReducedMotion()) {
      ctx = gsap.context(() => {
        gsap.to(wrap, {
          y: -5,
          duration: 3.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, wrap);
    }

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <GlassControl
        ref={btnRef}
        variant="clear"
        size="lg"
        className={styles.cta}
        onClick={onOpen}
        aria-expanded={open}
        aria-controls="vs-recorder"
        data-cursor="link"
        data-cursor-label="Open"
        data-magnetic
      >
        <span className={styles.prompt} aria-hidden="true">
          &gt;/
        </span>
        <span className={styles.text}>Leave Us A Message</span>
      </GlassControl>
    </div>
  );
}
