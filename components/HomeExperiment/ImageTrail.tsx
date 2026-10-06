"use client";

import { useEffect, useRef } from "react";
import styles from "./HomeExperiment.module.css";

/**
 * IMAGE TRAIL — the one "reward for curiosity" interaction on the page.
 *
 * A pool of fixed <img> nodes is recycled: moving the pointer far enough
 * inside the host releases the next fragment at the cursor, which then
 * settles and fades out on its own CSS transition. There is no animation
 * loop at all — the browser's compositor runs the decay — so the section
 * costs nothing when the pointer is still or elsewhere.
 *
 * Disabled entirely for coarse pointers and reduced motion.
 */
export default function ImageTrail({
  images,
  enabled,
  threshold = 86,
}: {
  images: string[];
  enabled: boolean;
  threshold?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !enabled) return;

    const nodes = Array.from(host.querySelectorAll<HTMLElement>("[data-trail]"));
    if (nodes.length === 0) return;

    /* The host itself is inert (pointer-events: none) so it never steals a
       click or a text selection — the section around it is what listens. */
    const target: HTMLElement = host.parentElement ?? host;

    let lastX = 0;
    let lastY = 0;
    let primed = false;
    let cursor = 0;
    const timers = new Map<HTMLElement, number>();

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      if (!primed) {
        primed = true;
        lastX = x;
        lastY = y;
        return;
      }
      if (Math.hypot(x - lastX, y - lastY) < threshold) return;
      lastX = x;
      lastY = y;

      const node = nodes[cursor % nodes.length];
      cursor += 1;

      const tilt = (cursor % 2 === 0 ? 1 : -1) * (3 + (cursor % 3) * 2);
      node.style.setProperty("--tx", `${x}px`);
      node.style.setProperty("--ty", `${y}px`);
      node.style.setProperty("--tr", `${tilt}deg`);
      node.setAttribute("data-on", "true");

      const existing = timers.get(node);
      if (existing) window.clearTimeout(existing);
      timers.set(
        node,
        window.setTimeout(() => {
          node.setAttribute("data-on", "false");
          timers.delete(node);
        }, 420),
      );
    };

    const onLeave = () => {
      primed = false;
      nodes.forEach((n) => n.setAttribute("data-on", "false"));
    };

    target.addEventListener("pointermove", onMove, { passive: true });
    target.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
      timers.forEach((t) => window.clearTimeout(t));
      nodes.forEach((n) => n.setAttribute("data-on", "false"));
    };
  }, [enabled, threshold]);

  return (
    <div ref={hostRef} className={styles.trailHost} aria-hidden="true">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          data-trail
          data-on="false"
          className={styles.trailImage}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}
