"use client";

import { useRef } from "react";
import TosTerminalWindow from "./TosTerminalWindow";
import { useTosReveal } from "./useTosReveal";
import styles from "./TosSideSurface.module.css";

/** What the right-hand page is showing. One page, two contents. */
export type PanelContent = "menu" | "terminal";

/**
 * TOS SIDE SURFACE — LAYER 1 (the page).
 * ====================================
 *
 * This is not a panel, a card or a drawer: it is the RIGHT-HAND PAGE of the
 * composition, and it is the element that becomes visible when the
 * composition slides. It is deliberately unlike the website frame:
 *
 *   • full viewport height — flush with the viewport's TOP and BOTTOM edges
 *   • flush with the viewport's RIGHT edge
 *   • square edges, a solid surface, no shadow: a page has no corners
 *
 * …and it holds the terminal window as its single child, placed by nothing
 * more than this surface's own frame inset (see `padding` in the module CSS
 * — the same `--frame-edge-inset` the website frame uses). The window is
 * therefore ALREADY in its final position inside the page: nothing inside
 * the surface slides, fades or flies in as a whole. The page enters; its
 * contents ride along with it, exactly like a second document.
 *
 * Inside the page, the reveal runs in three stacked roles:
 *
 *   base surface → this element's own solid background
 *   sheets       → the three palette panels inside the window (NavSurface),
 *                  swept in sequence by `useTosReveal`
 *   content      → the real menu, above the sheets
 *
 * Vertical placement is `position: sticky; top: 0` inside the moving
 * composition — sticky rather than fixed because fixed elements are
 * re-positioned by an ancestor transform, while sticky ones are not. That
 * keeps the page welded to the viewport's top edge for the whole scroll
 * range without ever becoming a scroll container of its own.
 */
export default function TosSideSurface({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: PanelContent;
  onClose: () => void;
}) {
  const surfaceRef = useRef<HTMLElement | null>(null);

  /* The palette-sheet reveal — transform/opacity only, scoped to this page. */
  useTosReveal(surfaceRef, open, content);

  return (
    <aside
      ref={surfaceRef}
      className={styles.surface}
      data-open={open ? "true" : "false"}
      data-tos-surface
      aria-label="TOS page"
    >
      <TosTerminalWindow open={open} content={content} onClose={onClose} />
    </aside>
  );
}
