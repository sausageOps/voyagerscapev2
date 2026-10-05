"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ROUTES, isRouteActive, type RouteDef } from "@/lib/routes";
import { useRouteTransition } from "@/components/RouteTransition";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import styles from "./ColoniaPillPrototype.module.css";
import { MergingBubbles } from "./MergingBubbles";
import { RollText } from "./RollText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip, CustomEase);
  try {
    CustomEase.create(
      "navPhysical",
      "M0,0 C0.16,0.9 0.28,1.02 0.55,1.008 0.78,1.002 1,1 1,1",
    );
    CustomEase.create(
      "navPhysicalClose",
      "M0,0 C0.18,0.85 0.32,1.015 0.58,1.006 0.82,1.001 1,1 1,1",
    );
  } catch {
    /* ease registered */
  }
}

const VOYAGERSCAPE_LETTERS = "VOYAGERSCAPE".split("");

export interface ColoniaPillPrototypeProps {
  className?: string;
  onHomeClick?: () => void;
  onWatchClick?: () => void;
  onRoutesClick?: () => void;
  onDashClick?: () => void;
  onTargetClick?: () => void;
  onThemeClick?: () => void;
  onTerminalClick?: () => void;
  onRouteSelect?: (route: RouteDef) => void;
  initialExpanded?: boolean;
}

/**
 * Experience Japan Pictograms / Dynamic Navigation Icons Rotator
 * ===============================================================
 * Automatically loads all SVG files placed in the public navigation icon directory:
 * `public/icons/nav/` (or `public/ejp-pictograms/`)
 * and rotates through all 17 icons with exact 1500ms (1.5s) cadence.
 *
 * Theme-reactive: Uses CSS mask rendering so all icons automatically inherit
 * `var(--vs-nav-disc-ink)` (black in Day mode, warm cream #F1EEE5 in Night mode).
 */
