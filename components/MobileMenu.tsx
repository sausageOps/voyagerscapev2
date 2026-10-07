"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { CustomEase } from "gsap/CustomEase";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { getTransitionColor } from "@/components/RouteTransitionVariants";
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

const MENU_WIPE_EASE_NAME = "vs-mobile-menu-wipe";
let menuWipeEaseRegistered = false;
let lastMenuWipeCombo: string | null = null;

function ensureMenuWipeEase(): string {
  if (!menuWipeEaseRegistered) {
    CustomEase.create(MENU_WIPE_EASE_NAME, "0.65, 0.01, 0.05, 0.99");
    menuWipeEaseRegistered = true;
  }
  return MENU_WIPE_EASE_NAME;
}

/** Use the existing theme-aware transition palette source for three distinct sheets. */
function nextMenuWipeCombo(): string[] {
  const combo: string[] = [];
  for (let attempts = 0; attempts < 32 && combo.length < 3; attempts += 1) {
    const color = getTransitionColor();
    if (!combo.includes(color)) combo.push(color);
  }
  while (combo.length < 3) combo.push(getTransitionColor());

  let nextCombo = combo;
  if (nextCombo.join() === lastMenuWipeCombo) {
    nextCombo = [nextCombo[1], nextCombo[2], nextCombo[0]];
  }
  lastMenuWipeCombo = nextCombo.join();
  return nextCombo;
}

