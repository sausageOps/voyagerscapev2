"use client";

import { useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UIProvider, useUI } from "@/lib/ui-store";
import VisualModeProvider from "@/components/VisualModeProvider";
import SmoothScroll from "@/components/SmoothScroll";
import SiteHeader from "@/components/SiteHeader";
import Cursor from "@/components/Cursor";
import Scrollbar from "@/components/Scrollbar";
import PageLoader from "@/components/PageLoader";
import RouteTransition, { RouteTransitionProvider } from "@/components/RouteTransition";
import SiteFooter from "@/components/SiteFooter";
import HomeCanvas from "@/components/HomeCanvas";
import AppBackdrop from "@/components/AppBackdrop";
import GiatsBackground from "@/components/GiatsBackground/GiatsBackground";
import GiatsFrame from "@/components/GiatsFrame/GiatsFrame";
import WebsiteTosStage from "@/components/TosExperiment/WebsiteTosStage";
import type { PanelContent } from "@/components/TosExperiment/TosSideSurface";
import WebsiteShell from "@/components/TosExperiment/WebsiteShell";
import styles from "./AppShell.module.css";

/**
 * Global frame. Every future route mounts inside this shell, so adding
 * /art, /connect, /about etc. requires no changes here.
 *
 * RouteTransitionProvider wraps the whole frame so every current and
 * future internal navigation — header, mobile menu, footer, command
 * terminal, any page-level link — is served by the same global
 * page-transition layer.
 *
 * ------------------------------------------------------------------
 * THE RIGHT-HAND PAGE — menu and terminal (components/TosExperiment/)
 * ------------------------------------------------------------------
 * The complete website is written as ONE element (WebsiteShell) that sits
 * next to the site's right-hand menu page inside one horizontal
 * composition:
 *
 *     <WebsiteTosStage>              the menu's host
 *       <HorizontalComposition>      the single moving body
 *         <WebsiteShell>             the complete website
 *         <TosSideSurface>           the full-height menu page
 *           <TosTerminalWindow>      the window inside that page
 *             <NavSurface>           THE menu (the ROUTES menu)
 *
 * The page has two consumers, and neither is a second architecture:
 *
 *   • the MENU — the header's ROUTES control (Web/Tablet pill and the mobile
 *     pill), through the shared store's `mobileMenuOpen`;
 *   • the TERMINAL — the header's terminal control and the global "/" key,
 *     through the shared store's `terminalOpen`. The terminal is NOT an
 *     overlay: it is the same page, showing the command terminal instead of
 *     the menu (see lib/use-terminal.ts).
 *
 * Website and page are siblings in the React tree — nothing is reparented
 * after mount, no selector reaches into the page and steals a node, and no
 * measured position is converted into absolute coordinates.
 *
 * What stays OUTSIDE the composition, and why:
 *   • SiteHeader, Cursor, PageLoader and the route-transition curtain are
 *     viewport-fixed chrome. The header keeps
 *     its production `position: fixed` (a transformed ancestor would become
 *     its containing block and strip that pinning); instead it rides the
 *     same shell variable the composition does, which is the mechanism
 *     SiteHeader.module.css already declares — so it still moves as part of
 *     the same body.
 *   • AppBackdrop is the environment the website slides on, not part of the
 *     website itself.
 *
 * The frame also carries the page's menu/terminal open state as data
 * attributes. Every geometric consequence of those attributes is CSS
 * (AppShell.module.css); no component measures or animates a position in JS.
 */
function AppFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";
  const { terminalOpen, mobileMenuOpen, setTerminalOpen, setMobileMenuOpen } = useUI();

  /* Which content the page is showing. Remembered while the page is off
     screen, so closing it keeps the content it was opened with (the window
     never swaps under the visitor mid-exit), and read during render so an
     opening page shows the right content on its very first paint. */
  const lastContent = useRef<PanelContent>("menu");
  if (terminalOpen) lastContent.current = "terminal";
  else if (mobileMenuOpen) lastContent.current = "menu";

  const pageOpen = mobileMenuOpen || terminalOpen;
  const page = (
    <RouteTransition>
      <main id="main">{children}</main>
    </RouteTransition>
  );

  return (
    <div
      className={styles.frame}
      data-terminal-open={terminalOpen ? "true" : "false"}
      data-mobile-menu-open={mobileMenuOpen ? "true" : "false"}
      data-tos-test-open={pageOpen ? "true" : "false"}
    >
      <a className="vs-skip" href="#main">
        Skip to content
      </a>
      <AppBackdrop />
      <GiatsBackground />
      <GiatsFrame />
      <PageLoader />
      <SiteHeader />
      <WebsiteTosStage
        open={pageOpen}
        content={lastContent.current}
        onClose={() => {
          setMobileMenuOpen(false);
          setTerminalOpen(false);
        }}
      >
        {/* The complete website, as one rigid surface. */}
        <WebsiteShell>
          {isHome ? <HomeCanvas>{page}</HomeCanvas> : page}
          <SiteFooter />
        </WebsiteShell>
      </WebsiteTosStage>
      <Scrollbar />
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
