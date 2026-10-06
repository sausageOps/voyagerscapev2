"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { CustomEase } from "gsap/CustomEase";
import { useUI, type VisualMode } from "@/lib/ui-store";
import { useRouteTransition } from "@/components/RouteTransition";
import { ROUTES } from "@/lib/routes";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import CommandInput from "@/components/CommandInput";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./CommandTerminal.module.css";

const EFFECT_COMMANDS = ["bw", "negative", "reset"] as const;
const SUGGESTIONS = [...ROUTES.map((r) => r.command), ...EFFECT_COMMANDS, "close"];

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  home: "Return to the landing page",
  art: "Open the art archive",
  connect: "Open the transmission desk",
  about: "Enter the studio archive",
  bw: "Switch to monochrome mode",
  negative: "Invert the visual palette",
  reset: "Restore the default palette",
  close: "Dismiss the command terminal",
};

/* ==================================================================
   OSMO WIPE OPEN/CLOSE MOTION (motion language only)
   ==================================================================
   Reference: codepen.io/osmosupply/pen/JoPPOXj ("Side Navigation with
   Wipe Effect" by Osmo). ONLY the choreography is borrowed — the
   terminal's own visual design (position, size, surfaces, typography,
   content, chrome) is untouched:

     • the exact custom ease 0.65, 0.01, 0.05, 0.99 (registered below
       as a GSAP CustomEase — a free, non-club plugin);
     • staggered full-bleed background panels wiping right-to-left on
       open (xPercent 101 → 0, stagger 0.12, duration 0.575), here
       rendered as three animation-only .wipe slabs in the terminal's
       own surface color (see CommandTerminal.module.css);
     • the terminal contents settling in AFTER the wipe begins
       (fade + small rise + 1–1.5° settle, conservative adaptation of
       the reference's yPercent 140 / rotate 10 link entrance);
     • the reverse choreography on close (contents retract, wipe
       panels travel back out toward the right, then the layer hides).

   The layer itself no longer CSS-slides; GSAP owns visibility and
   pointer-events inline, with the stylesheet rules as the resting
   states. One timeline ref, killed and rebuilt on every toggle —
   rapid open/close/open can never stack animations or leave stale
   inline styles (a final cleanup clears everything GSAP touched).
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

interface LogLine {
  id: number;
  kind: "in" | "ok" | "err";
  text: string;
}

export default function CommandTerminal() {
  const { navigate } = useRouteTransition();
  const { terminalOpen, setTerminalOpen, visualMode, setVisualMode } = useUI();
  const layerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const logId = useRef(0);
  const closeTerminal = useCallback(() => setTerminalOpen(false), [setTerminalOpen]);

  useSwipeToClose(layerRef, terminalOpen, closeTerminal);

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

  /* ---- Focus restoration (opening never steals focus) ---- */
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

  /* ---- Open/close choreography (the Osmo wipe — see the notes at the
     top of this file). Runs before paint (useLayoutEffect) so the wipe
     start state is applied with the same commit that flips data-open:
     no flash of the settled terminal, no flash of the closed one. ---- */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const panel = layer.querySelector<HTMLElement>("[data-term-panel]");
    const frame = layer.querySelector<HTMLElement>("[data-term-frame]");
    const wipes = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-wipe]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-item]"));
    const rows = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-row]"));
    if (!panel || !frame || wipes.length === 0) return undefined;

    /* Interruption safety: ONE timeline ref, always killed first. The new
       timeline re-specifies every animated property (fromTo / explicit
       sets), so a killed mid-flight predecessor can never leak state. */
    timelineRef.current?.kill();

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = terminalOpen;

    const ease = ensureWipeEase();

    /* The swipe hook drags the LAYER via a raw inline transform that
       GSAP's cache does not know about, so the drag is read from the
       computed matrix (not gsap.getProperty, which would return a stale
       cached x). */
    const layerDragX = (): number => {
      const m = window.getComputedStyle(layer).transform.match(/matrix.*\((.+)\)/);
      return m ? parseFloat(m[1].split(",")[4]) || 0 : 0;
    };

    /* A swipe dismissal leaves a raw inline transform on the layer (the
       swipe hook removes it on its next frame). Strip it here too, so a
       rapid swipe-close → reopen can never resurrect a shifted layer. */
    if (terminalOpen) {
      layer.style.removeProperty("transform");
    }

    /* Restoring cleanup — returns every animated element to pristine
       stylesheet state. After OPEN only the content is cleared (the
       layer must keep its inline visibility/pointer-events so the close
       animation stays visible after data-open flips); after CLOSE the
       layer is cleared too, landing exactly on the CSS closed state. */
    const cleanupContent = () => {
      gsap.set([frame, ...wipes, ...blocks, ...rows, panel], { clearProps: "all" });
    };
    const cleanupClosed = () => {
      cleanupContent();
      gsap.set(layer, { clearProps: "all" });
    };

    /* ---- Reduced motion: no wipe, no stagger, no transforms — just a
       plain fade to the correct resting state. ---- */
    if (prefersReducedMotion()) {
      if (terminalOpen) {
        gsap.set([layer, panel], { x: 0 });
        const tl = gsap.timeline();
        tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "none" }).call(cleanupContent);
        timelineRef.current = tl;
      } else if (wasOpen) {
        /* Carry a live swipe dismissal out under the fade (see below). */
        const dragX = layerDragX();
        gsap.set(layer, { x: 0 });
        if (dragX > 1) gsap.set(panel, { x: dragX });
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
         1. layer becomes visible at its resting position
         2. chrome (border/radius/shadow) fades in
         3. wipe slabs sweep right-to-left, staggered
         4. contents rise in after the wipe begins
         5. cleanup → the exact settled terminal UI */
      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.set(layer, { x: 0, visibility: "visible", pointerEvents: "auto" }, 0)
        .set(panel, { x: 0 }, 0)
        .fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, 0)
        .fromTo(
          wipes,
          { xPercent: 101 },
          { xPercent: 0, duration: 0.575, stagger: 0.12, ease },
          0,
        )
        .fromTo(
          blocks,
          { autoAlpha: 0, y: 24, rotate: 1.2 },
          { autoAlpha: 1, y: 0, rotate: 0, duration: 0.5, stagger: 0.045, ease },
          0.24,
        )
        .fromTo(
          rows,
          { autoAlpha: 0, y: 26, rotate: 1.5 },
          { autoAlpha: 1, y: 0, rotate: 0, duration: 0.5, stagger: 0.04, ease },
          0.36,
        )
        .call(cleanupContent);
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
       Reverse physical action: contents retract, the wipe travels back
       out toward the right, then the layer lands on its closed state. */
    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.set(layer, { pointerEvents: "none" }, 0);

    /* A swipe dismissal leaves the finger's drag on the layer (the swipe
       hook's inline transform). The choreographed close assumes the
       resting position, so the drag is carried by the PANEL and ridden
       out with the gesture's momentum instead — one continuous motion,
       no snap-back. */
    const dragX = layerDragX();
    if (dragX > 1) {
      tl.set(layer, { x: 0 }, 0)
        .set(panel, { x: dragX }, 0)
        .to([frame, ...blocks, ...rows], { autoAlpha: 0, duration: 0.2, ease: "none" }, 0)
        .to(panel, { x: () => panel.clientWidth + 2, duration: 0.3, ease }, 0)
        .call(cleanupClosed);
    } else {
      tl.to(
        blocks,
        { autoAlpha: 0, y: 18, rotate: 1, duration: 0.26, stagger: 0.018, ease },
        0,
      )
        .to(
          rows,
          { autoAlpha: 0, y: 18, rotate: 1, duration: 0.24, stagger: { each: 0.016, from: "end" }, ease },
          0,
        )
        .to(frame, { autoAlpha: 0, duration: 0.28, ease: "none" }, 0.06)
        .to(
          wipes,
          { xPercent: 101, duration: 0.45, stagger: { each: 0.09, from: "end" }, ease },
          0.08,
        )
        .call(cleanupClosed);
    }

    return () => {
      timelineRef.current?.kill();
    };
  }, [terminalOpen]);

  /* ---- Command execution ---- */
  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().toLowerCase();
      if (!command) return;
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

      if (command === "bw" || command === "negative") {
        setVisualMode(command as VisualMode);
        push("ok", `visual mode → ${command}`);
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
    [push, navigate, setTerminalOpen, setVisualMode],
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
        {/* Osmo wipe layers — animation-only slabs of the terminal's own
            surface color, stacked behind the content (see the motion
            notes at the top of this file and .wipe in the module CSS). */}
        <span className={styles.wipe} data-term-wipe aria-hidden="true" />
        <span className={styles.wipe} data-term-wipe aria-hidden="true" />
        <span className={styles.wipe} data-term-wipe aria-hidden="true" />

        <div className={styles.head} data-term-item>
          <div className={styles.headText}>
            <TechLabel className={styles.title}>COMMAND/SEARCH TERMINAL</TechLabel>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => setTerminalOpen(false)}
            aria-label="Close command terminal"
            data-cursor="link"
            data-magnetic
            tabIndex={terminalOpen ? 0 : -1}
          >
            <span className={styles.closeGlyph} aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputShell} data-term-item>
            <CommandInput ref={inputRef} onSubmit={run} disabled={!terminalOpen} />
          </div>

          <div className={styles.scrollArea}>
            <p className={styles.intro} data-term-item>
              Type a command or choose an action below.
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

            <div className={styles.commandHeader} data-term-item>
              <TechLabel nano className={styles.commandMeta}>
                Available commands
              </TechLabel>
              <TechLabel nano className={styles.commandMeta}>
                {SUGGESTIONS.length.toString().padStart(2, "0")}
              </TechLabel>
            </div>

            <ul className={styles.prompts}>
              {SUGGESTIONS.map((command, index) => (
                <li key={command}>
                  <button
                    type="button"
                    className={styles.prompt}
                    onClick={() => run(command)}
                    data-cursor="link"
                    data-magnetic
                    data-term-row
                    tabIndex={terminalOpen ? 0 : -1}
                    data-active={
                      (command === "bw" && visualMode === "bw") ||
                      (command === "negative" && visualMode === "negative")
                        ? "true"
                        : undefined
                    }
                  >
                    <span className={styles.sequence} aria-hidden="true">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span className={styles.commandName}>{command}</span>
                    <span className={styles.commandDescription}>{COMMAND_DESCRIPTIONS[command]}</span>
                    <span className={styles.commandArrow} aria-hidden="true">
                      ↵
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.foot} data-term-item>
          <TechLabel nano className={styles.escapeHint}>
            ESC to close
          </TechLabel>
          <TechLabel nano className={styles.mode}>
            <span>Mode: </span>
            <span className={styles.adminSignal}>Admin</span>
          </TechLabel>
        </div>
      </div>

      {/* Animation-only chrome carrier: the terminal's exact border,
          corner radius and shadow, faded in/out with the wipe. At rest
          it is pixel-identical to the chrome the panel used to paint
          itself (see .frame in the module CSS). */}
      <span className={styles.frame} data-term-frame aria-hidden="true" />
    </aside>
  );
}