/** Shared responsive navigation surface, available across Mobile, Tablet, and Web. */
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

  useSwipeToClose(layerRef, mobileMenuOpen, closeMenu, {
    preserveTransformOnClose: true,
    activationQuery: "(max-width: 767px), (max-width: 1099px) and (hover: none), (pointer: coarse), (any-pointer: coarse)",
    horizontalDominance: 1.2,
  });

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    const surface = layer.querySelector<HTMLElement>("[data-menu-panel]");
    const palettePanels = Array.from(layer.querySelectorAll<HTMLElement>("[data-menu-palette-panel]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-menu-block]"));
    const navRows = Array.from(layer.querySelectorAll<HTMLElement>("[data-menu-nav-row]"));
    const footerRows = Array.from(layer.querySelectorAll<HTMLElement>("[data-menu-footer-row]"));
    if (!surface || palettePanels.length !== 3) return undefined;

    timelineRef.current?.kill();

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = mobileMenuOpen;
    const ease = ensureMenuWipeEase();

    const layerDragX = (): number => {
      const matrix = window.getComputedStyle(layer).transform.match(/^matrix(3d)?\((.+)\)$/);
      if (!matrix) return 0;
      const values = matrix[2].split(",");
      const xIndex = matrix[1] === "3d" ? 12 : 4;
      return parseFloat(values[xIndex]) || 0;
    };

    const cleanupContent = () => {
      gsap.set([...palettePanels, ...blocks, ...navRows, ...footerRows, surface], {
        clearProps: "all",
      });
    };
    const cleanupClosed = () => {
      gsap.set(layer, { visibility: "hidden" });
      cleanupContent();
      gsap.set(layer, { clearProps: "all" });
    };

    if (prefersReducedMotion()) {
      if (mobileMenuOpen) {
        cleanupContent();
        gsap.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" });
        gsap.set(surface, { x: 0 });
        const tl = gsap.timeline();
        tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "none" })
          .call(cleanupContent);
        timelineRef.current = tl;
      } else if (wasOpen) {
        const dragX = layerDragX();
        gsap.set(layer, { x: dragX, xPercent: 0, pointerEvents: "none" });
        const tl = gsap.timeline();
        tl.to(layer, { autoAlpha: 0, duration: 0.16, ease: "none" }).call(cleanupClosed);
        timelineRef.current = tl;
      }

      return () => {
        timelineRef.current?.kill();
      };
    }

    if (mobileMenuOpen) {
      const combo = nextMenuWipeCombo();
      palettePanels.forEach((palettePanel, index) => {
        palettePanel.style.background = combo[index];
      });

      const paletteDuration = 0.42;
      const paletteStagger = 0.075;
      const paletteEnd = paletteDuration + paletteStagger * (palettePanels.length - 1);
      const blockStart = 0.36;
      const blockDuration = 0.12;
      const navStart = paletteEnd;
      const navDuration = 0.16;
      const navStagger = 0.02;
      const footerStart = paletteEnd + 0.03;
      const footerDuration = 0.12;
      const footerStagger = 0.03;

      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" }, 0)
        .set(surface, { x: 0 }, 0)
        .set(palettePanels, { autoAlpha: 1 }, 0)
        .fromTo(
          palettePanels,
          { xPercent: 101 },
          {
            xPercent: 0,
            duration: paletteDuration,
            stagger: paletteStagger,
            ease,
          },
          0,
        )
        .fromTo(
          blocks,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: blockDuration, ease },
          blockStart,
        )
        .fromTo(
          navRows,
          { autoAlpha: 0, yPercent: 100, rotate: 5 },
          {
            autoAlpha: 1,
            yPercent: 0,
            rotate: 0,
            duration: navDuration,
            stagger: navStagger,
            ease,
          },
          navStart,
        )
        .fromTo(
          footerRows,
          { autoAlpha: 0, y: 14, rotate: 1.2 },
          {
            autoAlpha: 1,
            y: 0,
            rotate: 0,
            duration: footerDuration,
            stagger: footerStagger,
            ease,
          },
          footerStart,
        );

      return () => {
        timelineRef.current?.kill();
      };
    }

    if (!wasOpen) {
      return () => {
        timelineRef.current?.kill();
      };
    }

    const dragX = layerDragX();
    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.set(layer, { x: dragX, xPercent: 0, pointerEvents: "none" }, 0)
      .to(blocks, { autoAlpha: 0, y: 20, rotate: 1, duration: 0.24, stagger: 0.02, ease }, 0)
      .to(
        [...navRows, ...footerRows],
        {
          autoAlpha: 0,
          y: 22,
          rotate: 1,
          duration: 0.24,
          stagger: { each: 0.016, from: "end" },
          ease,
        },
        0,
      )
      .to(layer, { x: 0, xPercent: 120, duration: 0.575, ease }, 0)
      .call(cleanupClosed);

    return () => {
      timelineRef.current?.kill();
    };
  }, [mobileMenuOpen]);

  const renderedThemeRef = useRef(isDark);

  useEffect(() => {
    const themeChanged = renderedThemeRef.current !== isDark;
    renderedThemeRef.current = isDark;
    if (!themeChanged || !mobileMenuOpen) return;

    const palettePanels = Array.from(
      layerRef.current?.querySelectorAll<HTMLElement>("[data-menu-palette-panel]") ?? [],
    );
    if (palettePanels.length !== 3) return;

    const combo = nextMenuWipeCombo();
    palettePanels.forEach((palettePanel, index) => {
      palettePanel.style.background = combo[index];
    });
  }, [isDark, mobileMenuOpen]);

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
    const focusDelay = prefersReducedMotion() ? 220 : 1300;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), focusDelay);

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
      <div
        className={styles.surface}
        data-menu-panel
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className={styles.paletteStack} aria-hidden="true">
          <span className={styles.palettePanel} data-menu-palette-panel />
          <span className={styles.palettePanel} data-menu-palette-panel />
          <span className={styles.palettePanel} data-menu-palette-panel />
        </div>
        <div className={styles.contentLayer}>
          <div className={styles.top} data-menu-block>
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
                    data-menu-nav-row
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
            <div className={styles.footBlock} data-menu-footer-row>
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

            <div className={styles.footBlock} data-menu-footer-row>
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

            <div className={styles.legal} data-menu-footer-row>
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
      </div>
    </aside>
  );
}
