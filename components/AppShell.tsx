"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UIProvider } from "@/lib/ui-store";
import VisualModeProvider from "@/components/VisualModeProvider";
import SmoothScroll from "@/components/SmoothScroll";
import SiteHeader from "@/components/SiteHeader";
import MobileMenu from "@/components/MobileMenu";
import CommandTerminal from "@/components/CommandTerminal";
import Cursor from "@/components/Cursor";
import PageLoader from "@/components/PageLoader";
import RouteTransition, { RouteTransitionProvider } from "@/components/RouteTransition";
import SiteFooter from "@/components/SiteFooter";

/**
 * Global frame. Every future route mounts inside this shell, so adding
 * /art, /connect, /about etc. requires no changes here.
 *
 * RouteTransitionProvider wraps the whole frame so every current and
 * future internal navigation — header, mobile menu, footer, command
 * terminal, any page-level link — is served by the same global
 * page-transition layer.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <UIProvider>
      <VisualModeProvider>
        <SmoothScroll>
          <RouteTransitionProvider>
            <a className="vs-skip" href="#main">Skip to content</a>
            <PageLoader />
            {!isHome && <SiteHeader />}
            {!isHome && <MobileMenu />}
            <RouteTransition>
              <main id="main">{children}</main>
            </RouteTransition>
            {!isHome && <SiteFooter />}
            <CommandTerminal />
            <Cursor />
          </RouteTransitionProvider>
        </SmoothScroll>
      </VisualModeProvider>
    </UIProvider>
  );
}
