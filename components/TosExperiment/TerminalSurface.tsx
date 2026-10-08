"use client";

import CommandInput from "@/components/CommandInput";
import TechLabel from "@/components/primitives/TechLabel";
import { useTerminal } from "@/lib/use-terminal";
import { COMMAND_DESCRIPTIONS, COMMAND_LABELS, SUGGESTIONS } from "@/lib/terminal-commands";
import term from "@/components/CommandTerminal.module.css";
import menu from "@/components/MobileMenu.module.css";
import styles from "./TerminalSurface.module.css";

/**
 * TERMINAL SURFACE — the command terminal, as the content of the side page.
 * ======================================================================
 *
 * The terminal is NOT a panel that slides over the website: it is what lives
 * inside the right-hand page's window, exactly as the menu does. This
 * component owns only the CONTENT of that window — the page, the window, the
 * geometry, the slide and the palette reveal all belong to the approved
 * side-page system around it (`TosSideSurface` → `TosTerminalWindow`).
 *
 * The structure is the production terminal's own content layer, unchanged:
 * the head and its title, the shared `CommandInput`, the intro line, the
 * transcript and the command chips, and the foot with the escape hint and
 * the mode readout. It is rendered with the production stylesheet
 * (`CommandTerminal.module.css`) rather than a restatement of it, so the
 * terminal's typography, spacing, chips and transcript keep the exact
 * appearance they already had — what changed is only the shell they sit in.
 *
 * The behaviour is not restated either: `useTerminal()` owns the transcript,
 * the command execution and the scroll target, and
 * `lib/terminal-commands.ts` owns the vocabulary.
 *
 * One addition to the production content, and why: a Close control in the
 * head row. The production overlay could always be dismissed by the header's
 * own terminal bubble because the website never moved; in the side page the
 * composition carries the header off to the left, so on touch there would be
 * no reachable way out. It reuses the menu window's approved Close control
 * rather than introducing a new one, and ESC (keyboard) and `close`
 * (command) both still work.
 */
export default function TerminalSurface({
  active,
  onClose,
}: {
  /** The page is on screen. Gates focusability of everything inside. */
  active: boolean;
  onClose: () => void;
}) {
  const { log, run, scrollAreaRef, inputRef } = useTerminal();

  return (
    <div className={term.contentLayer} data-tos-terminal-content>
      <div className={term.head} data-term-item>
        <div className={term.headText}>
          <p className={term.title}>V :/ Command Terminal</p>
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={menu.close}
            onClick={onClose}
            aria-label="Close terminal"
            tabIndex={active ? 0 : -1}
          >
            Close
          </button>
        </div>
      </div>

      <div className={term.body}>
        <div className={term.inputShell} data-term-item>
          <CommandInput ref={inputRef} onSubmit={run} disabled={!active} />
        </div>

        <div ref={scrollAreaRef} className={term.scrollArea}>
          <p className={term.intro} data-term-item>
            Start typing and see where it leads you... or use one of the prompts listed below.
          </p>

          {log.length > 0 && (
            <div className={term.log} role="log" aria-live="polite" data-term-item>
              {log.map((line) => (
                <p key={line.id} className={term.logLine} data-kind={line.kind}>
                  <span className={term.logGlyph} aria-hidden="true">
                    {line.kind === "in" ? ":/" : line.kind === "ok" ? "»" : "!"}
                  </span>
                  {line.text}
                </p>
              ))}
            </div>
          )}

          <ul className={term.commandTags} aria-label="Available commands">
            {SUGGESTIONS.map((command) => (
              <li key={command}>
                <span
                  className={term.commandTag}
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

      <div className={term.foot} data-term-item>
        <span className={`${term.escapeHint} ${styles.escapeHint}`}>
          <span className={term.desktopCloseHint}>ESC TO CLOSE</span>
        </span>
        <TechLabel nano className={term.mode}>
          <span>Mode: </span>
          <span className={term.adminSignal}>Admin</span>
        </TechLabel>
      </div>
    </div>
  );
}
