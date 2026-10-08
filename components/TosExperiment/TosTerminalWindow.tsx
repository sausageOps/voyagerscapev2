"use client";

import NavSurface from "@/components/NavSurface";
import TerminalSurface from "./TerminalSurface";
import type { PanelContent } from "./TosSideSurface";
import styles from "./TosTerminalWindow.module.css";

/**
 * THE WINDOW INSIDE THE PAGE — LAYER 2.
 * ====================================
 *
 * The frame-matched window established in step 2, unchanged in geometry: it
 * fills the page's frame inset, keeps the website frame's radius and surface,
 * and clips its own contents. What it hosts is the side page's CONTENT, and
 * there are exactly two of them:
 *
 *   • `"menu"`     → the canonical menu (`<NavSurface>`), the same component
 *                    the ROUTES control opens.
 *   • `"terminal"` → the command terminal (`<TerminalSurface>`), the same
 *                    behaviour and styling as the production terminal.
 *
 * Both are content of the SAME page: the page is not duplicated per consumer,
 * the composition and shell are not duplicated, and the window's own
 * geometry is not touched by either. This is what makes the terminal and the
 * menu two consumers of one approved architecture rather than two panels.
 *
 * THE PALETTE STACK. The menu brings its own three sheets (they are part of
 * the menu surface, and the ROUTES menu is locked). For the terminal the
 * window renders the same three full-surface sheets itself — same attribute
 * contract, same selector, same reveal hook, same palette-selection module —
 * so whichever content is on screen there are exactly THREE sheets, drawn
 * once per open, above the window's base surface and below its content. No
 * fourth layer, no second animation, no second randomiser.
 *
 * The one adaptation remains architectural: inside this card the window — not
 * an overlay shell — owns the surface, so the module CSS below neutralises
 * the menu's overlay chrome within this card only.
 */
export default function TosTerminalWindow({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: PanelContent;
  onClose: () => void;
}) {
  const terminal = content === "terminal";

  return (
    <section
      className={styles.window}
      data-tos-terminal-window
      data-tos-content={content}
      aria-label={terminal ? "Voyagerscape command terminal" : "TOS navigation window"}
    >
      {terminal && (
        <div className={styles.paletteStack} aria-hidden="true" data-tos-palette-stack>
          <span className={styles.palettePanel} data-tos-palette-panel />
          <span className={styles.palettePanel} data-tos-palette-panel />
          <span className={styles.palettePanel} data-tos-palette-panel />
        </div>
      )}

      {terminal ? (
        <TerminalSurface active={open} onClose={onClose} />
      ) : (
        <NavSurface
          id="vs-mobile-nav"
          active={open}
          label="TOS navigation"
          navLabel="TOS primary"
          onClose={onClose}
          onNavigate={onClose}
        />
      )}
    </section>
  );
}
