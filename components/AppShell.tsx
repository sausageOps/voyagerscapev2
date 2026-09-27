"use client";

import { type ReactNode } from "react";
import { UIProvider } from "@/lib/ui-store";
import VisualModeProvider from "@/components/VisualModeProvider";
import SmoothScroll from "@/components/SmoothScroll";
import SiteHeader from "@/components/SiteHeader";
import CommandTerminal from "@/components/CommandTerminal";
import Cursor from "@/components/Cursor";
import PageLoader from "@/components/PageLoader";
import RouteTransition from "@/components/RouteTransition";
import SiteFooter from "@/components/SiteFooter";

/**
 * Global frame. Every future route mounts inside this shell, so adding
 * /work, /services, /store etc. requires no changes here.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <UIProvider>
      <VisualModeProvider>
        <SmoothScroll>
          <a className="vs-skip" href="#main">
            Skip to content
          </a>
          <PageLoader />
          <SiteHeader />
          <RouteTransition>
            <main id="main">{children}</main>
          </RouteTransition>
          <SiteFooter />
          <CommandTerminal />
          <Cursor />
        </SmoothScroll>
      </VisualModeProvider>
    </UIProvider>
  );
}
