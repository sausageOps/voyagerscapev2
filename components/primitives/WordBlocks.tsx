"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./WordBlocks.module.css";

export interface WordDef {
  /** The word itself, or a custom node. */
  text?: string;
  node?: ReactNode;
  /** Blocked words sit in a soft capsule; unblocked words sit bare. */
  block?: boolean;
  accent?: "pink" | "yellow" | "lavender" | "cream" | "plain";
  href?: string;
  /** Forces a line break after this word. */
  break?: boolean;
  wide?: boolean;
  /** Opt in or out of the full pill capsule treatment. */
  round?: boolean;
  /** Explicit shape preference: pill capsule or rounded rectangle */
  shape?: "pill" | "rounded";
}

interface WordBlocksProps {
  words: WordDef[];
  className?: string;
  /** `data-word` hooks let the caller stagger the entrance. */
  reveal?: boolean;
  size?: "hero" | "statement";
  /** Pointer-proximity response. Off for small runs like the footer. */
  interactive?: boolean;
}

/** Peak travel of the hovered block, in px. Neighbours get a fraction. */
const PULL = 6;

/**
 * Editorial floating typography rendered as individual physical translucent
 * label blocks and pill capsules inspired by the ToyFight aesthetic.
 *
 * Each token sits inside a rounded pill or soft rounded rectangle with
 * subtle glass-like surfaces, fine borders, soft shadows and restrained
 * magnetic pointer ripple interactions.
 */
export default function WordBlocks({
  words,
  className,
  reveal,
  size = "hero",
  interactive,
}: WordBlocksProps) {
  const runRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const run = runRef.current;
    if (!run || !interactive) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const nodes = Array.from(run.querySelectorAll<HTMLElement>("[data-word]"));
    if (!nodes.length) return;

    // One quickSetter per node plus a single shared ticker: three separate
    // quickTo tweens on the same element do not compose reliably for
    // translate *and* scale, and this also keeps us to one rAF for the run.
    const setters = nodes.map((n) => gsap.quickSetter(n, "css") as (v: object) => void);
    const state = nodes.map(() => ({ x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1 }));

    let px = -9999;
    let py = -9999;
    let boxes: DOMRect[] = nodes.map((n) => n.getBoundingClientRect());

    const measure = () => {
      boxes = nodes.map((n) => n.getBoundingClientRect());
    };

    const retarget = () => {
      boxes.forEach((b, i) => {
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        // Reach scales with the block, so long words influence further.
        const reach = Math.max(b.width, b.height) * 1.9;
        const dist = Math.hypot(dx, dy);
        const n = gsap.utils.clamp(0, 1, 1 - dist / reach);
        const f = n * n * (3 - 2 * n); // smoothstep
        const inside = px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
        const st = state[i];
        st.tx = gsap.utils.clamp(-PULL, PULL, dx * 0.12) * f;
        st.ty = gsap.utils.clamp(-PULL, PULL, dy * 0.12) * f + (inside ? -3 : 0) * f;
        st.ts = 1 + f * (inside ? 0.035 : 0.012);
      });
    };

    const tick = () => {
      state.forEach((st, i) => {
        st.x += (st.tx - st.x) * 0.16;
        st.y += (st.ty - st.y) * 0.16;
        st.s += (st.ts - st.s) * 0.16;
        setters[i]({ x: st.x, y: st.y, scale: st.s });
      });
    };

    gsap.ticker.add(tick);

    const onMove = (event: PointerEvent) => {
      px = event.clientX;
      py = event.clientY;
      retarget();
    };

    const onLeave = () => {
      px = -9999;
      py = -9999;
      retarget();
    };

    // Listening on the window keeps the ripple alive as the pointer
    // approaches, not only once it is already over a block.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      gsap.ticker.remove(tick);
      nodes.forEach((n) => n.style.removeProperty("transform"));
    };
  }, [interactive, words]);

  return (
    <span className={`${styles.run} ${styles[size]} ${className ?? ""}`} ref={runRef}>
      {words.map((w, i) => {
        const key = `${w.text ?? "node"}-${i}`;
        // Determine shape: explicit shape or automatic based on length / node
        const isRound =
          w.shape === "pill" ||
          (w.round ?? (w.text ? w.text.length <= 3 : Boolean(w.node)));
        const isRoundedRect = w.shape === "rounded" || (!isRound && Boolean(w.text));

        const cls = [
          styles.word,
          w.block === false ? styles.bare : styles.blocked,
          isRound ? styles.round : isRoundedRect ? styles.rounded : "",
          w.accent && w.accent !== "plain" ? styles[w.accent] : "",
          w.wide ? styles.wide : "",
        ]
          .filter(Boolean)
          .join(" ");

        const content = w.node ?? w.text;
        const el = w.href ? (
          <a
            href={w.href}
            className={cls}
            data-cursor="link"
            data-word
            {...(reveal ? { "data-word-reveal": true } : {})}
          >
            {content}
          </a>
        ) : (
          <span
            className={cls}
            data-word
            {...(reveal ? { "data-word-reveal": true } : {})}
          >
            {content}
          </span>
        );

        return (
          <span className={styles.slot} key={key}>
            {el}
            {w.break && <span className={styles.brk} aria-hidden="true" />}
          </span>
        );
      })}
    </span>
  );
}
