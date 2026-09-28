"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui-store";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion";
import BrandMark from "@/components/BrandMark";
import GlassControl from "@/components/primitives/GlassControl";
import styles from "./MobileMenu.module.css";

/**
 * Full-screen mobile navigation surface.
 *
 * Minimal editorial composition: brand top-left, close top-right, four
 * individually-shaped floating navigation pieces near the centre, and a
 * small centred information cluster at the bottom. Labels/order come from
 * the shared ROUTES registry so hrefs stay in a single source of truth.
 *
 * Each item carries its own shape (by position) so the four read as one
 * coherent system rather than four identical full-width buttons:
 *   1st → soft square · 2nd → circle · 3rd → pill · 4th → block
 *
 * Labels/destinations come from the shared NAV_ROUTES registry so the mobile
 * menu stays identical to the desktop navigation.
 */
const TREATMENTS = ["tSoftSquare", "tCircle", "tPill", "tBlock"] as const;

const MOBILE_NAV = NAV_ROUTES;

export default function MobileMenu() {
  const { mobileMenuOpen, setMobileMenuOpen } = useUI();
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  /* ---- Entrance / exit motion (existing GSAP vocabulary) ---- */
  useEffect(() => {
    const layer = layerRef.current;
    const surface = surfaceRef.current;
    if (!layer || !surface) return;

    const nav = surface.querySelectorAll<HTMLElement>("[data-menu-item]");
    const foot = surface.querySelectorAll<HTMLElement>("[data-menu-foot]");
    const reduced = prefersReducedMotion();

    gsap.killTweensOf([layer, surface, ...Array.from(nav), ...Array.from(foot)]);

    if (mobileMenuOpen) {
      if (reduced) {
        gsap.set(layer, { autoAlpha: 1 });
        gsap.set(surface, { autoAlpha: 1, y: 0 });
        gsap.set([nav, foot], { autoAlpha: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline();
      tl.set(layer, { autoAlpha: 1 });
      // 1. menu surface appears
      tl.fromTo(surface, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.32, ease: EASE.out }, 0);
      // 2. navigation pieces reveal with a gentle stagger
      tl.fromTo(
        nav,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.46, ease: EASE.out, stagger: 0.07 },
        0.1,
      );
      // 3. footer information appears afterward
      tl.fromTo(
        foot,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.44, ease: EASE.out, stagger: 0.05 },
        0.34,
      );
      return;
    }

    if (reduced) {
      gsap.set(layer, { autoAlpha: 0 });
      return;
    }
    const tl = gsap.timeline();
    tl.to(foot, { autoAlpha: 0, y: 8, duration: 0.2, ease: EASE.inOut, stagger: 0.03 }, 0);
    tl.to(nav, { autoAlpha: 0, y: 10, duration: 0.24, ease: EASE.inOut, stagger: 0.03 }, 0.04);
    tl.to(surface, { autoAlpha: 0, duration: 0.26, ease: EASE.inOut }, 0.12);
    tl.set(layer, { autoAlpha: 0 });
  }, [mobileMenuOpen]);

  /* ---- Scroll lock + ESC + focus management ---- */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 80);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      body.style.overflow = prevOverflow;
      openerRef.current?.focus?.();
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <div
      ref={layerRef}
      id="vs-mobile-nav"
      className={styles.layer}
      data-open={mobileMenuOpen ? "true" : "false"}
      aria-hidden={!mobileMenuOpen}
    >
      <div
        ref={surfaceRef}
        className={styles.surface}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        {/* ---- Top row: V:/ brand (left) · Close (right) ---- */}
        <div className={styles.top}>
          <div data-menu-item>
            <BrandMark />
          </div>
          <div data-menu-item>
            <GlassControl
              ref={closeRef}
              size="md"
              variant="clear"
              className={styles.close}
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              Close
            </GlassControl>
          </div>
        </div>

        {/* ---- Centre: floating navigation pieces ---- */}
        <nav className={styles.nav} aria-label="Mobile primary">
          <ul className={styles.navList}>
            {MOBILE_NAV.map((route, index) => {
              const active = isRouteActive(route, pathname);
              const treatment = styles[TREATMENTS[index % TREATMENTS.length]];
              return (
                <li key={route.command} data-menu-item>
                  <Link
                    href={route.href}
                    className={[styles.navItem, treatment, active ? styles.navActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={active ? "page" : undefined}
                    tabIndex={mobileMenuOpen ? 0 : -1}
                  >
                    {route.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---- Bottom: centred information cluster ---- */}
        <div className={styles.footer}>
          <div className={styles.footBlock} data-menu-foot>
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

          <div className={styles.footBlock} data-menu-foot>
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

          <div className={styles.legal} data-menu-foot>
            <span className={styles.copy}>© 2026 Voyagerscape</span>
            <Link
              className={styles.footLink}
              href="/privacy"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
