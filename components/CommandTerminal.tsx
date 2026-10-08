"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import {
  ensurePanelEase,
  PANEL_CLOSED_X_PERCENT,
  PANEL_SLIDE_DURATION,
} from "@/lib/terminal-panel-motion";
import { useUI } from "@/lib/ui-store";
import { useRouteTransition } from "@/components/RouteTransition";
import { ROUTES } from "@/lib/routes";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import CommandInput from "@/components/CommandInput";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./CommandTerminal.module.css";

const SUGGESTIONS = [...ROUTES.map((r) => r.command), "reset", "clear", "close"];

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  home: "Return to the landing page",
  art: "Open the art archive",
  connect: "Open the transmission desk",
  about: "Enter the studio archive",
  reset: "Restore the default palette",
  clear: "Clear the terminal transcript",
  close: "Dismiss the command terminal",
};

const COMMAND_LABELS: Record<string, string> = {
  home: "Home",
  art: "Art",
  connect: "Connect",
  about: "About",
  reset: "Reset",
  clear: "Clear",
  close: "Close",
};

/* ==================================================================
   PHASE 1 — TERMINAL SIDE-PANEL MOTION
   ==================================================================
   The terminal is ONE SOLID OBJECT that slides in from the right edge:

     • OPEN:  the layer starts one full panel-width to the right of its
              resting position (xPercent 100) and slides to xPercent 0,
              which is the terminal's existing final position.
     • CLOSE: the same solid panel slides back out to xPercent 100 and
              is hidden only once it is fully off-screen.

   The website answers with a subtle left translation driven by the same
   ease and duration from lib/terminal-panel-motion.ts (see AppShell),
   so the two movements read as one mechanical interaction.

   Nothing else animates: no palette sheets, no colour wipes, no content
   reveal, no opacity, no scale, no rotation, no bounce. The duration and
   ease are shared with the website mover, and a single timeline ref is
   killed and rebuilt on every toggle so interrupted OPEN/CLOSE sequences
   cannot stack animations.
   ================================================================== */

interface LogLine {
  id: number;
  kind: "in" | "ok" | "err";
  text: string;
}

