"use client";

/* ==================================================================
   TEMPORARY VISUAL PROTOTYPE — FAKE TERMINAL PANEL MOTION
   ==================================================================
   A solid rectangle stands in for the terminal so the physical
   side-entry motion can be judged on its own. Nothing here is
   production-shaped: no constants module, no shared ease, no
   breakpoint logic, no variables.

     OPEN:   panel xPercent 100 -> 0   (in from the right)
             content x 0 -> -100px     (slight leftward shift)
     CLOSE:  the same two movements reversed.

   Both tweens are created in the same commit with the same duration and
   ease, so they start and finish together. Nothing else moves.
   ================================================================== */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useUI } from "@/lib/ui-store";
import styles from "./PanelMotionPrototype.module.css";

const DURATION = 0.65;
const EASE = "power3.out";
const CONTENT_SHIFT = -100;

export default function PanelMotionPrototype() {
  const { terminalOpen } = useUI();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tweensRef = useRef<gsap.core.Tween[]>([]);
  const startedRef = useRef(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  /* Portal onto <body> so the panel is outside the content element it
     is pushing around. */
  useEffect(() => setHost(document.body), []);

  /* Take the real terminal out of the picture for the experiment. Its code
     is untouched and its "/" and ESC handlers keep running — they are what
     drives this prototype. Unmounting the prototype restores it. */
  useEffect(() => {
    const terminal = document.getElementById("vs-command-terminal");
    if (!terminal) return undefined;
    const previous = terminal.style.display;
    terminal.style.display = "none";
    return () => {
      terminal.style.display = previous;
    };
  }, []);

  /* The content element ships with a CSS transform transition. Switch it
     off for the experiment so GSAP is the only thing driving it — left on,
     the transition would chase the tween and smear the movement. Restored
     when the prototype unmounts; AppShell's stylesheet is not touched. */
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('[class*="AppShell_website"]');
    if (!content) return undefined;
    const previous = content.style.transition;
    content.style.transition = "none";
    return () => {
      content.style.transition = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    /* The existing website content element (AppShell's .website). */
    const content = document.querySelector<HTMLElement>('[class*="AppShell_website"]');

    tweensRef.current.forEach((tween) => tween.kill());

    /* First pass only: park the panel off-screen. */
    if (!startedRef.current) {
      startedRef.current = true;
      gsap.set(panel, { xPercent: 100 });
      return;
    }

    if (terminalOpen) {
      gsap.set(panel, { xPercent: 100, visibility: "visible" });
      const tweens = [gsap.to(panel, { xPercent: 0, duration: DURATION, ease: EASE })];
      if (content) {
        tweens.push(gsap.to(content, { x: CONTENT_SHIFT, duration: DURATION, ease: EASE }));
      }
      tweensRef.current = tweens;
      return;
    }

    const tweens = [
      gsap.to(panel, {
        xPercent: 100,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          gsap.set(panel, { visibility: "hidden" });
        },
      }),
    ];
    if (content) {
      tweens.push(gsap.to(content, { x: 0, duration: DURATION, ease: EASE }));
    }
    tweensRef.current = tweens;
  }, [terminalOpen, host]);

  if (!host) return null;

  return createPortal(
    <div ref={panelRef} className={styles.panel} data-panel-prototype aria-hidden="true" />,
    host,
  );
}