export function MediaPixelSignal({
  className = "",
  glowClassName = "",
}: {
  className?: string;
  glowClassName?: string;
}) {
  const [iconList, setIconList] = useState<string[]>([]);
  const [iconIndex, setIconIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all SVGs available in public/icons/nav/
  useEffect(() => {
    let isMounted = true;

    const fetchIcons = async () => {
      try {
        const res = await fetch("/api/nav-icons");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.icons) && data.icons.length > 0) {
            setIconList(data.icons);
            // Preload all SVG icon assets into browser cache for instant rendering
            data.icons.forEach((src: string) => {
              const img = new Image();
              img.src = src;
            });
          }
        }
      } catch {
        /* fallback */
      }
    };

    fetchIcons();
    // Poll periodically so when files are placed in the directory, they are detected automatically
    const pollInterval = setInterval(fetchIcons, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Exact 1500ms (1.5 seconds) rotation cadence
  useEffect(() => {
    const totalCount = iconList.length > 0 ? iconList.length : 1;
    const interval = setInterval(() => {
      setIsRefreshing(true);
      const switchTimer = setTimeout(() => {
        setIconIndex((prev) => (prev + 1) % totalCount);
        setIsRefreshing(false);
      }, 160);

      return () => clearTimeout(switchTimer);
    }, 1500);

    return () => clearInterval(interval);
  }, [iconList.length]);

  const activeSvgPath = iconList.length > 0 ? iconList[iconIndex % iconList.length] : null;

  return (
    <>
      <span
        className={`${styles.signalGlow} ${isRefreshing ? styles.signalGlowPulse : ""} ${glowClassName}`.trim()}
        aria-hidden="true"
      />
      <span
        className={`${styles.signalIconWrap} ${isRefreshing ? styles.signalIconWrapFade : ""} ${className}`.trim()}
        aria-hidden="true"
      >
        {activeSvgPath ? (
          <span
            className={styles.signalIconMask}
            style={{
              maskImage: `url("${activeSvgPath}")`,
              WebkitMaskImage: `url("${activeSvgPath}")`,
            }}
            aria-hidden="true"
          />
        ) : (
          /* Placeholder disc signal while SVGs are being placed */
          <svg
            viewBox="0 0 24 24"
            className={styles.signalIcon}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 4 8.5 L 4 4.5 L 8.5 4.5" />
            <path d="M 15.5 4.5 L 20 4.5 L 20 8.5" />
            <path d="M 4 15.5 L 4 19.5 L 8.5 19.5" />
            <path d="M 15.5 19.5 L 20 19.5 L 20 15.5" />
            <rect x="6.5" y="8.5" width="11" height="8" rx="1.5" />
            <path d="M 9.5 8.5 V 7 H 12.5 V 8.5" />
            <circle cx="12" cy="12.5" r="2.2" />
          </svg>
        )}
      </span>
    </>
  );
}

/**
 * 3 Primary Navigation Options:
 * - ART     → /art
 * - CONNECT → /connect
 * - ABOUT   → /about
 */
const PROTOTYPE_NAV_ITEMS: RouteDef[] = [
  ROUTES.find((r) => r.href === "/art") ?? { label: "Art", href: "/art", command: "art", ready: false },
  ROUTES.find((r) => r.href === "/connect") ?? { label: "Connect", href: "/connect", command: "connect", ready: true },
  ROUTES.find((r) => r.href === "/about") ?? { label: "About", href: "/about", command: "about", ready: false },
];

/**
 * Reusable Complete Left-Side Physical Navigation Unit [ ◉ | V:/ ]
 * Matches 100% of Web/Tablet physical pill styling, concentric media disc,
 * rotating icon mask, blinking cursor slash, and Day/Night surface colors.
 */
export function SeriesPill({
  className = "",
  onHomeClick,
  flipId,
}: {
  className?: string;
  onHomeClick?: () => void;
  flipId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  let routeTransition: { navigate: (href: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routeTransition = useRouteTransition();
  } catch {
    routeTransition = null;
  }

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHomeClick?.();

    if (pathname === "/") return;

    if (routeTransition) {
      routeTransition.navigate("/");
    } else {
      router.push("/");
    }
  };

  return (
    <div
      className={`${styles.seriesPill} ${className}`.trim()}
      {...(flipId ? { "data-flip-id": flipId } : {})}
    >
      <button
        type="button"
        className={styles.playDisc}
        onClick={handleHomeClick}
        aria-label="Voyagerscape home"
        data-cursor="link"
        data-cursor-label="Home"
        {...(flipId ? { "data-flip-id": "play-disc" } : {})}
      >
        <MediaPixelSignal />
      </button>
      <button
        type="button"
        className={styles.vSlashLabel}
        onClick={handleHomeClick}
        aria-label="Voyagerscape home"
        data-cursor="link"
        data-cursor-label="Home"
      >
        <span>V:</span>
        <span className={styles.cursorSlash}>/</span>
      </button>
    </div>
  );
}

/**
 * COLONIA PILL PROTOTYPE — GSAP FLIP PHYSICAL MOTION SYSTEM
 * ============================================================
 *
 * Layout Interpolation Architecture:
 * - GSAP Flip interpolates continuous bounding boxes between CLOSED and OPEN states.
 * - Solid black physical shapes interpolate geometry without cross-fade ghosting.
 * - Symmetrical satellite sliding & settling.
 */
export default function ColoniaPillPrototype({
  className = "",
  onHomeClick,
  onWatchClick,
  onRoutesClick,
  onDashClick,
  onTargetClick,
  onThemeClick,
  onTerminalClick,
  onRouteSelect,
  initialExpanded = false,
}: ColoniaPillPrototypeProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const pathname = usePathname();
  const router = useRouter();

  // Integrated Route Transition support
  let routeTransition: ReturnType<typeof useRouteTransition> | null = null;
  try {
    routeTransition = useRouteTransition();
  } catch {
    routeTransition = null;
  }

  // DOM Refs & GSAP state management
  const voyagerscapeTextRef = useRef<HTMLButtonElement | null>(null);
  const routesButtonRef = useRef<HTMLButtonElement | null>(null);
  const vSlashTextRef = useRef<HTMLButtonElement | null>(null);
  const mediaBackPillRef = useRef<HTMLDivElement | null>(null);
  const categoryItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const satelliteRef = useRef<HTMLDivElement | null>(null);

  const isInitialMount = useRef(true);
  const flipStateRef = useRef<Flip.FlipState | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const shimmerTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Clean up timelines on unmount
  useEffect(() => {
    return () => {
      tlRef.current?.kill();
      shimmerTimelineRef.current?.kill();
    };
  }, []);

  // Automatic Ambient Text Shimmer Wave on VOYAGERSCAPE
  useEffect(() => {
    if (isExpanded) {
      shimmerTimelineRef.current?.kill();
      shimmerTimelineRef.current = null;
      return;
    }

    if (prefersReducedMotion()) {
      return;
    }

    const button = voyagerscapeTextRef.current;
    if (!button) return;

    const chars = gsap.utils.toArray<HTMLElement>(
      button.querySelectorAll("[data-shimmer-char]"),
    );
    if (!chars.length) return;

    shimmerTimelineRef.current?.kill();

    // Motion Primitives Text Shimmer Wave adapted to GSAP:
    // Continuous calm ambient wave with 3D lift, subtle scale & luminous crest, returning to rest
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.4,
    });

    shimmerTimelineRef.current = tl;

    tl.fromTo(
      chars,
      {
        y: 0,
        z: 0,
        scale: 1,
        rotateY: 0,
        opacity: 0.88,
      },
      {
        y: -1.5,
        z: 8,
        scale: 1.05,
        rotateY: 6,
        opacity: 1,
        duration: 0.38,
        ease: "sine.inOut",
        stagger: {
          each: 0.04,
          from: "start",
          repeat: 1,
          yoyo: true,
        },
      },
    );

    return () => {
      tl.kill();
      if (shimmerTimelineRef.current === tl) {
        shimmerTimelineRef.current = null;
      }
    };
  }, [isExpanded]);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHomeClick?.();
    onWatchClick?.();

    if (pathname === "/") {
      return;
    }

    if (routeTransition) {
      routeTransition.navigate("/");
    } else {
      router.push("/");
    }
  };

  const handleRoutesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) return;

    const reduced = prefersReducedMotion();

    if (tlRef.current) {
      tlRef.current.kill();
    }

    if (reduced) {
      setIsExpanded(true);
      onRoutesClick?.();
      return;
    }

    // Phase 1: Tactile press response on ROUTES button (0.00s -> 0.10s)
    if (routesButtonRef.current) {
      gsap.to(routesButtonRef.current, {
        scale: 0.965,
        duration: 0.10,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(routesButtonRef.current, {
            scale: 1,
            duration: 0.10,
            ease: "power2.out",
          });
          triggerFlipExpand();
        },
      });
    } else {
      triggerFlipExpand();
    }
  };

  const triggerFlipExpand = () => {
    // Phase 2: Capture current layout state for physical FLIP
    const state = Flip.getState("[data-flip-id]", {
      props: "transform,opacity",
      simple: false,
    });
    flipStateRef.current = state;
    setIsExpanded(true);
    onRoutesClick?.();
  };

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) return;

    const reduced = prefersReducedMotion();

    if (tlRef.current) {
      tlRef.current.kill();
    }

    if (reduced) {
      setIsExpanded(false);
      return;
    }

    // Phase 1: Back arrow tactile press (0.00s -> 0.08s)
    if (backButtonRef.current) {
      gsap.to(backButtonRef.current, {
        scale: 0.92,
        duration: 0.08,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(backButtonRef.current, {
            scale: 1,
            duration: 0.06,
            ease: "power2.out",
          });
          triggerFlipCollapse();
        },
      });
    } else {
      triggerFlipCollapse();
    }
  };

  const triggerFlipCollapse = () => {
    // Capture current open layout state
    const state = Flip.getState("[data-flip-id]", {
      props: "transform,opacity",
      simple: false,
    });
    flipStateRef.current = state;
    setIsExpanded(false);
  };

  // GSAP Flip Layout Interpolation & Content Layering
  useLayoutEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (flipStateRef.current) {
      const state = flipStateRef.current;
      flipStateRef.current = null;

      if (prefersReducedMotion()) {
        return;
      }

      if (tlRef.current) {
        tlRef.current.kill();
      }

      if (isExpanded) {
        // CLOSED -> OPEN Physical FLIP Timeline (~0.85s total)
        const tl = gsap.timeline();
        tlRef.current = tl;

        // Run physical Flip on containers
        const flipTween = Flip.from(state, {
          duration: 0.68,
          ease: "navPhysical",
          absolute: false,
          nested: true,
          targets: "[data-flip-id]",
        });
        tl.add(flipTween, 0);

        // V:/ label reveals smoothly as Series chamber stabilizes
        if (vSlashTextRef.current) {
          tl.fromTo(
            vSlashTextRef.current,
            { opacity: 0, x: 5 },
            { opacity: 1, x: 0, duration: 0.22, ease: "power2.out" },
            0.12,
          );
        }

        // Stagger in category options: ART, CONNECT, ABOUT relative to expanding chamber
        const validItems = categoryItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          tl.fromTo(
            validItems,
            { opacity: 0, y: 2, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.22,
              stagger: 0.055,
              ease: "power2.out",
            },
            0.18,
          );
        }

        // Back arrow enters and settles with subtle spring
        if (backButtonRef.current) {
          tl.fromTo(
            backButtonRef.current,
            { opacity: 0, scale: 0.90 },
            { opacity: 1, scale: 1, duration: 0.22, ease: "back.out(1.2)" },
            0.30,
          );
        }

        // Micro-detail: Subtle settling compression on physical chamber
        if (mediaBackPillRef.current) {
          tl.to(
            mediaBackPillRef.current,
            { scaleY: 0.996, duration: 0.06, ease: "power1.inOut" },
            0.62,
          );
          tl.to(
            mediaBackPillRef.current,
            { scaleY: 1, duration: 0.08, ease: "power1.out" },
            0.68,
          );
        }

        // Satellite subtle settling motion
        if (satelliteRef.current) {
          tl.fromTo(
            satelliteRef.current,
            { scale: 0.99 },
            { scale: 1.005, duration: 0.20, ease: "power2.out" },
            0.15,
          );
          tl.to(
            satelliteRef.current,
            { scale: 1, duration: 0.25, ease: "power2.inOut" },
            0.35,
          );
        }
      } else {
        // OPEN -> CLOSED Physical FLIP Timeline (~0.84s total)
        const tl = gsap.timeline();
        tlRef.current = tl;

        // Run physical Flip on containers
        const flipTween = Flip.from(state, {
          duration: 0.64,
          ease: "navPhysicalClose",
          absolute: false,
          nested: true,
          targets: "[data-flip-id]",
        });
        tl.add(flipTween, 0);

        // VOYAGERSCAPE text resolves in
        if (voyagerscapeTextRef.current) {
          tl.fromTo(
            voyagerscapeTextRef.current,
            { opacity: 0, x: -6 },
            { opacity: 1, x: 0, duration: 0.24, ease: "power2.out" },
            0.18,
          );
        }

        // ROUTES button resolves in
        if (routesButtonRef.current) {
          tl.fromTo(
            routesButtonRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.22, ease: "power2.out" },
            0.18,
          );
        }

        // Satellite settles back
        if (satelliteRef.current) {
          tl.fromTo(
            satelliteRef.current,
            { scale: 0.995 },
            { scale: 1, duration: 0.35, ease: "power2.out" },
            0.20,
          );
        }
      }
    }
  }, [isExpanded]);

  const handleItemClick = (
    item: RouteDef,
    index: number,
  ) => {
    const el = categoryItemsRef.current[index];
    if (el && !prefersReducedMotion()) {
      gsap.to(el, {
        scale: 0.96,
        duration: 0.10,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      });
    }
    onRouteSelect?.(item);
  };

  return (
    <div
      className={`${styles.wrapper} ${className}`.trim()}
      role="navigation"
      aria-label="Colonia Navigation"
    >
      {!isExpanded ? (
        /* =========================================================
            NORMAL CLOSED STATE: [ ◉ VOYAGERSCAPE ╲__╱ ROUTES ]
            ========================================================= */
        <div
          key="closed-cluster"
          className={styles.normalCluster}
          data-flip-id="nav-cluster"
        >
          <div className={styles.mainPill} data-flip-id="nav-pill">
            <svg
              viewBox="0 0 248 42"
              className={styles.mainSvg}
              aria-hidden="true"
            >
              <path
                d="M 21 0
                   L 135 0
                   A 21 21 0 0 1 147 3.77
                   C 150.2 6.0, 151.7 9.0, 154.5 9.0
                   C 157.3 9.0, 158.8 6.0, 162 3.77
                   A 21 21 0 0 1 174 0
                   L 227 0
                   A 21 21 0 0 1 248 21
                   A 21 21 0 0 1 227 42
                   L 174 42
                   A 21 21 0 0 1 162 38.23
                   C 158.8 36.0, 157.3 33.0, 154.5 33.0
                   C 151.7 33.0, 150.2 36.0, 147 38.23
                   A 21 21 0 0 1 135 42
                   L 21 42
                   A 21 21 0 0 1 0 21
                   A 21 21 0 0 1 21 0 Z"
                fill="var(--vs-nav-pill, #24231F)"
              />
            </svg>

            <div className={styles.mainContent}>
              {/* Left Chamber: 35px Inset Play Disc + VOYAGERSCAPE (Home) */}
              <div className={styles.leftSection} data-flip-id="series-chamber">
                <button
                  type="button"
                  className={styles.playDisc}
                  onClick={handleHomeClick}
                  aria-label="Voyagerscape home"
                  data-cursor="link"
                  data-cursor-label="Home"
                  data-flip-id="play-disc"
                >
                  <MediaPixelSignal />
                </button>
                <div className={styles.homeLabelWrap}>
                  <button
                    ref={voyagerscapeTextRef}
                    type="button"
                    className={styles.watchLabel}
                    onClick={handleHomeClick}
                    aria-label="Voyagerscape home"
                    data-cursor="link"
                    data-cursor-label="Home"
                  >
                    <span className={styles.shimmerWord}>
                      {VOYAGERSCAPE_LETTERS.map((char, i) => (
                        <span
                          key={`voyagerscape-char-${i}`}
                          className={styles.shimmerChar}
                          data-shimmer-char
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Chamber: ROUTES (Animata Roll Text on hover) */}
              <div className={styles.rightSection} data-flip-id="routes-chamber">
                <button
                  ref={routesButtonRef}
                  type="button"
                  className={styles.routesLabel}
                  onClick={handleRoutesClick}
                  aria-label="Expand routes"
                  aria-expanded={false}
                  data-cursor="link"
                >
                  <RollText text="ROUTES" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================
            EXPANDED STATE: [ ◉ V:/ ] [ ART CONNECT ABOUT ╲____╱ ‹ ]
            ========================================================= */
        <div
          key="open-cluster"
          className={styles.expandedCluster}
          data-flip-id="nav-cluster"
        >
          {/* Unit 1: [ ◉ V:/ ] Standalone Pill (Home) */}
          <div className={styles.seriesPill} data-flip-id="series-chamber">
            <button
              type="button"
              className={styles.playDisc}
              onClick={handleHomeClick}
              aria-label="Voyagerscape home"
              data-cursor="link"
              data-cursor-label="Home"
              data-flip-id="play-disc"
            >
              <MediaPixelSignal />
            </button>
            <button
              ref={vSlashTextRef}
              type="button"
              className={styles.vSlashLabel}
              onClick={handleHomeClick}
              aria-label="Voyagerscape home"
              data-cursor="link"
              data-cursor-label="Home"
            >
              <span>V:</span>
              <span className={styles.cursorSlash}>/</span>
            </button>
          </div>

          {/* Unit 2: Connected Media Options + Back Arrow Pill [ ART CONNECT ABOUT ╲____╱ ‹ ] (228px Compact) */}
          <div
            ref={mediaBackPillRef}
            className={styles.mediaBackPill}
            data-flip-id="routes-chamber"
          >
            <svg
              viewBox="0 0 228 42"
              className={styles.mediaBackSvg}
              aria-hidden="true"
            >
              <path
                d="M 21 0
                   L 168 0
                   A 21 21 0 0 1 180 3.77
                   C 183.2 6.0, 184.7 9.0, 187.5 9.0
                   C 190.3 9.0, 191.8 6.0, 195 3.77
                   A 21 21 0 1 1 195 38.23
                   C 191.8 36.0, 190.3 33.0, 187.5 33.0
                   C 184.7 33.0, 183.2 36.0, 180 38.23
                   A 21 21 0 0 1 168 42
                   L 21 42
                   A 21 21 0 0 1 0 21
                   A 21 21 0 0 1 21 0 Z"
                fill="var(--vs-nav-pill, #24231F)"
              />
            </svg>

            <div className={styles.mediaBackContent}>
              {/* Left Section: 3 Menu Items (ART / CONNECT / ABOUT with Animata Roll Text) */}
              <div
                className={styles.mediaCategoriesSection}
                role="group"
                aria-label="Routes options"
              >
                {PROTOTYPE_NAV_ITEMS.map((item, index) => {
                  const active = isRouteActive(item, pathname);
                  return (
                    <Link
                      key={item.href}
                      ref={(el) => {
                        categoryItemsRef.current[index] = el;
                      }}
                      href={item.href}
                      className={`${styles.categoryOption} ${
                        active ? styles.categoryOptionActive : ""
                      }`.trim()}
                      aria-current={active ? "page" : undefined}
                      data-cursor="link"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleItemClick(item, index)}
                    >
                      <RollText text={item.label.toUpperCase()} />
                    </Link>
                  );
                })}
              </div>

              {/* Right Section: Back Arrow Button (in 42px circular lobe) */}
              <button
                ref={backButtonRef}
                type="button"
                className={styles.backButton}
                onClick={handleCollapseClick}
                aria-label="Collapse routes menu"
                data-cursor="link"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.backIcon}
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          Unit 3: RIGHT SATELLITE (THEME TOGGLE + COMMAND TERMINAL)
          ========================================================= */}
      <div
        ref={satelliteRef}
        className={styles.satelliteContainer}
        data-flip-id="satellite"
      >
        <MergingBubbles
          onThemeClick={onThemeClick}
          onTerminalClick={onTerminalClick}
          onDashClick={onDashClick}
          onTargetClick={onTargetClick}
        />
      </div>
    </div>
  );
}
