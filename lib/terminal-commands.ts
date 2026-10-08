import { ROUTES } from "@/lib/routes";

/**
 * TERMINAL COMMANDS — the vocabulary, in one place.
 * =================================================
 *
 * This is the terminal's command set, lifted out verbatim so the command
 * table, the labels and the parsing exist exactly once — there is one
 * terminal, and this is its vocabulary.
 *
 * The destinations are not restated here: they come from `lib/routes.ts`,
 * the single route registry the header and the pages already use.
 */

/** Every command the terminal answers, in the order the prompt chips show them. */
export const SUGGESTIONS: string[] = [...ROUTES.map((r) => r.command), "reset", "clear", "close"];

export const COMMAND_DESCRIPTIONS: Record<string, string> = {
  home: "Return to the landing page",
  art: "Open the art archive",
  connect: "Open the transmission desk",
  about: "Enter the studio archive",
  reset: "Restore the default palette",
  clear: "Clear the terminal transcript",
  close: "Dismiss the command terminal",
};

export const COMMAND_LABELS: Record<string, string> = {
  home: "Home",
  art: "Art",
  connect: "Connect",
  about: "About",
  reset: "Reset",
  clear: "Clear",
  close: "Close",
};

/** What one submission means. */
export type TerminalCommand =
  | { type: "clear" }
  | { type: "route"; href: string }
  | { type: "close" }
  | { type: "reset" }
  | { type: "help" }
  | { type: "unknown"; command: string };

/**
 * Resolve one submitted line. `command` must already be normalised
 * (`raw.trim().toLowerCase()`), which is also the string the transcript
 * echoes. Returns `null` for an empty submission — the production terminal
 * ignored those without logging them.
 *
 * Order matters and is the production terminal's own: `clear` never
 * reaches the transcript, destinations resolve before the keywords, and
 * an unrecognised word is an error line, never a navigation.
 */
export function parseCommand(command: string): TerminalCommand | null {
  if (!command) return null;
  if (command === "clear") return { type: "clear" };

  const route = ROUTES.find((r) => r.command === command);
  if (route) return { type: "route", href: route.href };

  if (command === "close" || command === "exit") return { type: "close" };
  if (command === "reset") return { type: "reset" };
  if (command === "help" || command === "?") return { type: "help" };

  return { type: "unknown", command };
}
