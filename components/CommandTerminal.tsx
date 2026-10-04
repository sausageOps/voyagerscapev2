"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      >
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

            <div className={styles.commandHeader} data-term-item>
              <TechLabel nano className={styles.commandMeta}>
                Available commands
              </TechLabel>
              <TechLabel nano className={styles.commandMeta}>
                {SUGGESTIONS.length.toString().padStart(2, "0")}
              </TechLabel>
            </div>

            <ul className={styles.prompts} data-term-item>
              {SUGGESTIONS.map((command, index) => (
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
    </aside>
  );
}
