/**
 * WIPE PALETTE — the approved sheet colours, and how a combination is drawn.
 * ========================================================================
 *
 * This is the terminal's own palette-selection logic (pools, the
 * no-immediate-repeat guard and `nextWipeCombo()`), lifted verbatim out of the
 * original overlay shell so that more than one surface can open with the same
 * wipe without a second implementation existing anywhere:
 *
 *   • the side page's terminal (`TosExperiment/TerminalSurface`);
 *   • the side page's menu, whose sheets open with the same selection.
 *
 * The guard is module-level, so it is shared by every caller: two surfaces
 * opening one after another can never repeat the same combination either.
 *
 * Day: pale editorial. Night: the dark smoked set — no bright pastel flash
 * at night. These are the approved Voyagerscape page-transition colours, the
 * same set `RouteTransitionVariants` cycles; no new colour is introduced here
 * and none of these values may be changed.
 */

export const WIPE_PALETTE_DAY = ["#f3f0e8", "#ddd9e8", "#e8e2d7", "#dce1d8", "#e9dcd2"] as const;
export const WIPE_PALETTE_NIGHT = ["#5a564e", "#514d5b", "#595247", "#515950", "#594b4a"] as const;

/** The combination handed out last — the no-immediate-repeat guard. */
let lastWipeCombo: string | null = null;

/**
 * A fresh harmonious wipe combination for THIS open: THREE DISTINCT
 * colors from the current theme's approved palette, in a random order.
 * Never the immediately previous combination. No invented colors, no
 * random RGB — only approved palette values.
 */
export function nextWipeCombo(): string[] {
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
