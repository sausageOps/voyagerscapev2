"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
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
    >
      <a className="vs-skip" href="#main">
        Skip to content
      </a>
      <PageLoader />
      <SiteHeader />
      <div className={styles.website}>
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
