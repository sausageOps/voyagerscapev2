"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import {
  ensurePanelEase,
  PANEL_SLIDE_DURATION,
  setShellShift,
  tweenShellShift,
  websiteShiftX,
} from "@/lib/terminal-panel-motion";
import { UIProvider, useUI } from "@/lib/ui-store";
import VisualModeProvider from "@/components/VisualModeProvider";
import SmoothScroll from "@/components/SmoothScroll";
import SiteHeader from "@/components/SiteHeader";
import MobileMenu from "@/components/MobileMenu";
import CommandTerminal from "@/components/CommandTerminal";
import Cursor from "@/components/Cursor";
import PageLoader from "@/components/PageLoader";
import RouteTransition, { RouteTransitionProvider } from "@/components/RouteTransition";
import SiteFooter from "@/components/SiteFooter";
import HomeCanvas from "@/components/HomeCanvas";
import AppBackdrop from "@/components/AppBackdrop";
import styles from "./AppShell.module.css";

/**
 * Global frame. Every future route mounts inside this shell, so adding
 * /art, /connect, /about etc. requires no changes here.
 *
 * RouteTransitionProvider wraps the whole frame so every current and
 * future internal navigation — header, mobile menu, footer, command
 * terminal, any page-level link — is served by the same global
 * page-transition layer.
 */
function AppFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";
  const { terminalOpen, mobileMenuOpen } = useUI();
  const websiteRef = useRef<HTMLDivElement | null>(null);
  const shiftRef = useRef<gsap.core.Timeline | null>(null);
  const page = (
    <RouteTransition>
      <main id="main">{children}</main>
    </RouteTransition>
  );

  /* ---- PHASE 1: the website half of the side-panel interaction ----
     The composition slides slightly LEFT while the terminal slides in
     from the right, and returns to exactly 0 when it leaves. Same ease,
     same duration and the same commit as the terminal's own tween, so
     the two read as one movement.

     Horizontal translation only — no scale, no rotation, no vertical
     shift, no layout change. The page body takes a plain transform; the
     fixed header takes the same offset on --shell-slide-x so the whole
     shell travels together. */
  useLayoutEffect(() => {
    const website = websiteRef.current;
    if (!website) return undefined;

    const targets = { website, header: document.querySelector<HTMLElement>("[data-app-header]") };
    const duration = PANEL_SLIDE_DURATION;
    const ease = ensurePanelEase();

    /* Opening moves the composition left by the measured travel; closing
       returns it to exactly 0, its original horizontal position. */
    const apply = (immediate: boolean) => {
      shiftRef.current?.kill();
      const shift = terminalOpen ? websiteShiftX() : 0;
      if (immediate) {
        setShellShift(targets, shift);
        return;
      }
      shiftRef.current = tweenShellShift(targets, shift, duration, ease);
    };

    apply(prefersReducedMotion());

    /* The travel distance is measured from the panel's rendered width,
       so a breakpoint change while the terminal is open re-seats the
       composition without animating. */
    const onResize = () => {
      if (terminalOpen) apply(true);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      shiftRef.current?.kill();
    };
  }, [terminalOpen]);

  return (
    <div
      className={styles.frame}
      data-terminal-open={terminalOpen ? "true" : "false"}
      data-mobile-menu-open={mobileMenuOpen ? "true" : "false"}
    >
      <a className="vs-skip" href="#main">
        Skip to content
      </a>
      <AppBackdrop />
      <PageLoader />
      <SiteHeader />
      <div className={styles.website} ref={websiteRef}>
        {isHome ? <HomeCanvas>{page}</HomeCanvas> : page}
        <SiteFooter />
      </div>
      <MobileMenu />
      <CommandTerminal />
      <Cursor />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <UIProvider>
      <VisualModeProvider>
        <SmoothScroll>
          <RouteTransitionProvider>
            <AppFrame>{children}</AppFrame>
          </RouteTransitionProvider>
        </SmoothScroll>
      </VisualModeProvider>
    </UIProvider>
  );
}
