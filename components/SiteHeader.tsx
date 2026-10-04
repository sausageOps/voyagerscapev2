"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui-store";
import { useNavSurface } from "@/lib/use-nav-surface";
import { useNavPointerLight } from "@/lib/use-nav-pointer-light";
import { EASE, gsap, prefersReducedMotion, revealUp } from "@/lib/motion";
import BrandMark from "@/components/BrandMark";
import NavMenu from "@/components/NavMenu";
import NavGlassSurface from "@/components/NavGlassSurface";
import TerminalSignal from "@/components/TerminalSignal";
import reactiveStyles from "./ReactiveNavGlass.module.css";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  const { loaded, setTerminalOpen, terminalOpen, mobileMenuOpen, setMobileMenuOpen } = useUI();
  const rootRef = useRef<HTMLElement | null>(null);
  const mobileNavRef = useNavPointerLight<HTMLDivElement>();
  const pathname = usePathname();

  /* Context-aware nav: tracks which section surface (light/dark) currently
     sits underneath this header's footprint and publishes it on <html> as
     data-nav-surface, which NavMenu's pills react to. */
  useNavSurface(rootRef);

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
        gsap.set(header, {
          yPercent: 0,
          y: 0,
          clearProps: "transform,transformOrigin,willChange",
        });
        return;
      }

      header.style.willChange = "transform";
      gsap
        .timeline({ onComplete: clearWillChange })
        .to(header, {
          yPercent: 0,
          y: 3,
          transformOrigin: "50% 0%",
          duration: 0.44,
          ease: EASE.soft,
          overwrite: true,
        })
        .to(header, {
          y: 0,
          duration: 0.08,
          ease: "power1.out",
          clearProps: "transform,transformOrigin",
        });
    };

    const hide = () => {
      if (state === "hidden" || overlaysOpen) return;
      state = "hidden";
      gsap.killTweensOf(header);

      const y = hiddenOffset();
      if (reduced) {
        gsap.set(header, { yPercent: 0, y });
        return;
      }

      header.style.willChange = "transform";
      gsap.to(header, {
        yPercent: 0,
        y,
        transformOrigin: "50% 0%",
        duration: 0.38,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: clearWillChange,
      });
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
        // Hidden + ten meaningful upward pixels always reveals immediately.
        // No moving anchor and no proximity-to-top requirement are involved.
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
      gsap.set(header, { clearProps: "transform,transformOrigin,willChange" });
    };
  }, [mobileMenuOpen, terminalOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header className={styles.header} ref={rootRef}>
      <div className={styles.row}>
        <div className={styles.left} data-header-item>
          <BrandMark />
        </div>

        <div className={styles.center} data-header-item>
          <NavMenu />
        </div>

        <div className={styles.right} data-header-item>
          <button
            type="button"
            className={styles.hint}
            onClick={() => setTerminalOpen(!terminalOpen)}
            aria-expanded={terminalOpen}
            aria-controls="vs-command-terminal"
            data-cursor="link"
            data-cursor-label="Terminal"
            data-magnetic
          >
            <span className="vs-tech">Press</span>
            <span className={styles.key} aria-hidden="true">
              /
            </span>
            <span className="vs-sr-only">for ?</span>
            <span className={`vs-tech ${styles.forVisual}`} aria-hidden="true">
              <span>for</span>
              <TerminalSignal />
            </span>
          </button>
        </div>

        {/* ---- Mobile cluster ---- */}
        <div
          className={`${styles.mobileRight} ${reactiveStyles.tracker}`}
          data-header-item
          ref={mobileNavRef}
        >
          <NavGlassSurface
            height="var(--header-control-height)"
            borderRadius={9999}
            borderWidth={0.08}
            brightness={62}
            opacity={0.9}
            blur={8}
            displace={0.2}
            backgroundOpacity={0.14}
            saturation={1.08}
            distortionScale={-76}
            redOffset={0}
            greenOffset={0}
            blueOffset={0}
            className={reactiveStyles.surface}
          >
            <div className={styles.mobileControls}>
              <button
                type="button"
                className={styles.mobileControl}
                onClick={() => {
                  setTerminalOpen(false);
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileMenuOpen}
                aria-controls="vs-mobile-nav"
              >
                {mobileMenuOpen ? "Close" : "Menu"}
              </button>
              <button
                type="button"
                className={`${styles.mobileControl} ${styles.terminalControl}`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTerminalOpen(!terminalOpen);
                }}
                aria-label={terminalOpen ? "Close terminal" : "Open terminal"}
                data-magnetic
                aria-controls="vs-command-terminal"
                aria-expanded={terminalOpen}
              >
                <TerminalSignal open={terminalOpen} />
              </button>
            </div>
          </NavGlassSurface>
        </div>
      </div>
    </header>
  );
}
