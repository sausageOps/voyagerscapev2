"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useUI } from "@/lib/ui-store";
import HorizontalComposition from "./HorizontalComposition";
import TosSideSurface, { type PanelContent } from "./TosSideSurface";

/**
 * WEBSITE / SIDE-PAGE STAGE — the host of the right-hand page.
 * ===========================================================
 *
 *   <WebsiteTosStage>                  the host
 *     <HorizontalComposition>          the one moving body
 *       {children}                     → <WebsiteShell> (the complete website)
 *       <TosSideSurface />             → LAYER 1: the full-height page
 *         <TosTerminalWindow />        → LAYER 2: the frame-matched window
 *           menu:     <NavSurface />           the canonical menu
 *           terminal: <TerminalSurface />      the command terminal
 *
 * The website arrives as `children`, so the website shell and the page are
 * written next to each other as siblings in one composition — the
 * relationship is expressed by the React tree, not by moving DOM nodes
 * around after mount. Nothing here queries the DOM, measures a position or
 * reparents anything.
 *
 * TWO CONSUMERS, ONE PAGE. `open` is true while either consumer is on screen
 * and `content` says which one the window is showing. Both are opened by
 * production controls, and by nothing else:
 *
 *   • the menu      — the header's ROUTES control (Web/Tablet pill) and the
 *                     mobile pill, through the shared store;
 *   • the terminal  — the header's terminal control and the global "/" key,
 *                     exactly as the production terminal was always opened.
 *
 * The temporary [TOS TEST] control that used to live here was a development
 * trigger for comparing the page against the old overlay menu. The page is
 * now the production menu and terminal, so the trigger is gone and the
 * header's own controls are the only way in.
 *
 * Both flags live in the shared store, which already guarantees they are
 * never both open, so this component arbitrates nothing: it renders, and it
 * closes on Escape.
 */
export default function WebsiteTosStage({
  open,
  content,
  onClose,
  children,
}: {
  open: boolean;
  content: PanelContent;
  /** Escape and any destination: the page goes away. */
  onClose: () => void;
  children: ReactNode;
}) {
  const { terminalOpen, setTerminalOpen } = useUI();
  /* Where focus was before "/" opened the terminal, so it can be handed back. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /* ---- The page's keyboard entry points ----------------------------------
     "/" opens the terminal (ignoring keystrokes aimed at a field), and
     Escape closes whatever the page is showing — the same two shortcuts the
     production terminal offered, now owned by the page they act on. */
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !terminalOpen && !isTypingTarget(event.target)) {
        event.preventDefault();
        restoreFocusRef.current = document.activeElement as HTMLElement | null;
        setTerminalOpen(true);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [terminalOpen, open, setTerminalOpen, onClose]);

  /* Give focus back once a "/" entry is over — never on a pointer close. */
  useEffect(() => {
    if (open) return;
    restoreFocusRef.current?.focus?.();
    restoreFocusRef.current = null;
  }, [open]);

  return (
    <div data-tos-stage>
      <HorizontalComposition>
        {children}
        <TosSideSurface open={open} content={content} onClose={onClose} />
      </HorizontalComposition>
    </div>
  );
}
