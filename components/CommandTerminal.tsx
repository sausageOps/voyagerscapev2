"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { CustomEase } from "gsap/CustomEase";
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
   OSMO-INSPIRED TERMINAL MOTION — FULL-SIZE PALETTE STACK
   ==================================================================
   The terminal keeps its Voyagerscape visual design and final position.
   The architecture follows the reference's layered-background approach:
   three full-size palette panels reveal the terminal; content is stacked
   above them and assembles upward after the wipe.

     • OPEN: the layer is visible at xPercent 0. The palette panels sweep
       from the RIGHT (xPercent 101 → 0, stagger 0.075, duration 0.42)
       on the same custom ease 0.65, 0.01, 0.05, 0.99. Interface details
       assemble above the stack, with command rows completing the reveal
       at approximately 0.8 seconds.
     • CLOSE: content exits while the ENTIRE terminal layer moves right
       to xPercent 120 on the same ease. Palette panels do not reverse.
       Once the layer is off-screen it is hidden, then its styles reset.

   The three sheet colors are selected per open from the approved
   Voyagerscape palettes. One timeline ref is killed and rebuilt on every
   toggle so interrupted OPEN/CLOSE sequences cannot stack animations.
   ================================================================== */

const WIPE_EASE_NAME = "vs-terminal-wipe";
let wipeEaseRegistered = false;

/** Registers (once) and returns the Osmo wipe ease. */
function ensureWipeEase(): string {
  if (!wipeEaseRegistered) {
    CustomEase.create(WIPE_EASE_NAME, "0.65, 0.01, 0.05, 0.99");
    wipeEaseRegistered = true;
  }
  return WIPE_EASE_NAME;
}

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

  /* ---- Open/close choreography. Runs before paint so the layer and its
     motion start state are applied with the same commit as data-open. ---- */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const panel = layer.querySelector<HTMLElement>("[data-term-panel]");
    const palettePanels = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-palette-panel]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-item]"));
    const rows = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-row]"));
    if (!panel || palettePanels.length !== 3) return undefined;

    /* Kill the previous motion before building the new state, so rapid
       OPEN/CLOSE/OPEN changes cannot stack timelines. */
    timelineRef.current?.kill();

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = terminalOpen;
    const ease = ensureWipeEase();

    /* Swipe dismissal writes a raw translate3d rather than using GSAP.
       Read its current x before taking ownership of the layer transform. */
    const layerDragX = (): number => {
      const matrix = window.getComputedStyle(layer).transform.match(/^matrix(3d)?\((.+)\)$/);
      if (!matrix) return 0;
      const values = matrix[2].split(",");
      const xIndex = matrix[1] === "3d" ? 12 : 4;
      return parseFloat(values[xIndex]) || 0;
    };

    const cleanupContent = () => {
      gsap.set([...palettePanels, ...blocks, ...rows, panel], { clearProps: "all" });
    };
    const cleanupClosed = () => {
      /* Hide the complete shell before resetting child transforms/styles;
         no cleanup tick can expose a stationary panel. */
      gsap.set(layer, { visibility: "hidden" });
      cleanupContent();
      gsap.set(layer, { clearProps: "all" });
    };

    /* Reduced motion keeps the same resting states without the sheet or
       slide transforms. A swipe's current drag is still honored. */
    if (prefersReducedMotion()) {
      if (terminalOpen) {
        cleanupContent();
        gsap.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" });
        gsap.set(panel, { x: 0 });
        const tl = gsap.timeline();
        tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "none" })
          .call(cleanupContent);
        timelineRef.current = tl;
      } else if (wasOpen) {
        const dragX = layerDragX();
        gsap.set(layer, { x: dragX, xPercent: 0, pointerEvents: "none" });
        const tl = gsap.timeline();
        tl.to(layer, { autoAlpha: 0, duration: 0.16, ease: "none" }).call(cleanupClosed);
        timelineRef.current = tl;
      }
      return () => {
        timelineRef.current?.kill();
      };
    }

    if (terminalOpen) {
      /* ================= OPEN =================
         The terminal layer is already at its final position. The three
         full-size palette panels become its menu background; interface
         details emerge first, followed by command rows that complete the
         approximately 0.8-second reveal. */
      const combo = nextWipeCombo();
      palettePanels.forEach((palettePanel, i) => {
        palettePanel.style.background = combo[i];
      });

      const paletteDuration = 0.42;
      const paletteStagger = 0.075;
      const paletteEnd = paletteDuration + paletteStagger * (palettePanels.length - 1);
      const contentRevealEnd = 0.8;
      const rowDuration = 0.13;
      const rowStagger = 0.012;
      const rowRevealDuration = rowDuration + rowStagger * Math.max(0, rows.length - 1);
      const rowStart = contentRevealEnd - rowRevealDuration;
      const blockStart = 0.3;
      const blockDuration = 0.11;
      const blockStagger =
        blocks.length > 1
          ? Math.max(0, (rowStart - blockStart - blockDuration) / (blocks.length - 1))
          : 0;
      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" }, 0)
        .set(panel, { x: 0 }, 0)
        .set(palettePanels, { autoAlpha: 1 }, 0)
        .fromTo(
          palettePanels,
          { xPercent: 101 },
          {
            xPercent: 0,
            duration: paletteDuration,
            stagger: paletteStagger,
            ease,
          },
          0,
        )
        .fromTo(
          blocks,
          { autoAlpha: 0, y: 14, rotate: 1.2 },
          { autoAlpha: 1, y: 0, rotate: 0, duration: blockDuration, stagger: blockStagger, ease },
          blockStart,
        )
        .fromTo(
          rows,
          { autoAlpha: 0, yPercent: 100, rotate: 5 },
          { autoAlpha: 1, yPercent: 0, rotate: 0, duration: rowDuration, stagger: rowStagger, ease },
          rowStart,
        );
      return () => {
        timelineRef.current?.kill();
      };
    }

    /* Initial mount is already closed — nothing to animate. */
    if (!wasOpen) {
      return () => {
        timelineRef.current?.kill();
      };
    }

    /* ================= CLOSE =================
       The sheets do not reverse. Exit the content with its established
       fade/rise while translating the whole existing layer (shell,
       content and any in-flight sheets) offscreen to the right. */
    const dragX = layerDragX();
    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.set(layer, { x: dragX, xPercent: 0, pointerEvents: "none" }, 0)
      .to(blocks, { autoAlpha: 0, y: 20, rotate: 1, duration: 0.24, stagger: 0.02, ease }, 0)
      .to(
        rows,
        { autoAlpha: 0, y: 22, rotate: 1, duration: 0.24, stagger: { each: 0.016, from: "end" }, ease },
        0,
      )
      .to(layer, { x: 0, xPercent: 120, duration: 0.575, ease }, 0)
      .call(cleanupClosed);

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
