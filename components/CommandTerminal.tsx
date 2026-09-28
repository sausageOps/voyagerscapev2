"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUI, type VisualMode } from "@/lib/ui-store";
import { useRouteTransition } from "@/components/RouteTransition";
import { ROUTES } from "@/lib/routes";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import CommandInput from "@/components/CommandInput";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./CommandTerminal.module.css";

const EFFECT_COMMANDS = ["bw", "negative", "reset"] as const;
const SUGGESTIONS = [...ROUTES.map((r) => r.command), ...EFFECT_COMMANDS, "close"];

interface LogLine {
  id: number;
  kind: "in" | "ok" | "err";
  text: string;
}

export default function CommandTerminal() {
  const { navigate } = useRouteTransition();
  const { terminalOpen, setTerminalOpen, visualMode, setVisualMode } = useUI();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const logId = useRef(0);

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

  /* ---- Entrance / exit motion ---- */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (prefersReducedMotion()) {
      gsap.set(panel, { xPercent: terminalOpen ? 0 : 104, opacity: terminalOpen ? 1 : 0 });
    } else {
      gsap.killTweensOf(panel);
      if (terminalOpen) {
        gsap.fromTo(
          panel,
          { xPercent: 104, opacity: 0, filter: "blur(14px)" },
          {
            xPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.72,
            ease: "expo.out",
          },
        );
        gsap.fromTo(
          panel.querySelectorAll("[data-term-item]"),
          { opacity: 0, x: 14 },
          { opacity: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.03, delay: 0.14 },
        );
      } else {
        gsap.to(panel, {
          xPercent: 104,
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.38,
          ease: "power3.in",
        });
      }
    }

    if (terminalOpen) {
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(focusTimer);
    }
    lastFocused.current?.focus?.();
    return undefined;
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
      id="vs-command-terminal"
      className={styles.layer}
      data-open={terminalOpen ? "true" : "false"}
      aria-hidden={!terminalOpen}
    >
      <div
        className={`vs-glass vs-glass--solid ${styles.panel}`}
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Voyagerscape command terminal"
      >
        <div className={styles.head} data-term-item>
          <div className={styles.headText}>
            <TechLabel nano className={styles.system}>
              Voyagerscape
            </TechLabel>
            <TechLabel className={styles.title}>Command Terminal</TechLabel>
          </div>
          <button
            type="button"
            className={`vs-glass ${styles.close}`}
            onClick={() => setTerminalOpen(false)}
            aria-label="Close command terminal"
            data-cursor="link"
            data-magnetic
            tabIndex={terminalOpen ? 0 : -1}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={styles.body}>
          <div data-term-item>
            <CommandInput ref={inputRef} onSubmit={run} disabled={!terminalOpen} />
          </div>

          <p className={styles.intro} data-term-item>
            Start typing and see where it leads you… or use one of the prompts below.
          </p>

          {log.length > 0 && (
            <div className={styles.log} role="log" aria-live="polite">
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

          <ul className={styles.prompts} data-term-item>
            {SUGGESTIONS.map((command) => (
              <li key={command}>
                <button
                  type="button"
                  className={styles.prompt}
                  onClick={() => run(command)}
                  data-cursor="link"
                  data-magnetic
                  tabIndex={terminalOpen ? 0 : -1}
                  data-active={
                    (command === "bw" && visualMode === "bw") ||
                    (command === "negative" && visualMode === "negative")
                      ? "true"
                      : undefined
                  }
                >
                  {command}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.foot} data-term-item>
          <TechLabel nano>ESC to close</TechLabel>
          <TechLabel nano className={styles.mode}>
            MODE: {visualMode}
          </TechLabel>
        </div>
      </div>
    </aside>
  );
}
