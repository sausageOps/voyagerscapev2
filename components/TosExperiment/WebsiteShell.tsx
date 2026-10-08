"use client";

import { type ReactNode } from "react";
import styles from "./WebsiteShell.module.css";

/**
 * WEBSITE SHELL — the boundary of "the complete website".
 * =====================================================
 *
 * Everything that the visitor reads as the website lives inside this one
 * element, and nothing else does:
 *
 *   inside   → the route content (HomeCanvas + RouteTransition + main on
 *              the homepage, the plain route page elsewhere) and SiteFooter
 *   outside  → global chrome that is not part of the website composition:
 *              AppBackdrop (the environment the website slides on),
 *              PageLoader, the fixed SiteHeader, Cursor, and the site's
 *              skip link. (The side page is the composition's other child,
 *              so it is a sibling of this shell, not part of it.)
 *
 * The shell is a single rigid block: `flex: 0 0 100%` makes it exactly one
 * frame wide and forbids it from shrinking, so the TOS panel can never
 * squeeze it and the website's internal geometry (the 1440px columns, the
 * `vw`-based clamps, the CRT composition, the footer grid) is laid out from
 * byte-identical measurements whether the panel is open or closed.
 *
 * That is the whole point of the experiment: the website MAKES ROOM for the
 * side panel by moving, not by being re-laid-out, re-measured or covered.
 * Zero reflow means zero risk to the responsive geometry that the previous
 * prototype destabilised.
 *
 * Why the shell is a normal-flow block and not a fixed-height stage: the
 * document must stay the vertical scroll owner. The shell has no height, no
 * `overflow` and no scroll container of its own; it simply contributes its
 * content height to the page, exactly as the website did before.
 */
export default function WebsiteShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-website-shell>
      {children}
    </div>
  );
}