export default function CommandTerminal() {
  const { navigate } = useRouteTransition();
  const { terminalOpen, setTerminalOpen, setVisualMode } = useUI();
  const layerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const logId = useRef(0);
  const closeTerminal = useCallback(() => setTerminalOpen(false), [setTerminalOpen]);

  useSwipeToClose(layerRef, terminalOpen, closeTerminal, {
    preserveTransformOnClose: true,
    activationQuery: "(max-width: 767px), (max-width: 1099px) and (hover: none), (pointer: coarse), (any-pointer: coarse)",
    horizontalDominance: 1.2,
  });

  const push = useCallback((kind: LogLine["kind"], text: string) => {
    logId.current += 1;
    setLog((prev) => [...prev.slice(-6), { id: logId.current, kind, text }]);
  }, []);

  /* ---- Global "/" to open, ESC to close ---- */
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
        lastFocused.current = document.activeElement as HTMLElement;
        setTerminalOpen(true);
      } else if (event.key === "Escape" && terminalOpen) {
        event.preventDefault();
        setTerminalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [terminalOpen, setTerminalOpen]);

  /* ---- Focus restoration (opening only records focus; it never autofocuses the input) ---- */
  useEffect(() => {
    if (terminalOpen) {
      if (document.activeElement !== inputRef.current) {
        lastFocused.current = document.activeElement as HTMLElement;
      }
      return undefined;
    }

    lastFocused.current?.focus?.();
    return undefined;
  }, [terminalOpen]);

  /* ---- Open/close choreography. Runs before paint so the layer and its
     motion start state are applied with the same commit as data-open. ---- */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    /* Kill the previous motion before building the new state, so rapid
       OPEN/CLOSE/OPEN changes cannot stack timelines. */
    timelineRef.current?.kill();

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = terminalOpen;
    const ease = ensurePanelEase();

    /* The panel's own width: the unit both ends of the slide are
       expressed in (xPercent 100 == one full panel off the right edge). */
    const panelWidth = layer.offsetWidth || 1;

    /* Ground truth for "where is the panel right now": the rendered
       translate, converted to a percentage of the panel. Reading the
       matrix (rather than GSAP's cache) also picks up a swipe drag,
       which writes a raw translate3d outside GSAP. */
    const currentXPercent = (): number => {
      const matrix = window.getComputedStyle(layer).transform.match(/^matrix(3d)?\((.+)\)$/);
      if (!matrix) return 0;
      const values = matrix[2].split(",");
      const xIndex = matrix[1] === "3d" ? 12 : 4;
      return ((parseFloat(values[xIndex]) || 0) / panelWidth) * 100;
    };

    /* A hidden layer has no meaningful position: it is parked off-screen,
       so the next entry starts from the closed position. */
    const isHidden = () => window.getComputedStyle(layer).visibility === "hidden";

    /* The panel is only hidden once it is fully off-screen, and its inline
       motion styles are cleared afterwards so the resting closed state
       comes from CSS again. */
    const cleanupClosed = () => {
      gsap.set(layer, { visibility: "hidden", pointerEvents: "none" });
      gsap.set(layer, { clearProps: "all" });
    };

    const detach = () => () => {
      timelineRef.current?.kill();
    };

    /* Reduced motion keeps the same two resting positions with no slide. */
    if (prefersReducedMotion()) {
      if (terminalOpen) {
        gsap.set(layer, {
          x: 0,
          xPercent: 0,
          visibility: "visible",
          pointerEvents: "auto",
        });
      } else if (wasOpen) {
        gsap.set(layer, { x: 0, xPercent: PANEL_CLOSED_X_PERCENT });
        cleanupClosed();
      }
      return detach();
    }

    if (terminalOpen) {
      /* ================= OPEN =================
         One solid panel, parked one panel-width off the right edge, then
         slid to its existing final position. Same duration and ease as
         the website's leftward translation, starting at the same time.
         Re-opening mid-close continues from where the panel actually is
         instead of snapping back to the start. */
      const fromXPercent = isHidden() ? PANEL_CLOSED_X_PERCENT : currentXPercent();
      /* gsap.set renders synchronously, so the very first painted frame
         already has the panel parked off-screen — it can never flash at
         its resting position before the slide begins. */
      gsap.set(layer, {
        x: 0,
        xPercent: fromXPercent,
        visibility: "visible",
        pointerEvents: "auto",
      });
      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.to(layer, { xPercent: 0, duration: PANEL_SLIDE_DURATION, ease }, 0);
      return detach();
    }

    /* Initial mount is already closed — nothing to animate. */
    if (!wasOpen) return detach();

    /* ================= CLOSE =================
       The same solid panel travels back out to the right and is hidden
       only after it has left the viewport. Folding the current position
       in synchronously (including any swipe drag) means the exit
       continues from where it is with no first-frame jump. */
    gsap.set(layer, { x: 0, xPercent: currentXPercent(), pointerEvents: "none" });
    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.to(
      layer,
      { xPercent: PANEL_CLOSED_X_PERCENT, duration: PANEL_SLIDE_DURATION, ease },
      0,
    ).call(cleanupClosed);

    return detach();
  }, [terminalOpen]);

  /* ---- Command execution ---- */
  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().toLowerCase();
      if (!command) return;

      if (command === "clear") {
        setLog([]);
        if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
        return;
      }

      push("in", command);

      const route = ROUTES.find((r) => r.command === command);
      if (route) {
        push("ok", `navigating → ${route.href}`);
        navigate(route.href);
        window.setTimeout(() => setTerminalOpen(false), 260);
        return;
      }

      if (command === "close" || command === "exit") {
        setTerminalOpen(false);
        return;
      }

      if (command === "reset") {
        setVisualMode("normal");
        push("ok", "visual mode → normal");
        return;
      }

      if (command === "help" || command === "?") {
        push("ok", `available → ${SUGGESTIONS.join(" · ")}`);
        return;
      }

      push("err", `E_UNKNOWN_CMD :: "${command}" not recognised`);
    },
    [push, navigate, setLog, setTerminalOpen, setVisualMode],
  );

  return (
    <aside
      ref={layerRef}
      id="vs-command-terminal"
      className={styles.layer}
      data-open={terminalOpen ? "true" : "false"}
      aria-hidden={!terminalOpen}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="false"
        aria-label="Voyagerscape command terminal"
        data-term-panel
      >
        <div className={styles.contentLayer} data-term-content>
          <div className={styles.head} data-term-item>
            <div className={styles.headText}>
              <p className={styles.title}>TOS Command Terminal</p>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.inputShell} data-term-item>
              <CommandInput ref={inputRef} onSubmit={run} disabled={!terminalOpen} />
            </div>

            <div ref={scrollAreaRef} className={styles.scrollArea}>
              <p className={styles.intro} data-term-item>
                Start typing and see where it leads you... or use one of the prompts listed below.
              </p>

              {log.length > 0 && (
                <div className={styles.log} role="log" aria-live="polite" data-term-item>
                  {log.map((line) => (
                    <p key={line.id} className={styles.logLine} data-kind={line.kind}>
                      <span className={styles.logGlyph} aria-hidden="true">
                        {line.kind === "in" ? ":/" : line.kind === "ok" ? "»" : "!"}
                      </span>
                      {line.text}
                    </p>
                  ))}
                </div>
              )}

              <ul className={styles.commandTags} aria-label="Available commands">
                {SUGGESTIONS.map((command) => (
                  <li key={command}>
                    <span
                      className={styles.commandTag}
                      aria-description={COMMAND_DESCRIPTIONS[command]}
                      data-term-row
                    >
                      {COMMAND_LABELS[command] ?? command}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.foot} data-term-item>
            <span className={styles.escapeHint}>
              <span className={styles.desktopCloseHint}>ESC TO CLOSE</span>
              <span className={styles.touchCloseHint}>SWIPE TO CLOSE</span>
            </span>
            <TechLabel nano className={styles.mode}>
              <span>Mode: </span>
              <span className={styles.adminSignal}>Admin</span>
            </TechLabel>
          </div>

        </div>
      </div>
    </aside>
  );
}
