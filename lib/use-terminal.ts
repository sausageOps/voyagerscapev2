"use client";

import { useCallback, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { useRouteTransition } from "@/components/RouteTransition";
import { parseCommand, SUGGESTIONS } from "@/lib/terminal-commands";

/**
 * THE TERMINAL'S BEHAVIOUR — transcript, execution, focus targets.
 * ===============================================================
 *
 * This is the terminal's runtime: the transcript state and its seven-line
 * window, the `push` helper, and the `run` handler that turns one submitted
 * line into a navigation, a close, a visual-mode reset, the command list, or
 * an error line. It was extracted from the original overlay shell so the
 * terminal is one behaviour with one home, rendered by one surface
 * (`TosExperiment/TerminalSurface`).
 *
 * The command vocabulary itself lives in `lib/terminal-commands.ts`.
 *
 * Behaviour kept exactly as the production terminal had it:
 *   • `clear` empties the transcript and rewinds its scroll, and is not
 *     echoed;
 *   • a destination echoes the command, logs `navigating → <href>`,
 *     hands off to the shared route transition, and closes the terminal
 *     a beat later (260ms) so the curtain covers the panel leaving;
 *   • `close` / `exit` dismiss without logging;
 *   • `reset` returns the visual mode to normal;
 *   • `help` / `?` lists the vocabulary;
 *   • anything else is `E_UNKNOWN_CMD` — never a silent ignore.
 */

export interface TerminalLine {
  id: number;
  kind: "in" | "ok" | "err";
  text: string;
}

export function useTerminal() {
  const { navigate } = useRouteTransition();
  const { setTerminalOpen, setVisualMode } = useUI();
  const [log, setLog] = useState<TerminalLine[]>([]);
  const logId = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* The transcript keeps its last seven lines, exactly as production. */
  const push = useCallback((kind: TerminalLine["kind"], text: string) => {
    logId.current += 1;
    setLog((prev) => [...prev.slice(-6), { id: logId.current, kind, text }]);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().toLowerCase();
      const action = parseCommand(command);
      if (!action) return;

      if (action.type === "clear") {
        setLog([]);
        if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
        return;
      }

      push("in", command);

      switch (action.type) {
        case "route":
          push("ok", `navigating → ${action.href}`);
          navigate(action.href);
          window.setTimeout(() => setTerminalOpen(false), 260);
          return;
        case "close":
          setTerminalOpen(false);
          return;
        case "reset":
          setVisualMode("normal");
          push("ok", "visual mode → normal");
          return;
        case "help":
          push("ok", `available → ${SUGGESTIONS.join(" · ")}`);
          return;
        default:
          push("err", `E_UNKNOWN_CMD :: "${action.command}" not recognised`);
      }
    },
    [navigate, push, setTerminalOpen, setVisualMode],
  );

  return { log, run, scrollAreaRef, inputRef };
}
