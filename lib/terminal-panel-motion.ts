"use client";

import { gsap } from "@/lib/motion";
import { CustomEase } from "gsap/CustomEase";

/* ==================================================================
   PHASE 1 — TERMINAL SIDE-PANEL MOTION (shared vocabulary)
   ==================================================================
   One interaction, two movers:

     • the TERMINAL — one solid panel that slides in from the right edge
       (xPercent 100 -> 0) and back out again (xPercent 0 -> 100);
     • the WEBSITE composition — a subtle horizontal translation that
       reads as "the panel is physically taking space on the right".

   Both movers read their duration and ease from this module and start
   in the same React commit, so they behave as a single mechanism:
   no stagger, no offsets, no waiting for one another.

   Deliberately NOT here: palette sheets, colour wipes, content reveals,
   opacity, scale, rotation, bounce. Those belong to later phases.
   ================================================================== */

/** Registered name of the shared slide ease. */
export const PANEL_EASE_NAME = "vs-panel-slide";

/**
 * The one duration both movers use, open and close. Long enough to read
 * as a physical sheet, short enough to feel responsive.
 */
export const PANEL_SLIDE_DURATION = 0.7;

/**
 * The terminal's closed resting position, expressed as a percentage of
 * its own width: 100 puts the panel exactly one full panel-width to the
 * right of its final position, i.e. flush off the right edge.
 */
export const PANEL_CLOSED_X_PERCENT = 100;

let panelEaseRegistered = false;

/**
 * Registers (once) and returns the shared slide ease.
 *
 * cubic-bezier(0.22, 1, 0.36, 1) — a strong, smooth deceleration: it
 * leaves fast, sheds speed progressively and settles without overshoot
 * or bounce.
 */
export function ensurePanelEase(): string {
  if (!panelEaseRegistered) {
    CustomEase.create(PANEL_EASE_NAME, "0.22, 1, 0.36, 1");
    panelEaseRegistered = true;
  }
  return PANEL_EASE_NAME;
}

/* ------------------------------------------------------------------
   WEBSITE SHIFT
   ------------------------------------------------------------------
   Measured from the terminal's real rendered width rather than a hard
   coded number, so the movement stays proportional to the panel that is
   actually on screen at the current breakpoint.

   Scope: the shift only happens where the terminal reads as a right
   hand column. Below 768px the terminal is a small floating sheet over
   a narrow layout, so the composition stays put — sliding a phone
   layout sideways would only clip it.
   ------------------------------------------------------------------ */

/** The breakpoint branch where the terminal is a true right-hand column. */
const PANEL_COLUMN_QUERY =
  "(min-width: 1100px) and (hover: hover) and (pointer: fine) and (not (any-pointer: coarse))";

/** Shift as a fraction of the panel width. */
const SHIFT_RATIO_DESKTOP = 0.4;
const SHIFT_RATIO_TABLET = 0.18;

/** Hard ceiling so the "slight" movement can never become a push. */
const SHIFT_MAX = 150;

/** The id of the terminal layer, whose box gives us the real panel width. */
const PANEL_LAYER_ID = "vs-command-terminal";

/**
 * Horizontal offset, in px, the website composition sits at while the
 * terminal is open. Always negative (leftwards); 0 when closed or when
 * the current viewport has no room for the movement.
 */
export function websiteShiftX(): number {
  if (typeof window === "undefined") return 0;
  if (!window.matchMedia("(min-width: 768px)").matches) return 0;

  const layer = document.getElementById(PANEL_LAYER_ID);
  const width = layer?.getBoundingClientRect().width ?? 0;
  if (!width) return 0;

  const isColumn = window.matchMedia(PANEL_COLUMN_QUERY).matches;
  const shift = width * (isColumn ? SHIFT_RATIO_DESKTOP : SHIFT_RATIO_TABLET);
  return -Math.round(Math.min(shift, SHIFT_MAX));
}

/* ------------------------------------------------------------------
   APPLYING THE SHIFT
   ------------------------------------------------------------------
   Two targets, one timeline, identical duration and ease:

     • the website composition takes a plain transform (composited, no
       style recalculation across the page);
     • the fixed header carries the same offset on --shell-slide-x, which
       it already composes into its own transform — so the shell reads as
       one object while the header keeps its independent --header-y
       scroll behaviour.

   Horizontal only: no scale, rotation, vertical offset or layout change.
   ------------------------------------------------------------------ */

export interface ShellShiftTargets {
  website: HTMLElement | null;
  header: HTMLElement | null;
}

/** Snaps the shell to `shift` with no animation. */
export function setShellShift({ website, header }: ShellShiftTargets, shift: number): void {
  if (website) gsap.set(website, { x: shift });
  if (header) gsap.set(header, { "--shell-slide-x": `${shift}px` });
}

/** Animates the shell to `shift` on the shared panel ease. */
export function tweenShellShift(
  { website, header }: ShellShiftTargets,
  shift: number,
  duration: number,
  ease: string,
): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (website) tl.to(website, { x: shift, duration, ease }, 0);
  if (header) tl.to(header, { "--shell-slide-x": `${shift}px`, duration, ease }, 0);
  return tl;
}
