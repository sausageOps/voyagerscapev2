"use client";

import { type ReactNode } from "react";
import styles from "./HorizontalComposition.module.css";

/**
 * HORIZONTAL COMPOSITION — the single moving body of the TOS experiment.
 * =====================================================================
 *
 * This element is the physical object of the side-panel interaction. It is
 * a rigid flex row whose children are:
 *
 *   [ WebsiteShell ]  [ TosSideSurface ]
 *
 * Both children are ordinary, in-flow siblings. Nothing is reparented, no
 * DOM node is stolen from elsewhere in the tree, and no position is ever
 * measured and re-applied: the React tree itself expresses the fact that
 * the complete website sits immediately to the LEFT of the TOS panel.
 *
 * The composition is exactly one viewport wide, so its own children push
 * the panel past the right edge by design (the shell is `flex: 0 0 100%`,
 * the panel is `flex: 0 0 var(--tos-test-panel-w)`). Sliding the whole
 * composition left by exactly the panel's width therefore lands the panel
 * flush in the right-hand slot and pushes the website's left edge out of
 * the frame — the two move together, at the same rate, as one mechanism.
 *
 * VERTICAL SCROLLING IS UNTOUCHED BY THIS COMPONENT. The composition is a
 * normal block in normal document flow: it has no height, no overflow and
 * no scrollport of its own. Its height is simply the height of its tallest
 * child (the website), so it contributes exactly the same amount of page
 * height as the website did before, and the document remains the one and
 * only vertical scroll owner. Horizontal movement and vertical scrolling
 * are separate concerns, wired to separate mechanisms.
 *
 * Geometry comes from the shell-level variable `--shell-slide-x`, which is
 * defined next to the rest of the frame's geometry in AppShell.module.css
 * and is also what SiteHeader translates on. One value, one motion.
 */
export default function HorizontalComposition({ children }: { children: ReactNode }) {
  return (
    <div className={styles.composition} data-tos-composition>
      {children}
    </div>
  );
}
