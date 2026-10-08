"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE, gsap, prefersReducedMotion } from "@/lib/motion";
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
   TERMINAL MOTION — SOLID SHELL + OFFSET PHYSICAL PALETTE SHEETS
   ==================================================================
   The clipped .panel is the permanent theme-aware window. The three opaque
   palette surfaces slide in one at a time and settle at distinct offsets, so
   the base and lower sheets remain visibly stacked instead of becoming
   successive replacement backgrounds. Content sits above the complete stack.
   ================================================================== */

/* ------------------------------------------------------------------
   WIPE COLOR SELECTION — the approved Voyagerscape page-transition
   palettes, mirrored here so the terminal can reuse them without
   touching the transition system (RouteTransitionVariants.tsx).
   Day: pale editorial. Night: the dark smoked set — no bright pastel
   flash at night.
   ------------------------------------------------------------------ */
const WIPE_PALETTE_DAY = ["#f3f0e8", "#ddd9e8", "#e8e2d7", "#dce1d8", "#e9dcd2"] as const;
const WIPE_PALETTE_NIGHT = ["#5a564e", "#514d5b", "#595247", "#515950", "#594b4a"] as const;

/** The combination handed out last — the no-immediate-repeat guard. */
let lastWipeCombo: string | null = null;

/**
 * A fresh harmonious wipe combination for THIS open: THREE DISTINCT
 * colors from the current theme's approved palette, in a random order.
 * Never the immediately previous combination. No invented colors, no
 * random RGB — only approved palette values.
 */
