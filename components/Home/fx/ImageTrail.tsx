"use client";

/* =========================================================================
   IMAGE TRAIL  —  the signature interaction
   -------------------------------------------------------------------------
   SELECTION RECORD
     section : 03 VISUAL WORLD
     source  : React Bits — Image Trail (variant 1), itself after Codrops
               (MIT + Commons Clause / Codrops hub, free to use)
     why     : the brief asks for one memorable mechanic. Fragments of
               photographs left behind the pointer *is* the practice's
               subject — images as memory — and it only exists inside the
               wall, so it reads as a property of that place rather than a
               site-wide gimmick.
     change  : the original drops large, fully opaque images, several at a
               time, at a low distance threshold — impressive for a demo,
               loud on an editorial page. Voyagerscape's version is smaller
               (160px), spaced further apart (a 130px threshold), limited to
               seven live fragments, graded to the page's palette, and each
               fragment *develops* through a clip-path wipe instead of
               popping. GSAP is already the house animation engine, so no
               new dependency is introduced.
   ========================================================================= */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { isFinePointer, prefersReducedMotion } from "../lib/engine";
import type { Frame } from "../data";
import styles from "./ImageTrail.module.css";

const THRESHOLD = 130;

export default function ImageTrail({
  frames,
  className = "",
}: {
  frames: Frame[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    const items = itemsRef.current.filter(Boolean);
    if (!host || !items.length) return;
    if (!isFinePointer() || prefersReducedMotion()) return;

    let visible = false;
    let index = 0;
    let z = 1;
    let last: { x: number; y: number } | null = null;
    let queued: PointerEvent | null = null;
    let frame = 0;

    const release = (node: HTMLDivElement, x: number, y: number) => {
      z += 1;
      const rotation = gsap.utils.random(-7, 7);
      gsap.killTweensOf(node);
      gsap
        .timeline()
        .set(node, {
          opacity: 1,
          zIndex: z,
          x,
          y,
          rotate: rotation,
          scale: 0.9,
          clipPath: "inset(0% 0% 100% 0%)",
        })
        .to(node, {
          scale: 1,
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.42,
          ease: "power3.out",
        })
        .to(
          node,
          {
            opacity: 0,
            scale: 0.96,
            duration: 0.95,
            ease: "power2.inOut",
          },
          0.5,
        );
    };

    const process = () => {
      frame = 0;
      const event = queued;
      queued = null;
      if (!event || !visible) return;
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        last = null;
        return;
      }
      if (!last) {
        last = { x, y };
        return;
      }
      if (Math.hypot(x - last.x, y - last.y) < THRESHOLD) return;
      last = { x, y };
      release(items[index], x, y);
      index = (index + 1) % items.length;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      queued = event;
      if (!frame) frame = requestAnimationFrame(process);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          last = null;
          gsap.killTweensOf(items);
          gsap.set(items, { opacity: 0 });
        }
      },
      { threshold: 0 },
    );
    io.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
      gsap.killTweensOf(items);
    };
  }, [frames]);

  return (
    <div className={`${styles.host} ${className}`} ref={hostRef} aria-hidden="true">
      {frames.map((frame, i) => (
        <div
          className={styles.item}
          key={`${frame.src}-${i}`}
          ref={(el) => {
            if (el) itemsRef.current[i] = el;
          }}
        >
          <img
            className={styles.image}
            src={frame.src}
            width={frame.width}
            height={frame.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}
