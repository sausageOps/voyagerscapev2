"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { CustomEase } from "gsap/CustomEase";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { nextWipeCombo } from "@/lib/wipe-palette";
import type { PanelContent } from "./TosSideSurface";

/**
 * TOS SURFACE REVEAL — the palette sheets and the content emergence.
 * ================================================================
 *
 * The choreography the page plays once it has entered, whatever content it
 * is showing:
 *
 *   base surface  →  sheet 1  →  sheet 2  →  sheet 3  →  content emerges  →  settle
 *
 * The sheets are the page's three palette panels — the menu brings its own
 * (exactly as it always has, `NavSurface`), and the window renders the same
 * three for the terminal (`TosTerminalWindow`); there are never more than
 * three on screen. The wipe is the production Osmo ease, and the emergence
 * reuses the production reveal values — so the open reads as the same piece
 * of machinery as the menu opening, with a page-entry beat in front of it
 * and a clearing beat behind it:
 *
 *   • PAGE ENTRY — the composition is already sliding the whole page in
 *     (620ms, AppShell.module.css). The sheets wait 0.24s so the page is
 *     visibly arriving before the first sheet sweeps.
 *   • SHEETS — full-surface, sequential, xPercent 101 → 0, on the Osmo ease
 *     (0.65, 0.01, 0.05, 0.99), 0.42s each, 0.075s apart. Each sheet lands
 *     over the previous one, so the surface reads as three sheets of paper
 *     being laid down.
 *   • CONTENT — the real content (the menu: nav unit, destination rows with
 *     their rolling words, contact footer; or the terminal: title, prompt,
 *     transcript, command chips and foot) emerges ABOVE the final sheet: the
 *     content layer sits above the sheet stack, so its rows rise and settle
 *     on top of it, at the exact values the production menu and the
 *     production terminal use.
 *   • SETTLE — the third sheet STAYS. It is the surface the menu lives on,
 *     not a layer to be taken away. Nothing below it is ever exposed.
 *
 * THE SHEETS STAY — this is the terminal's own lifecycle, as its overlay
 * shell always ran it: the three sheets sweep in and are
 * never hidden while the surface is open; the content layer (`z-index: 1`)
 * reveals above them, and the sheets return to their CSS resting state
 * (`background: none; opacity: 0`) only in `cleanupClosed` — on CLOSE, once
 * the whole layer has already travelled off-screen. Turning them off any
 * earlier is what exposed the TOS card's plain base surface between the
 * palette sequence and the menu; nothing here clears them on open.
 *
 * THE COLOURS COME FROM THE PRODUCTION SELECTOR. `nextWipeCombo()`
 * (`lib/wipe-palette.ts`) is the terminal's own palette-selection logic,
 * shared rather than copied: it reads the current theme, draws THREE
 * DISTINCT colours from that theme's approved pool (#f3f0e8 … for Day,
 * #5a564e … for Night), shuffles their order, and refuses to hand out the
 * same combination twice in a row. Each open therefore lays down its own
 * combination, exactly as the production terminal's does — and because the
 * guard lives in that shared module, the terminal and the TOS page can never
 * repeat each other's combination either. The selection is made once per
 * open, matching the terminal (which also does not re-pick while open).
 *
 * Nothing here touches layout: transform and opacity only, on absolutely
 * positioned sheets and in-flow content inside the window card, so the
 * document's height and scrolling are untouched.
 */

const EASE_NAME = "vs-tos-surface-wipe";
let easeRegistered = false;

function ensureEase(): string {
  if (!easeRegistered) {
    CustomEase.create(EASE_NAME, "0.65, 0.01, 0.05, 0.99");
    easeRegistered = true;
  }
  return EASE_NAME;
}

/* ---- The score, in seconds ------------------------------------------- */
const PAGE_ENTRY = 0.24; // the composition slide is under way
const SHEET_DURATION = 0.42;
const SHEET_STAGGER = 0.075;
const SHEET_END = PAGE_ENTRY + SHEET_DURATION + SHEET_STAGGER * 2; // 0.81 — the last sheet has settled
const BLOCK_AT = PAGE_ENTRY + 0.12; // the window's top row (nav unit + Close)
const BLOCK_DURATION = 0.12;
const NAV_DURATION = 0.16;
const NAV_STAGGER = 0.02;
const FOOTER_AT = SHEET_END + 0.03;
const FOOTER_DURATION = 0.12;
const FOOTER_STAGGER = 0.03;
/* No clear step: the third sheet is the surface the menu settles on. */

/** The composition's slide, plus a beat, before the surface resets. */
const SLIDE_SECONDS = 0.66;

interface Score {
  sheets: Element[];
  blocks: Element[];
  navRows: Element[];
  footerRows: Element[];
}

