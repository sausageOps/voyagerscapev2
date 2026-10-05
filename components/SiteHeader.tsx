"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui-store";
import { EASE, gsap, prefersReducedMotion, revealUp } from "@/lib/motion";
import ColoniaPillPrototype from "@/components/ColoniaPillPrototype/ColoniaPillPrototype";
import MobilePillHeader from "@/components/MobilePillHeader/MobilePillHeader";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  const { loaded, setTerminalOpen, terminalOpen, mobileMenuOpen, setMobileMenuOpen } = useUI();
  const rootRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!loaded || !rootRef.current) return;
    const ctx = gsap.context(() => {
      revealUp("[data-header-item]", { delay: 0.05, stagger: 0.07, y: -10 });
    }, rootRef);
    return () => ctx.revert();
  }, [loaded]);

  useEffect(() => {
    const header = rootRef.current;
    const scrollOwner = document.scrollingElement as HTMLElement | null;
    if (!header || !scrollOwner) return;

    /* AppShell and HomeCanvas clip decoration but do not own vertical
       overflow. The browser's standards-mode document scrolling element is
       therefore the page's real scroll source across all breakpoints. */
    const reduced = prefersReducedMotion();
    const overlaysOpen = terminalOpen || mobileMenuOpen;
    const readPosition = () => scrollOwner.scrollTop;
    let previousScrollTop = readPosition();
    let direction: -1 | 0 | 1 = 0;
    let accumulatedDistance = 0;
    let state: "visible" | "hidden" = "visible";
    let frame = 0;

    const clearWillChange = () => {
      header.style.removeProperty("will-change");
    };

    const hiddenOffset = () => {
      const top = Number.parseFloat(getComputedStyle(header).top) || 0;
      const safety = 8;
      return -(top + header.offsetHeight + safety);
    };

    const show = (immediate = false) => {
      if (state === "visible" && !immediate) return;
      state = "visible";
      gsap.killTweensOf(header);

      if (reduced || immediate) {
        gsap.set(header, { "--header-y": "0px" } as any);
        return;
      }

      header.style.willChange = "transform";
      gsap
        .timeline({ onComplete: clearWillChange })
        .to(header, {
          "--header-y": "3px",
          duration: 0.44,
          ease: EASE.soft,
          overwrite: true,
        } as any)
        .to(header, {
          "--header-y": "0px",
          duration: 0.08,
          ease: "power1.out",
        } as any);
    };

    const hide = () => {
      if (state === "hidden" || overlaysOpen) return;
      state = "hidden";
      gsap.killTweensOf(header);

      const y = hiddenOffset();
      if (reduced) {
        gsap.set(header, { "--header-y": `${y}px` } as any);
        return;
      }

      header.style.willChange = "transform";
      gsap.to(header, {
        "--header-y": `${y}px`,
        duration: 0.38,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: clearWillChange,
      } as any);
    };

    const update = () => {
      frame = 0;
      const currentScrollTop = readPosition();
      const delta = currentScrollTop - previousScrollTop;
      previousScrollTop = currentScrollTop;

      if (overlaysOpen) {
        direction = 0;
        accumulatedDistance = 0;
        show(true);
        return;
      }

      if (currentScrollTop <= 8) {
        direction = 0;
        accumulatedDistance = 0;
        show();
        return;
      }

      if (Math.abs(delta) < 0.5) return;
      const nextDirection: -1 | 1 = delta > 0 ? 1 : -1;

      if (nextDirection !== direction) {
        direction = nextDirection;
        accumulatedDistance = Math.abs(delta);
      } else {
        accumulatedDistance += Math.abs(delta);
      }

      if (state === "visible" && direction === 1 && accumulatedDistance >= 10) {
        accumulatedDistance = 0;
        hide();
      } else if (state === "hidden" && direction === -1 && accumulatedDistance >= 10) {
        accumulatedDistance = 0;
        show();
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    if (overlaysOpen || previousScrollTop <= 8) show(true);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      gsap.killTweensOf(header);
      gsap.set(header, { "--header-y": "0px", clearProps: "willChange" } as any);
    };
  }, [mobileMenuOpen, terminalOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header className={styles.header} ref={rootRef}>
      {/* Web + Tablet: Pure mathematical viewport-centered physical pill navigation */}
      <div className={styles.desktopContainer} data-header-item>
        <ColoniaPillPrototype />
      </div>

      {/* Mobile (<= 767px): Compact physical navigation pill header */}
      <div className={styles.mobileRow} data-header-item>
        <MobilePillHeader
          mobileMenuOpen={mobileMenuOpen}
          onMenuClick={() => {
            setTerminalOpen(false);
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          onTerminalClick={() => {
            setMobileMenuOpen(false);
            setTerminalOpen(!terminalOpen);
          }}
        />
      </div>
    </header>
  );
}
