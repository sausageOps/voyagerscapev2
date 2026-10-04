"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import NavGlassSurface from "./NavGlassSurface";
import styles from "./BrandMark.module.css";

const BRAND_NAME = "Voyagerscape";

/**
 * Top-left identity control: one React Bits Glass Surface that expands from
 * the compact V:/ mark into the full site name. The in-flow ghost reserves
 * only the resting footprint, so the header layout never moves.
 */
export default function BrandMark({ compact }: { compact?: boolean }) {
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const name = root.querySelector<HTMLElement>("[data-brand-name]");
      if (!name) return;
      root.style.setProperty(
        "--brand-expanded-w",
        `${Math.ceil(name.getBoundingClientRect().width + 20)}px`,
      );
    };

    measure();
    if (document.fonts?.status !== "loaded") void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <span
      className={[styles.root, compact ? styles.compact : ""].filter(Boolean).join(" ")}
      ref={rootRef}
    >
      <span className={styles.ghost} aria-hidden="true" />
      <Link
        href="/"
        className={styles.mark}
        aria-label="Voyagerscape — home"
        data-cursor="link"
        data-cursor-label="Home"
      >
        <NavGlassSurface
          width="var(--brand-width)"
          height="var(--brand-height)"
          borderRadius={9999}
          borderWidth={0.08}
          brightness={62}
          opacity={0.9}
          blur={8}
          displace={0.2}
          backgroundOpacity={0.14}
          saturation={1.08}
          distortionScale={-76}
          redOffset={0}
          greenOffset={0}
          blueOffset={0}
          className={styles.surface}
        >
          <span className={styles.content} aria-hidden="true">
            <span className={styles.rest}><span className={styles.restPrefix}>V:</span><span className={styles.restCaret}>/</span></span>
            <span className={styles.name} data-brand-name>
              {BRAND_NAME}
            </span>
          </span>
        </NavGlassSurface>
      </Link>
    </span>
  );
}
