"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/**
 * MENU CHOREOGRAPHY — the Giats menu timeline, ported onto the TOS page.
 * =====================================================================
 *
 * Ported from Giats `src/components/dom/navbar/components/MenuLinks.jsx`
 * (setupMenuAnimation) and its `menuLinks.module.scss`, MIT License,
 * Copyright (c) 2025 Evangelos Giatsidis. See THIRD_PARTY_NOTICES.md.
 *
 * Giats runs ONE paused timeline and calls `play()` on open and `reverse()`
 * on close, so an interrupted open or close simply turns around from where it
 * is. This hook keeps that model. Values are Giats' own:
 *
 *   duration 0.92s, ease expo.inOut (every tween)
 *   link rows     x: -100% → 0,  stagger 0.016
 *   the page      scale 0.9, border-radius 1.3888888889vw
 *   the layout    opacity 0.3 (0.05 on mobile)
 *
 * Mapping to Voyagerscape (where, and why, V2 differs from Giats):
 *
 *   Giats `main`            → `main#main` inside this stage (the routed page).
 *                             It is the page the composition slides, and it
 *                             is scaled and radiused as Giats' page is.
 *   Giats `#layout`         → `[data-website-shell]`, the complete website.
 *                             Dimmed only. Giats' height change is NOT ported:
 *                             it is a reflow, and the website shell is kept
 *                             byte-identical in layout while the page moves.
 *   Giats link items        → the CHILDREN of the approved rows (`> *`), not
 *                             the rows. useTosReveal already owns the rows'
 *                             autoAlpha/y/rotate and clears them, so a slide on
 *                             the rows would fight that sequence.
 *   Giats `header`          → NOT animated. The header is the live physical
 *                             navigation pill, and its ROUTES control is what
 *                             closes this menu. V2's page already covers it.
 *   Giats `#scrollbar`      → NOT animated. The Scrollbar is V2's own control.
 *   Giats `#fluidCanvas`    → NOT ported. V2 has no fluid canvas.
 *   Giats `lenis.stop()`    → `lockScroll(key, { smooth: true })`, ref-counted
 *                             under its own key, so closing the menu never
 *                             releases a lock held by the loader or a route
 *                             transition. The single Lenis engine stops with it.
 *
 * No global selector is used. Every target is found inside `scopeRef`, the
 * stage element, so the page is never touched from outside its own composition.
 *
 * Reduced motion: no tweens and no shrink. The page is shown in its final
 * state at once. The composition's own slide is already shortened by the
 * stylesheet's reduced-motion rule.
 */

const SCROLL_LOCK_KEY = "site-menu";

/* Giats' own timing and values (MenuLinks.jsx). */
const DURATION = 0.92;
const EASE = "expo.inOut";
const ITEM_STAGGER = 0.016;
const PAGE_SCALE = 0.9;
const PAGE_RADIUS = "1.3888888889vw";
const LAYOUT_DIM = 0.3;
const LAYOUT_DIM_MOBILE = 0.05;
const MOBILE_QUERY = "(max-width: 639px)";

/* The approved rows' CHILDREN. See the mapping above. */
const ITEM_SELECTOR = "[data-menu-block] > *, [data-menu-nav-row] > *, [data-menu-footer-row] > *";

interface Built {
  menu: HTMLElement;
  main: HTMLElement | null;
  items: HTMLElement[];
  timeline: gsap.core.Timeline;
}

/* The pills' own transitions, minus the 180ms transform transition: the
   approved colour, border and opacity affordances are kept while the menu is
   open (values copied from MobileMenu.module.css `.navItem`). */
const PILL_TRANSITION_OPEN =
  "background-color var(--t-fast) var(--e-out), border-color var(--t-fast) var(--e-out), color var(--t-fast) var(--e-out), opacity 200ms var(--e-out)";

/* See build(): the pills' CSS transform transition is off while GSAP drives them. */
function setPillTransitions(items: HTMLElement[], value: string) {
  items.forEach((item) => {
    item.style.transition = value;
  });
}

function build(scope: HTMLElement, menu: HTMLElement): Built {
  const main = scope.querySelector<HTMLElement>("main#main");
  const shell = scope.querySelector<HTMLElement>("[data-website-shell]");
  const items = Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  const mobile = window.matchMedia(MOBILE_QUERY).matches;

  const timeline = gsap.timeline({
    paused: true,
    defaults: { duration: DURATION, ease: EASE },
  });

  if (main) {
    timeline.to(main, { scale: PAGE_SCALE, borderRadius: PAGE_RADIUS }, 0);
  }
  if (shell) {
    timeline.to(shell, { opacity: mobile ? LAYOUT_DIM_MOBILE : LAYOUT_DIM }, 0);
  }
  if (items.length > 0) {
    /* The approved link pills carry their own CSS transform transition (a
       press/hover affordance, 180ms). Driven frame by frame by GSAP it would
       trail the timeline, so the slide runs without it, and the inline value
       is removed again once the menu has fully closed. */
    timeline.fromTo(items, { x: "-100%" }, { x: "0%", stagger: ITEM_STAGGER }, 0);
    timeline.eventCallback("onReverseComplete", () => setPillTransitions(items, ""));
  }

  return { menu, main, items, timeline };
}

function restorePage(main: HTMLElement | null) {
  if (!main) return;
  main.style.pointerEvents = "";
}

/**
 * Drives the Giats menu choreography for the TOS stage while the menu is on
 * screen (`active`), and owns the menu's scroll stop.
 */
export function useMenuChoreography(scopeRef: RefObject<HTMLElement | null>, active: boolean) {
  const builtRef = useRef<Built | null>(null);
  /* The routed page, remembered so its pointer state is restored on close and
     on unmount even when no timeline was built (reduced motion). */
  const mainRef = useRef<HTMLElement | null>(null);

  /* Scroll stop, ref-counted under its own key. Mounted-and-active only. */
  useEffect(() => {
    if (!active) return undefined;
    lockScroll(SCROLL_LOCK_KEY, { smooth: true });
    return () => unlockScroll(SCROLL_LOCK_KEY);
  }, [active]);

  /* Motion. Open plays the timeline; close reverses it. */
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    if (!active) {
      // The page takes pointer events back as the menu closes, in every mode.
      restorePage(mainRef.current ?? scope.querySelector<HTMLElement>("main#main"));
      builtRef.current?.timeline.reverse();
      return undefined;
    }

    const menu = scope.querySelector<HTMLElement>("[data-menu-surface]");
    const main = scope.querySelector<HTMLElement>("main#main");
    mainRef.current = main;
    if (main) main.style.pointerEvents = "none";
    if (!menu || prefersReducedMotion()) return undefined;

    let built = builtRef.current;
    if (!built || built.menu !== menu) {
      // A new menu node (for example after the terminal has replaced it).
      // Put the page back in its resting state before building afresh, so the
      // new timeline starts from the true natural values.
      built?.timeline.progress(0).kill();
      built = build(scope, menu);
      builtRef.current = built;
    }
    setPillTransitions(built.items, PILL_TRANSITION_OPEN);
    built.timeline.play();
    return undefined;
  }, [active, scopeRef]);

  /* Unmount: kill the timeline and return the page to its natural state. */
  useEffect(() => {
    return () => {
      const built = builtRef.current;
      builtRef.current = null;
      if (built) {
        built.timeline.progress(0).kill();
        setPillTransitions(built.items, "");
      }
      restorePage(mainRef.current);
      mainRef.current = null;
    };
  }, []);
}
