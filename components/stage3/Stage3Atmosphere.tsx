"use client";

/* =========================================================
   STAGE 3 — ATMOSPHERE PROTOTYPE (ISOLATED)

   The prototype's own frame. Deliberately self-contained:

   - it is a fixed, full-viewport surface, so the prototype can
     be judged on its own without editing AppShell, the header,
     the footer, the route transition or any other shared
     component — nothing outside components/stage3/ and
     app/stage3-atmosphere/ is touched;
   - it is rendered through a portal onto <body>. RouteTransition
     wraps the routed <main> in a div that GSAP transforms during
     its intro and page sweeps, and a transformed ancestor
     re-bases `position: fixed` onto itself. Portalling out of
     that subtree is what keeps the frame genuinely static
     without having to change RouteTransition;
   - the frame geometry (16px inset / 18px radius, 8/16 on small
     screens) mirrors the proportions of the existing Voyagerscape
     frame, but is its own CSS. It imports nothing from HomeCanvas
     and changes nothing there;
   - the frame never moves, never scales, never animates. Only the
     colour inside it evolves.
   ========================================================= */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AtmosphereField from "./AtmosphereField";
import styles from "./Stage3Atmosphere.module.css";

export default function Stage3Atmosphere() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* The prototype owns the viewport while it is mounted. Scroll is locked
     here rather than globally so nothing leaks to any other route, and the
     previous inline values are restored verbatim on unmount. */
  useEffect(() => {
    const root = document.documentElement;
    const { body } = document;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevRootOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.root} data-stage3-preview>
      <h1 className="vs-sr-only">Stage 3 atmosphere prototype</h1>
      <div className={styles.frame}>
        <AtmosphereField />
      </div>
    </div>,
    document.body,
  );
}
