"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useRouteTransition } from "@/components/RouteTransition";
import { useUI } from "@/lib/ui-store";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./ColoniaPillPrototype.module.css";
import { MergingBubbles } from "./MergingBubbles";
import { RollText } from "./RollText";

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
 * Reusable Complete Left-Side Physical Navigation Unit [ ◉ | V:/ ]
 * Matches 100% of Web/Tablet physical pill styling, concentric media disc,
 * rotating icon mask, blinking cursor slash, and Day/Night surface colors.
 */
export function SeriesPill({
  className = "",
  onHomeClick,
}: {
  className?: string;
  onHomeClick?: () => void;
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
    <div className={`${styles.seriesPill} ${className}`.trim()}>
      <button
        type="button"
        className={styles.playDisc}
        onClick={handleHomeClick}
        aria-label="Voyagerscape home"
        data-cursor="link"
        data-cursor-label="Home"
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
 * Compact Web/Tablet navigation pill. ROUTES controls the shared MobileMenu;
 * the pill itself remains in its original closed geometry at every state.
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
}: ColoniaPillPrototypeProps) {
  const { mobileMenuOpen, setMobileMenuOpen, setTerminalOpen } = useUI();
  const pathname = usePathname();
  const router = useRouter();

  // Integrated Route Transition support
  let routeTransition: ReturnType<typeof useRouteTransition> | null = null;
  try {
    routeTransition = useRouteTransition();
  } catch {
    routeTransition = null;
  }

  const voyagerscapeTextRef = useRef<HTMLButtonElement | null>(null);
  const routesButtonRef = useRef<HTMLButtonElement | null>(null);

  // Preserve the closed pill's ambient VOYAGERSCAPE shimmer without tying it
  // to a local expansion state.
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const button = voyagerscapeTextRef.current;
    if (!button) return;

    const chars = gsap.utils.toArray<HTMLElement>(
      button.querySelectorAll("[data-shimmer-char]"),
    );
    if (!chars.length) return;

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.4,
    });

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
    };
  }, []);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHomeClick?.();
    onWatchClick?.();

    if (pathname === "/") return;

    if (routeTransition) {
      routeTransition.navigate("/");
    } else {
      router.push("/");
    }
  };

  const handleRoutesClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const button = routesButtonRef.current;
    if (button && !prefersReducedMotion()) {
      gsap.killTweensOf(button);
      gsap.to(button, {
        scale: 0.965,
        duration: 0.1,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
        overwrite: true,
      });
    }

    if (onRoutesClick) {
      onRoutesClick();
    } else {
      setTerminalOpen(false);
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  return (
    <div
      className={`${styles.wrapper} ${className}`.trim()}
      role="navigation"
      aria-label="Colonia Navigation"
    >
      <div className={styles.normalCluster}>
        <div className={styles.mainPill}>
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
            <div className={styles.leftSection}>
              <button
                type="button"
                className={styles.playDisc}
                onClick={handleHomeClick}
                aria-label="Voyagerscape home"
                data-cursor="link"
                data-cursor-label="Home"
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

            <div className={styles.rightSection}>
              <button
                ref={routesButtonRef}
                type="button"
                className={styles.routesLabel}
                onClick={handleRoutesClick}
                aria-label={mobileMenuOpen ? "Close routes menu" : "Open routes menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="vs-mobile-nav"
                data-cursor="link"
              >
                <RollText text="ROUTES" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.satelliteContainer}>
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
