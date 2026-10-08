"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE, gsap, prefersReducedMotion } from "@/lib/motion";
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
   TERMINAL MOTION — SOLID SIDE-ENTRY WINDOW + PALETTE SEQUENCE
   ==================================================================
   The .layer/.panel pair is one physical object: the panel's theme-aware
   surface stays solid while the complete shell enters from the right.
   Three full-panel palette sheets then animate above that static base;
   terminal content reveals only after the final sheet settles.

     • OPEN: shell xPercent 100 → 0; palettes start at 0.12s with a 0.12s
       stagger; content starts after Palette 3 settles (~0.55s).
     • CLOSE: content hides immediately; only the complete shell moves right.
       Palette sheets never reverse and there is no fade or color cleanup.

   A single timeline is killed/rebuilt on state changes. The current physical
   x-position is retained when a close is interrupted by a reopen, while a
   completed close resets all animation-only inline styles off-screen.
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

  /* ---- Open/close choreography. State and the initial visual pose are
     committed before paint. Every phase is driven by one interruptible GSAP
     timeline; the static .panel background is never animated. ---- */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const shellVisibleRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    const panel = layer.querySelector<HTMLElement>("[data-term-panel]");
    const shell = layer.closest<HTMLElement>("[data-terminal-open]");
    const page = shell?.querySelector<HTMLElement>("[data-terminal-page]") ?? null;
    const pageShiftX = gsap.utils.clamp(-36, -12, window.innerWidth * -0.035);
    const palettePanels = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-palette-panel]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-item]"));
    const rows = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-row]"));
    if (!panel || palettePanels.length !== 3) return undefined;

    /* Freeze the previous pose at its current frame. GSAP retains inline
       transform values when a timeline is killed, so a rapid opposite toggle
       can continue from the actual position rather than snapping. */
    timelineRef.current?.kill();
    const paletteEase = ensureWipeEase();
    const contentItems = [...blocks, ...rows];

    /* Swipe-to-close writes a raw translate3d. Reading the computed matrix
       lets the shell animation take ownership without discarding that drag. */
    const currentLayerX = (): number => {
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
      /* The shell is already off-canvas. Hide it before clearing motion
         styles so neither the base surface nor a palette can flash in place. */
      gsap.set(layer, { visibility: "hidden" });
      cleanupContent();
      gsap.set(layer, { clearProps: "all" });
      if (page) gsap.set(page, { clearProps: "transform" });
      shellVisibleRef.current = false;
    };

    if (prefersReducedMotion()) {
      if (terminalOpen) {
        const combo = nextWipeCombo();
        palettePanels.forEach((palettePanel, index) => {
          palettePanel.style.background = combo[index];
        });
        gsap.set(layer, { x: 0, xPercent: 0, visibility: "visible", pointerEvents: "auto" });
        if (page) gsap.set(page, { x: pageShiftX });
        gsap.set(palettePanels, { xPercent: 0, autoAlpha: 1 });
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
      const combo = nextWipeCombo();
      palettePanels.forEach((palettePanel, index) => {
        palettePanel.style.background = combo[index];
      });

      /* A first open starts just outside the right edge. If the close was
         interrupted, retain the shell's current screen position and return
         smoothly from there instead of restarting off-screen. */
      if (shellVisibleRef.current) {
        gsap.set(layer, {
          x: currentLayerX(),
          xPercent: 0,
          visibility: "visible",
          pointerEvents: "auto",
        });
      } else {
        gsap.set(layer, {
          x: 0,
          xPercent: 100,
          visibility: "visible",
          pointerEvents: "auto",
        });
      }
      shellVisibleRef.current = true;

      /* Keep the cream/dark base exposed beneath the palette sheets until
         each right-entering color layer covers it. Content remains above
         the stack, but hidden until the last sheet has settled. */
      gsap.set(palettePanels, { xPercent: 101, autoAlpha: 1 });
      gsap.set(contentItems, { autoAlpha: 0, y: 0, yPercent: 0, rotate: 0 });

      const paletteStart = 0.12;
      const paletteDuration = 0.18;
      const paletteStagger = 0.12;
      const paletteEnd = paletteStart + paletteDuration + paletteStagger * (palettePanels.length - 1);
      const contentStart = paletteEnd + 0.012;
      const tl = gsap.timeline();
      timelineRef.current = tl;

      if (page) {
        tl.to(page, { x: pageShiftX, duration: 0.56, ease: EASE.out }, 0);
      }
      tl.to(
        layer,
        { x: 0, xPercent: 0, duration: 0.56, ease: EASE.out },
        0,
      ).fromTo(
        palettePanels,
        { xPercent: 101 },
        { xPercent: 0, duration: paletteDuration, stagger: paletteStagger, ease: paletteEase },
        paletteStart,
      )
        .fromTo(
          blocks,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.035, ease: EASE.out },
          contentStart,
        )
        .fromTo(
          rows,
          { autoAlpha: 0, yPercent: 40 },
          { autoAlpha: 1, yPercent: 0, duration: 0.15, stagger: 0.012, ease: EASE.out },
          contentStart + 0.035,
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

    /* Close is intentionally one-way: hide content now, leave the settled or
       in-flight palettes untouched, and tuck the complete solid shell right. */
    gsap.set(layer, {
      x: currentLayerX(),
      xPercent: 0,
      visibility: "visible",
      pointerEvents: "none",
    });
    gsap.set(contentItems, { autoAlpha: 0, y: 0, yPercent: 0, rotate: 0 });

    const tl = gsap.timeline();
    timelineRef.current = tl;
    if (page) tl.to(page, { x: 0, duration: 0.56, ease: EASE.inOut }, 0);
    tl.to(layer, { x: 0, xPercent: 120, duration: 0.5, ease: EASE.inOut }, 0).call(cleanupClosed);

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