function nextWipeCombo(): string[] {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const palette = [...(dark ? WIPE_PALETTE_NIGHT : WIPE_PALETTE_DAY)];
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [palette[i], palette[j]] = [palette[j], palette[i]];
  }
  let combo = palette.slice(0, 3);
  if (combo.join() === lastWipeCombo) combo = [combo[1], combo[2], combo[0]];
  lastWipeCombo = combo.join();
  return combo;
}

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

  /* ---- Physical terminal choreography. One interruptible GSAP timeline
     owns the shell, page displacement, three positioned sheets and content. ---- */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const shellVisibleRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    const panel = layer.querySelector<HTMLElement>("[data-term-panel]");
    const shell = layer.closest<HTMLElement>("[data-terminal-open]");
    const page = shell?.querySelector<HTMLElement>("[data-terminal-page]") ?? null;
    const palettePanels = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-palette-panel]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-item]"));
    const rows = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-row]"));
    if (!panel || palettePanels.length !== 3) return undefined;

    const freshEntry = !shellVisibleRef.current;
    const pageShiftX = gsap.utils.clamp(-36, -12, window.innerWidth * -0.035);
    const panelRect = panel.getBoundingClientRect();
    const sheetStepX = gsap.utils.clamp(12, 16, panelRect.width * 0.04);
    const sheetStepY = gsap.utils.clamp(7, 10, panelRect.height * 0.012);
    const paletteTargets = palettePanels.map((_, index) => ({
      x: sheetStepX * (index + 1),
      y: sheetStepY * (index + 1),
    }));
    const shellEntryX = layer.getBoundingClientRect().width + 2;
    const shellOvershootX = -Math.min(3, panelRect.width * 0.008);

    /* Freeze the active frame before rebuilding a timeline for the new
       direction. Computed x includes GSAP percentages and swipe transforms. */
    timelineRef.current?.kill();
    const contentItems = [...blocks, ...rows];
    const currentLayerX = (): number => {
      const matrix = window.getComputedStyle(layer).transform.match(/^matrix(3d)?\((.+)\)$/);
      if (!matrix) return 0;
      const values = matrix[2].split(",");
      const xIndex = matrix[1] === "3d" ? 12 : 4;
      return parseFloat(values[xIndex]) || 0;
    };
    const readTransformValue = (element: HTMLElement, property: "x" | "y" | "xPercent"): number => {
      const value = Number(gsap.getProperty(element, property));
      return Number.isFinite(value) ? value : 0;
    };

    const cleanupContent = () => {
      gsap.set([...palettePanels, ...blocks, ...rows, panel], { clearProps: "all" });
    };
    const cleanupClosed = () => {
      /* The full object is off-canvas; hide it before removing sheet transforms
         so clearing inline palette colors cannot expose a flash in place. */
      gsap.set(layer, { visibility: "hidden" });
      cleanupContent();
      gsap.set(layer, { clearProps: "all" });
      if (page) gsap.set(page, { clearProps: "transform" });
      shellVisibleRef.current = false;
    };
    const setPaletteTargets = () => {
      palettePanels.forEach((palettePanel, index) => {
        gsap.set(palettePanel, {
          xPercent: 0,
          x: paletteTargets[index].x,
          y: paletteTargets[index].y,
          visibility: "visible",
        });
      });
    };

    if (prefersReducedMotion()) {
      if (terminalOpen) {
        if (freshEntry) {
          const combo = nextWipeCombo();
          palettePanels.forEach((palettePanel, index) => {
            palettePanel.style.background = combo[index];
          });
        }
        gsap.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" });
        if (page) gsap.set(page, { x: pageShiftX });
        setPaletteTargets();
        gsap.set(contentItems, { clearProps: "all" });
        shellVisibleRef.current = true;
      } else if (shellVisibleRef.current) {
        cleanupClosed();
      }

      return () => {
        timelineRef.current?.kill();
      };
    }

    if (terminalOpen) {
      if (freshEntry) {
        const combo = nextWipeCombo();
        palettePanels.forEach((palettePanel, index) => {
          palettePanel.style.background = combo[index];
        });
        /* All sheets wait outside the shell's clip while its static base enters. */
        gsap.set(palettePanels, {
          xPercent: 101,
          x: 0,
          y: 0,
          visibility: "visible",
        });
      }

      const layerX = freshEntry ? shellEntryX : currentLayerX();
      gsap.set(layer, {
        x: layerX,
        xPercent: 0,
        visibility: "visible",
        pointerEvents: "auto",
      });
      shellVisibleRef.current = true;
      gsap.set(contentItems, { visibility: "hidden", y: 0, yPercent: 0, rotate: 0 });

      const fullShellTravel = shellEntryX - shellOvershootX;
      const shellEntryDuration = freshEntry
        ? 0.42
        : gsap.utils.clamp(0.06, 0.42, 0.42 * Math.abs(layerX - shellOvershootX) / fullShellTravel);
      const shellSettleDuration = 0.09;
      const shellSettledAt = shellEntryDuration + shellSettleDuration;
      const paletteDuration = 0.17;
      const paletteGap = 0.035;
      const pendingPaletteIndices = palettePanels.reduce<number[]>((pending, palettePanel, index) => {
        const target = paletteTargets[index];
        const xPercent = readTransformValue(palettePanel, "xPercent");
        const x = readTransformValue(palettePanel, "x");
        const y = readTransformValue(palettePanel, "y");
        if (
          Math.abs(xPercent) > 0.5 ||
          Math.abs(x - target.x) > 0.5 ||
          Math.abs(y - target.y) > 0.5
        ) {
          pending.push(index);
        }
        return pending;
      }, []);

      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.addLabel("shell-entry", 0)
        .to(layer, { x: shellOvershootX, duration: shellEntryDuration, ease: EASE.out }, 0)
        .to(layer, { x: 0, duration: shellSettleDuration, ease: EASE.inOut }, shellEntryDuration)
        .addLabel("shell-settled", shellSettledAt);

      if (page) {
        const pageX = readTransformValue(page, "x");
        if (Math.abs(pageX - pageShiftX) > 0.25) {
          tl.to(page, { x: pageShiftX, duration: shellSettledAt, ease: EASE.out }, 0);
        }
      }

      let paletteEnd = shellSettledAt;
      pendingPaletteIndices.forEach((paletteIndex, order) => {
        const palettePanel = palettePanels[paletteIndex];
        const target = paletteTargets[paletteIndex];
        const xPercent = Math.abs(readTransformValue(palettePanel, "xPercent")) / 101;
        const xDistance = Math.abs(target.x - readTransformValue(palettePanel, "x")) / target.x;
        const yDistance = Math.abs(target.y - readTransformValue(palettePanel, "y")) / target.y;
        const remaining = gsap.utils.clamp(0.12, 1, Math.max(xPercent, xDistance, yDistance));
        const duration = paletteDuration * remaining;
        const position = paletteEnd + (order === 0 ? 0 : paletteGap);

        tl.to(
          palettePanel,
          { xPercent: 0, x: target.x, y: target.y, duration, ease: EASE.out },
          position,
        );
        paletteEnd = position + duration;
      });

      const contentStart = paletteEnd + 0.015;
      tl.fromTo(
        blocks,
        { visibility: "hidden", y: 3 },
        { visibility: "visible", y: 0, duration: 0.12, stagger: 0.02, ease: EASE.out },
        contentStart,
      ).fromTo(
        rows,
        { visibility: "hidden", yPercent: 7 },
        { visibility: "visible", yPercent: 0, duration: 0.12, stagger: 0.008, ease: EASE.out },
        contentStart + 0.02,
      );

      return () => {
        timelineRef.current?.kill();
      };
    }

    if (!shellVisibleRef.current) {
      return () => {
        timelineRef.current?.kill();
      };
    }

    /* Close is one tuck: content goes immediately, sheets freeze, and the
       complete terminal travels right while the website returns to x = 0. */
    const layerX = currentLayerX();
    gsap.set(layer, {
      x: layerX,
      xPercent: 0,
      visibility: "visible",
      pointerEvents: "none",
    });
    gsap.set(contentItems, { visibility: "hidden", y: 0, yPercent: 0, rotate: 0 });

    const remainingClose = Math.max(0, shellEntryX - layerX);
    const closeDuration = gsap.utils.clamp(0.08, 0.38, 0.38 * remainingClose / shellEntryX);
    const tl = gsap.timeline();
    timelineRef.current = tl;
    if (page) {
      const pageX = readTransformValue(page, "x");
      if (Math.abs(pageX) > 0.25) {
        tl.to(page, { x: 0, duration: closeDuration, ease: EASE.inOut }, 0);
      }
    }
    tl.to(layer, { x: shellEntryX, duration: closeDuration, ease: EASE.inOut }, 0).call(cleanupClosed);

    return () => {
      timelineRef.current?.kill();
    };
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
        <div
          className={styles.backgroundStack}
          aria-hidden="true"
          data-term-background-stack
        >
          {/* Three full-panel palette layers, stacked behind the terminal
              content and clipped to the existing rounded panel shape. */}
          <span className={styles.palettePanel} data-term-palette-panel aria-hidden="true" />
          <span className={styles.palettePanel} data-term-palette-panel aria-hidden="true" />
          <span className={styles.palettePanel} data-term-palette-panel aria-hidden="true" />
        </div>

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