/**
 * Read whichever content the page is currently showing. The menu and the
 * terminal name their parts with their own attributes — the menu's are part
 * of the locked ROUTES implementation, the terminal's are the production
 * terminal's own — so the score simply accepts both vocabularies. There is
 * still ONE reveal: the sheets, the easing and every timing below are shared
 * by both contents, and the page is only ever showing one of them.
 */
function readScore(scope: HTMLElement): Score | null {
  const sheets = Array.from(
    scope.querySelectorAll("[data-menu-palette-panel], [data-tos-palette-panel]"),
  );
  const blocks = Array.from(scope.querySelectorAll("[data-menu-block], [data-term-item]"));
  const navRows = Array.from(
    scope.querySelectorAll("[data-menu-nav-row], [data-term-row]"),
  );
  const footerRows = Array.from(scope.querySelectorAll("[data-menu-footer-row]"));
  if (sheets.length !== 3 || blocks.length === 0) return null;
  return { sheets, blocks, navRows, footerRows };
}

/**
 * Drives the reveal for `scope` (the TOS page) whenever the page opens — and
 * whenever its content changes while it is open, so a swap from the menu to
 * the terminal (or back) replays the same reveal over the new content instead
 * of exposing the bare base surface.
 */
export function useTosReveal(
  scopeRef: RefObject<HTMLElement | null>,
  open: boolean,
  content: PanelContent,
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const score = readScore(scope);
    if (!score) return undefined;

    const { sheets, blocks, navRows, footerRows } = score;
    const all = [...sheets, ...blocks, ...navRows, ...footerRows];
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    /* A content swap happens on a page that has already arrived, so the
       sheets start at once; a fresh open keeps the entry beat that lets the
       composition's slide read first. */
    const entry = wasOpen && open ? 0 : PAGE_ENTRY;

    /* Rapid toggles must never stack timelines. */
    timelineRef.current?.kill();

    const reset = () => {
      gsap.set(all, { clearProps: "all" });
    };

    if (!open) {
      /* Closing is the composition's job (it slides the whole page back), and
         the sheets are never cleared on screen — they are the surface while
         open. This is the production terminal's `cleanupClosed`, which also
         runs only after its layer has left the viewport: once the page is out
         of view, the surface returns to its resting state (background: none,
         opacity: 0) so the next open replays from the top. */
      if (!wasOpen) return undefined;
      const tl = gsap.timeline();
      timelineRef.current = tl;
      tl.to({}, { duration: SLIDE_SECONDS }).call(reset);
      return () => {
        timelineRef.current?.kill();
      };
    }

    const ease = ensureEase();
    /* Palette 1 → 2 → 3, drawn fresh for this open by the production
       selector: three distinct approved colours for the current theme, in a
       random order, never the previous open's combination. */
    const combo = nextWipeCombo();
    sheets.forEach((sheet, index) => {
      (sheet as HTMLElement).style.background = combo[index];
    });

    if (prefersReducedMotion()) {
      /* The production terminal's reduced-motion path, mirrored: it clears
         the sheets (`cleanupContent`) and shows the surface at once rather
         than sweeping anything. No palette sequence, no rise. */
      reset();
      gsap.set(sheets, { autoAlpha: 0 });
      return () => {
        timelineRef.current?.kill();
      };
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;
    tl.set(sheets, { autoAlpha: 1, xPercent: 101 }, 0)
      /* 1–3. Three full-surface sheets, laid down one after another. */
      .to(
        sheets,
        { xPercent: 0, duration: SHEET_DURATION, stagger: SHEET_STAGGER, ease },
        entry,
      )
      /* The window's own top row arrives as the page settles. */
      .fromTo(
        blocks,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: BLOCK_DURATION, ease },
        entry + (BLOCK_AT - PAGE_ENTRY),
      )
      /* 4. The menu emerges above the final sheet. */
      .fromTo(
        navRows,
        { autoAlpha: 0, yPercent: 100, rotate: 5 },
        {
          autoAlpha: 1,
          yPercent: 0,
          rotate: 0,
          duration: NAV_DURATION,
          stagger: NAV_STAGGER,
          ease,
        },
        entry + (SHEET_END - PAGE_ENTRY),
      )
      .fromTo(
        footerRows,
        { autoAlpha: 0, y: 14, rotate: 1.2 },
        {
          autoAlpha: 1,
          y: 0,
          rotate: 0,
          duration: FOOTER_DURATION,
          stagger: FOOTER_STAGGER,
          ease,
        },
        entry + (FOOTER_AT - PAGE_ENTRY),
      );
    /* Whatever is done here, the sheets are NOT cleared: the last one is the
       surface the menu sits on, exactly as in the production terminal, and
       they are reset on close (below) once the page is out of view. */

    return () => {
      timelineRef.current?.kill();
    };
  }, [open, content, scopeRef]);
}
