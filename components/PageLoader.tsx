"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./PageLoader.module.css";

const STAGES = ["BOOT", "LINK", "READY"];

/** Short technical boot sequence. Exits as soon as the document is ready. */
export default function PageLoader() {
  const { markLoaded } = useUI();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let stageTimer = 0;
    let exitTimer = 0;

    const advance = () => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    };
    stageTimer = window.setInterval(advance, reduced ? 90 : 230);

    const finish = () => {
      window.clearInterval(stageTimer);
      setStage(STAGES.length - 1);
      const elapsed = performance.now() - start;
      const minimum = reduced ? 200 : 620;
      const wait = Math.max(0, minimum - elapsed);

      exitTimer = window.setTimeout(() => {
        const root = rootRef.current;
        const complete = () => {
          setDone(true);
          markLoaded();
        };
        if (!root || reduced) {
          complete();
          return;
        }
        gsap
          .timeline({ onComplete: complete })
          .to(root.querySelectorAll("[data-loader-item]"), {
            opacity: 0,
            y: -8,
            duration: 0.3,
            ease: "power2.in",
            stagger: 0.04,
          })
          .to(root, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "-=0.1");
      }, wait);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.clearInterval(stageTimer);
      window.clearTimeout(exitTimer);
      window.removeEventListener("load", finish);
    };
  }, [markLoaded]);

  if (done) return null;

  return (
    <div className={styles.root} ref={rootRef} role="status" aria-live="polite">
      <div className={styles.inner}>
        <span className={styles.word} data-loader-item>
          Voyagerscape
        </span>
        <div className={styles.meta} data-loader-item>
          <TechLabel nano>{STAGES[stage]}</TechLabel>
          <span className={styles.track} aria-hidden="true">
            <span
              className={styles.fill}
              style={{ transform: `scaleX(${(stage + 1) / STAGES.length})` }}
            />
          </span>
          <TechLabel nano>V:/ 01</TechLabel>
        </div>
      </div>
    </div>
  );
}
