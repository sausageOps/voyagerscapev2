"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useRouteTransition } from "@/components/RouteTransition";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { MergingBubbles } from "@/components/ColoniaPillPrototype/MergingBubbles";
import styles from "./MobilePillHeader.module.css";

export interface MobilePillHeaderProps {
  className?: string;
  mobileMenuOpen?: boolean;
  onMenuClick?: () => void;
  onHomeClick?: () => void;
  onThemeClick?: () => void;
  onTerminalClick?: () => void;
}

/**
 * Experience Japan Pictograms / Dynamic Navigation Icons Rotator (Mobile)
 */
function MobileMediaPixelSignal({
  className = "",
  glowClassName = "",
}: {
  className?: string;
  glowClassName?: string;
}) {
  const [iconList, setIconList] = useState<string[]>([]);
  const [iconIndex, setIconIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchIcons = async () => {
      try {
        const res = await fetch("/api/nav-icons");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.icons) && data.icons.length > 0) {
            setIconList(data.icons);
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
    const pollInterval = setInterval(fetchIcons, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

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
      >
        {activeSvgPath ? (
          <span
            className={styles.signalIconMask}
            style={{
              WebkitMaskImage: `url('${activeSvgPath}')`,
              maskImage: `url('${activeSvgPath}')`,
            }}
            aria-hidden="true"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.signalIcon}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </span>
    </>
  );
}

/**
 * Mobile Physical Navigation Pill Header
 * =====================================
 * Compact physical pill designed specifically for mobile viewports (320px - 430px):
 * - Main Pill: [ ◉ Media Disc | MENU ] (136px x 42px)
 * - Satellite: [ Theme Toggle | Terminal Trigger ] (81px x 42px)
 * - Total width: 224px (fits comfortably on 320px screens with zero overflow)
 * - Entire MENU chamber is the interactive hit target to trigger the existing slide menu.
 */
export default function MobilePillHeader({
  className = "",
  mobileMenuOpen = false,
  onMenuClick,
  onHomeClick,
  onThemeClick,
  onTerminalClick,
}: MobilePillHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const homeButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  let routeTransition: { navigate: (href: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routeTransition = useRouteTransition();
  } catch {
    routeTransition = null;
  }

  const handleHomePress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (homeButtonRef.current && !prefersReducedMotion()) {
      gsap.to(homeButtonRef.current, {
        scale: 0.92,
        duration: 0.10,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      });
    }

    onHomeClick?.();

    if (pathname === "/") return;

    if (routeTransition) {
      routeTransition.navigate("/");
    } else {
      router.push("/");
    }
  };

  const handleMenuPress = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (menuButtonRef.current && !prefersReducedMotion()) {
      gsap.to(menuButtonRef.current, {
        scale: 0.96,
        duration: 0.10,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          onMenuClick?.();
        },
      });
    } else {
      onMenuClick?.();
    }
  };

  return (
    <div
      className={`${styles.wrapper} ${className}`.trim()}
      role="navigation"
      aria-label="Mobile Navigation"
    >
      {/* Unit 1: Main Physical Pill [ ◉ (Media/V) | ROUTES ] */}
      <div className={styles.mainPill}>
        <svg
          viewBox="0 0 112 42"
          className={styles.mainSvg}
          aria-hidden="true"
        >
          <path
            d="M 21 0
               L 91 0
               A 21 21 0 0 1 112 21
               A 21 21 0 0 1 91 42
               L 21 42
               A 21 21 0 0 1 0 21
               A 21 21 0 0 1 21 0 Z"
            fill="var(--vs-nav-pill, #24231F)"
          />
        </svg>

        <div className={styles.mainContent}>
          {/* Left Chamber: 35px Inset Media Disc (Home trigger) */}
          <div className={styles.leftSection}>
            <button
              ref={homeButtonRef}
              type="button"
              className={styles.playDisc}
              onClick={handleHomePress}
              aria-label="Voyagerscape home"
            >
              <MobileMediaPixelSignal />
            </button>
          </div>

          {/* Right Chamber: Full-Chamber Clickable ROUTES button */}
          <div className={styles.rightSection}>
            <button
              ref={menuButtonRef}
              type="button"
              className={styles.menuButton}
              onClick={handleMenuPress}
              aria-label={mobileMenuOpen ? "Close routes" : "Open routes"}
              aria-expanded={mobileMenuOpen}
              aria-controls="vs-mobile-nav"
            >
              <span className={styles.menuLabel}>
                {mobileMenuOpen ? "CLOSE" : "ROUTES"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Unit 2: Connected Satellite [ Theme Toggle | Terminal Trigger ] */}
      <div className={styles.satelliteContainer}>
        <MergingBubbles
          onThemeClick={onThemeClick}
          onTerminalClick={onTerminalClick}
        />
      </div>
    </div>
  );
}
