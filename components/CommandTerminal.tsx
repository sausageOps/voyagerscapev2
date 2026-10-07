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
   OSMO WIPE OPEN/CLOSE MOTION — THREE DISTINCT COLORED PANELS
   ==================================================================
   Reference: codepen.io/osmosupply/pen/JoPPOXj ("Side Navigation with
   Wipe Effect" by Osmo). ONLY the motion language is borrowed — the
   terminal's own visual design (position, size, surfaces, typography,
   content, chrome) is untouched. The signature Osmo visual — three
   VISUALLY DISTINCT background panels — is preserved:

     • the exact custom ease 0.65, 0.01, 0.05, 0.99 (registered below
       as a GSAP CustomEase — a free, non-club plugin);
     • OPEN: three distinctly colored full-bleed sheets sweep in from
       the RIGHT (xPercent 101 → 0, stagger 0.12, duration 0.575 — the
       reference's exact numbers), each with the terminal's rounded
       leading edge, clearly reading as three physical slabs unfolding
       the terminal;
     • the contents then rise in AFTER the wipe has begun (fade + small
       rise + 1–1.5° settle, stagger 0.04–0.045 — the reference's
       yPercent 140 / rotate 10 link entrance, conservatively adapted);
     • when the wipe finishes the sheets are hidden instantly
       (autoAlpha 0), revealing the terminal's own background — the
       panel paints var(--vs-terminal-bg) at all times, so the settled
       terminal looks EXACTLY like the approved design (the colored
       panels are temporary, per the brief);
     • CLOSE is the exact physical reverse: the contents retract into
       the wipe, the SAME three sheets fold back out toward the right
       (topmost first — reversed stagger), and only once the last sheet
       is fully outside does the layer hide. Never a whole-panel slide.

   The three sheet colors are chosen per open from the approved
   Voyagerscape page-transition palettes (mirrored below — the
   transition system itself is not touched): three DISTINCT colors,
   harmonious by construction, a fresh combination each open, never the
   previous combination twice. The animation geometry/timing is
   identical every time — only the colors vary.

   One timeline ref, killed and rebuilt on every toggle; every timeline
   explicitly establishes its start state; a final cleanup clears every
   inline style GSAP touched — rapid open/close/open can never stack
   animations or leave stale transforms, colors or pointer-events.
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
  /* The three palette colors chosen for the current open. The CLOSE
     re-uses exactly these — the same three physical sheets fold back
     out (never a different combination mid-flight). */
  const comboRef = useRef<string[] | null>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const panel = layer.querySelector<HTMLElement>("[data-term-panel]");
    const frame = layer.querySelector<HTMLElement>("[data-term-frame]");
    const wipes = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-wipe]"));
    const blocks = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-item]"));
    const rows = Array.from(layer.querySelectorAll<HTMLElement>("[data-term-row]"));
    if (!panel || !frame || wipes.length !== 3) return undefined;

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
         1. layer becomes visible at its resting position (it never
            slides — the PANELS create the reveal)
         2. three DISTINCTLY COLORED sheets sweep in from the right,
            staggered, on the Osmo ease — the terminal's rounded chrome
            fades in with the first sheet, so there is never an empty
            shell
         3. the contents rise in after the wipe has begun
         4. the moment the LAST sheet's tween completes, that same
            GSAP update hides the sheets — the terminal's own
            background (painted by .panel at all times) shows
            underneath; a landed pale sheet is never painted
         5. cleanup → the exact settled terminal UI */
      const combo = nextWipeCombo();
      comboRef.current = combo;
      wipes.forEach((wipe, i) => {
        wipe.style.background = combo[i];
      });

      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.set(layer, { x: 0, visibility: "visible", pointerEvents: "auto" }, 0)
        .set(panel, { x: 0 }, 0)
        /* start state: the colored sheets parked off-right and fully
           opaque; the terminal's own background (.panel CSS) stays
           painted underneath — never cleared, never hidden */
        .set(wipes, { autoAlpha: 1 }, 0)
        .fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "none" }, 0)
        /* THE WIPE — the reference's exact numbers. The sheets' hide is
           tied to the completion of the wipe tween itself (not a
           timeline timestamp): GSAP fires this onComplete ONCE, when
           the staggered tween ends = the LAST sheet's landing, inside
           the same update that renders the sheet's final position.
           gsap.set applies synchronously within that same update, so
           the paint of the completing tick already has opacity 0 — a
           fully-landed pale sheet can never be rendered, at any frame
           rate, and even a dropped frame that jumps past the end
           renders the completion and fires the callback together. */
        .fromTo(
          wipes,
          { xPercent: 101 },
          {
            xPercent: 0,
            duration: 0.575,
            stagger: 0.12,
            ease,
            onComplete: () => {
              gsap.set(wipes, { autoAlpha: 0 });
            },
          },
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
       The exact physical reverse of the open: the contents retract
       into the wipe, the surface re-forms as the colored sheets, and
       the SAME three sheets fold back out toward the right — topmost
       first (reversed stagger), each revealing the one beneath — so
       the close reads as the open folding back. Only once the last
       sheet is fully outside the terminal does the layer hide. */
    const combo = comboRef.current;
    if (combo) {
      wipes.forEach((wipe, i) => {
        wipe.style.background = combo[i];
      });
    }

    const dragX = layerDragX();
    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.set(layer, { pointerEvents: "none" }, 0);

    if (dragX > 1) {
      /* A swipe dismissal leaves the finger's drag on the layer (the
         swipe hook's inline transform). The drag is carried by the
         PANEL and ridden out toward the right with the gesture's
         momentum — one continuous motion, no snap-back. */
      tl.set(layer, { x: 0 }, 0)
        .set(panel, { x: dragX }, 0)
        .to([frame, ...blocks, ...rows], { autoAlpha: 0, duration: 0.2, ease: "none" }, 0)
        .to(panel, { x: () => panel.clientWidth + 2, duration: 0.3, ease }, 0)
        .call(cleanupClosed);
    } else {
      tl.to(
        blocks,
        { autoAlpha: 0, y: 20, rotate: 1, duration: 0.24, stagger: 0.02, ease },
        0,
      )
        .to(
          rows,
          { autoAlpha: 0, y: 22, rotate: 1, duration: 0.24, stagger: { each: 0.016, from: "end" }, ease },
          0,
        )
        /* the surface re-forms as the colored sheets come back over
           the terminal's own (always-painted) background, and the
           chrome departs with it */
        .to(wipes, { autoAlpha: 1, duration: 0.12, ease: "none" }, 0.02)
        .to(frame, { autoAlpha: 0, duration: 0.26, ease: "none" }, 0.16)
        /* THE REVERSE WIPE — the same three sheets travel back out to
           the right; from:"end" sends the topmost (last-arrived) sheet
           first, so the layers visibly fold back in reverse order */
        .to(
          wipes,
          { xPercent: 101, duration: 0.575, stagger: { each: 0.12, from: "end" }, ease },
          0.2,
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
        {/* The three Osmo wipe sheets — animation-only slabs whose
            colors are chosen per open from the approved Voyagerscape
            transition palettes (three DISTINCT colors), stacked behind
            the content and clipped to the terminal's rounded shape. */}
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
