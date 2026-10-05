"use client";

import styles from "./AppBackdrop.module.css";

/**
 * Global viewport-level visual backing surface.
 * Provides a deterministic, painted base surface (--vs-bg) across all routes
 * for fixed glass chrome (SiteHeader, ThemeToggle, NavMenu) and page transitions.
 */
export default function AppBackdrop() {
  return <div className={styles.backdrop} aria-hidden="true" />;
}
