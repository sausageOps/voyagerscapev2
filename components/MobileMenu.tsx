"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui-store";
import { useTheme } from "@/lib/theme-provider";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import { mountRotation } from "@/lib/rotating-words";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { SeriesPill } from "@/components/ColoniaPillPrototype/ColoniaPillPrototype";
import styles from "./MobileMenu.module.css";

const NAV_SHAPES = [
  { className: styles.tSoftSquare, radius: 18 },
  { className: styles.tCircle, radius: 9999 },
  { className: styles.tPill, radius: 9999 },
  { className: styles.tBlock, radius: 10 },
] as const;

const MENU_WORD_SETS = [
  { words: ["Home", "Explore", "Discover", "Wander"], hold: 2.8 },
  { words: ["Art", "Visual", "Frame", "Photography"], hold: 3.3 },
  { words: ["Connect", "Reach", "Link", "Contact"], hold: 2.9 },
  { words: ["About", "Story", "Origin", "Journey"], hold: 3.6 },
] as const;

/** All pills finish their approved entrance by 1.14s. The small per-pill
 * trail keeps the first word rolls editorial rather than simultaneous. */
const ROTATION_LEAD_INS = [1.25, 1.57, 1.89, 2.21] as const;

/** Mobile navigation side-sheet, sharing the site's solid theme-aware panel styling. */
export default function MobileMenu() {
  const { mobileMenuOpen, setMobileMenuOpen } = useUI();
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();
  const layerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const rotationRefs = useRef<Array<HTMLLIElement | null>>([]);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), [setMobileMenuOpen]);

  useSwipeToClose(layerRef, mobileMenuOpen, closeMenu);

  /* Reuse the hero/footer rotation engine only while the menu is open. */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const cleanups = MENU_WORD_SETS.map((slot, index) => {
      const root = rotationRefs.current[index];
      if (!root) return undefined;
      return mountRotation(root, {
        slots: [slot.words],
        offsets: [0],
        hold: slot.hold,
        leadIn: ROTATION_LEAD_INS[index],
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, [mobileMenuOpen]);

  /* Scroll lock, Escape handling, and focus handoff remain independent of motion. */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 120);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTheme(themeButtonRef.current);
  };

  return (
    <aside
      ref={layerRef}
      id="vs-mobile-nav"
      className={styles.layer}
      data-open={mobileMenuOpen ? "true" : "false"}
      aria-hidden={!mobileMenuOpen}
    >
      <div className={styles.surface} role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className={styles.top}>
          {/* Left: Complete Web/Tablet Left Physical Navigation Unit [ ◉ | V:/ ] */}
          <SeriesPill onHomeClick={() => setMobileMenuOpen(false)} />

          {/* Right: Physical theme toggle & Close button */}
          <div className={styles.topRight}>
            <button
              ref={themeButtonRef}
              type="button"
              className={styles.themeCircle}
              onClick={handleThemeToggle}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.themeIcon}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.themeIcon}
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              Close
            </button>
          </div>
        </div>

        <nav
          className={styles.nav}
          aria-label="Mobile primary"
        >
          <ul className={styles.navList}>
            {NAV_ROUTES.map((route, index) => {
              const active = isRouteActive(route, pathname);
              const shape = NAV_SHAPES[index % NAV_SHAPES.length];
              const slot = MENU_WORD_SETS[index];
              return (
                <li
                  key={route.command}
                  ref={(node) => {
                    rotationRefs.current[index] = node;
                  }}
                >
                  <Link
                    href={route.href}
                    className={`${styles.navItem} ${shape.className}`}
                    aria-current={active ? "page" : undefined}
                    aria-label={slot.words[0]}
                    tabIndex={mobileMenuOpen ? 0 : -1}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className={styles.wordWindow} data-identity-window aria-hidden="true">
                      <span className={styles.wordSizer}>{slot.words[0]}</span>
                      {slot.words.map((word, wordIndex) => (
                        <span
                          className={[
                            styles.rotatingWord,
                            wordIndex > 0 ? styles.dormantWord : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          data-identity-word
                          key={word}
                        >
                          {word}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.footer}>
          <div className={styles.footBlock}>
            <span className={`${styles.footLabel} ${styles.footLabelConnect}`}>Connect</span>
            <span className={styles.socials}>
              <a
                className={styles.footLink}
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                LinkedIn
              </a>
              <a
                className={styles.footLink}
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                Instagram
              </a>
            </span>
          </div>

          <div className={styles.footBlock}>
            <span className={`${styles.footLabel} ${styles.footLabelEnquiries}`}>
              General Enquiries
            </span>
            <a
              className={styles.footLink}
              href="mailto:hello@voyagerscape.co"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              hello@voyagerscape.co
            </a>
          </div>

          <div className={styles.legal}>
            <span className={styles.copy}>© 2026 Voyagerscape</span>
            <Link
              className={styles.footLink}
              href="/privacy"
              tabIndex={mobileMenuOpen ? 0 : -1}
              onClick={() => setMobileMenuOpen(false)}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
