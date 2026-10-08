"use client";

import { useEffect, useRef, type Ref } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme-provider";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import { mountRotation } from "@/lib/rotating-words";
import { SeriesPill } from "@/components/ColoniaPillPrototype/ColoniaPillPrototype";
import styles from "./MobileMenu.module.css";

/**
 * NAV SURFACE — the Voyagerscape menu itself, in one place.
 * ========================================================
 *
 * This is the approved Studio menu (Web, Tablet and Mobile all use it): the
 * physical nav unit and theme toggle, the four destination rows with their
 * shape system and rolling words, and the contact/legal footer. It used to
 * live inside the old fixed right-edge overlay; it was lifted out of that
 * shell unchanged so the menu has exactly one home.
 *
 * It is now rendered in ONE place — the site's right-hand menu page
 * (`TosExperiment/TosTerminalWindow`), which every entry point opens: the
 * header's ROUTES control (Web/Tablet) and the mobile pill. The old overlay
 * host is gone, so there is no second rendering path that could drift from
 * this one.
 *
 * There is exactly ONE implementation of the menu. Labels, typography,
 * spacing, the shape/rotation vocabulary, the theme button and the footer
 * links all come from here and from `MobileMenu.module.css` (the stylesheet
 * that has always carried them, and which `SiteFooter` also composes from)
 * — no second set of styles, no approximated markup.
 *
 * The host owns the shell (positioning, size, open/close motion) and passes
 * `active`, which is the menu's on-screen state: it makes rows focusable and
 * starts the rolling-word engine. The `dialog` prop distinguishes the
 * production overlay semantics from the embedded instance, which is a
 * region inside a page rather than a modal over one.
 */

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

export interface NavSurfaceProps {
  /** On screen? Focusability and the rotation engine follow this. */
  active: boolean;
  /** Production overlay semantics (role="dialog" + aria-modal). */
  dialog?: boolean;
  /** Anchor id — the header's ROUTES control points `aria-controls` here. */
  id?: string;
  label?: string;
  navLabel?: string;
  onClose: () => void;
  /** Destination chosen. Hosts dismiss themselves the same way in both cases. */
  onNavigate: () => void;
  /** Focus target handoff for the production host. */
  closeRef?: Ref<HTMLButtonElement>;
}

export default function NavSurface({
  active,
  dialog = false,
  id,
  label = "Navigation menu",
  navLabel = "Mobile primary",
  onClose,
  onNavigate,
  closeRef,
}: NavSurfaceProps) {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);
  const rotationRefs = useRef<Array<HTMLLIElement | null>>([]);

  /* Reuse the hero/footer rotation engine only while the surface is on
     screen — exactly the lifecycle the menu always had. */
  useEffect(() => {
    if (!active) return undefined;

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
  }, [active]);

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTheme(themeButtonRef.current);
  };

  return (
    <div
      id={id}
      className={styles.surface}
      data-menu-panel
      role={dialog ? "dialog" : "region"}
      aria-modal={dialog ? "true" : undefined}
      aria-label={label}
    >
      <div className={styles.paletteStack} aria-hidden="true">
        <span className={styles.palettePanel} data-menu-palette-panel />
        <span className={styles.palettePanel} data-menu-palette-panel />
        <span className={styles.palettePanel} data-menu-palette-panel />
      </div>
      <div className={styles.contentLayer}>
        <div className={styles.top} data-menu-block>
          {/* Left: Complete Web/Tablet Left Physical Navigation Unit [ ◉ | V:/ ] */}
          <SeriesPill onHomeClick={onNavigate} />

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
              onClick={onClose}
              aria-label="Close navigation"
              tabIndex={active ? 0 : -1}
            >
              Close
            </button>
          </div>
        </div>

        <nav className={styles.nav} aria-label={navLabel}>
          <ul className={styles.navList}>
            {NAV_ROUTES.map((route, index) => {
              const isActive = isRouteActive(route, pathname);
              const shape = NAV_SHAPES[index % NAV_SHAPES.length];
              const slot = MENU_WORD_SETS[index];
              return (
                <li
                  key={route.command}
                  data-menu-nav-row
                  ref={(node) => {
                    rotationRefs.current[index] = node;
                  }}
                >
                  <Link
                    href={route.href}
                    className={`${styles.navItem} ${shape.className}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={slot.words[0]}
                    tabIndex={active ? 0 : -1}
                    onClick={onNavigate}
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
          <div className={styles.footBlock} data-menu-footer-row>
            <span className={`${styles.footLabel} ${styles.footLabelConnect}`}>Connect</span>
            <span className={styles.socials}>
              <a
                className={styles.footLink}
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={active ? 0 : -1}
              >
                LinkedIn
              </a>
              <a
                className={styles.footLink}
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={active ? 0 : -1}
              >
                Instagram
              </a>
            </span>
          </div>

          <div className={styles.footBlock} data-menu-footer-row>
            <span className={`${styles.footLabel} ${styles.footLabelEnquiries}`}>
              General Enquiries
            </span>
            <a
              className={styles.footLink}
              href="mailto:hello@voyagerscape.co"
              tabIndex={active ? 0 : -1}
            >
              hello@voyagerscape.co
            </a>
          </div>

          <div className={styles.legal} data-menu-footer-row>
            <span className={styles.copy}>© 2026 Voyagerscape</span>
            <Link
              className={styles.footLink}
              href="/privacy"
              tabIndex={active ? 0 : -1}
              onClick={onNavigate}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
