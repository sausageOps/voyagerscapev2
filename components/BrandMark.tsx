"use client";

import Link from "next/link";
import styles from "./BrandMark.module.css";

/** Original Voyagerscape terminal glyph: V:/ inside a soft black chip. */
export default function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={[styles.mark, compact ? styles.compact : ""].filter(Boolean).join(" ")}
      aria-label="Voyagerscape — home"
      data-cursor="link"
      data-cursor-label="Home"
      data-magnetic
    >
      <span className={styles.glyph} aria-hidden="true">
        <span className={styles.v}>V</span>
        <span className={styles.colon}>:</span>
        <span className={styles.slash}>/</span>
      </span>
      <span className={styles.caret} aria-hidden="true" />
    </Link>
  );
}
