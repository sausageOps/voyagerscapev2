"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui-store";
import { gsap, revealUp } from "@/lib/motion";
import BrandMark from "@/components/BrandMark";
import NavMenu from "@/components/NavMenu";
import GlassControl from "@/components/primitives/GlassControl";
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
            <span className="vs-tech">for ?</span>
          </button>
        </div>

        {/* ---- Mobile cluster ---- */}
        <div className={styles.mobileRight} data-header-item>
          <GlassControl
            size="sm"
            variant="clear"
            className={styles.slashBtn}
            onClick={() => setTerminalOpen(!terminalOpen)}
            aria-label="Open command terminal"
            data-magnetic
            aria-controls="vs-command-terminal"
            aria-expanded={terminalOpen}
          >
            /
          </GlassControl>
          <GlassControl
            size="sm"
            variant={mobileMenuOpen ? "regular" : "clear"}
            active={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="vs-mobile-nav"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </GlassControl>
        </div>
      </div>
    </header>
  );
}
