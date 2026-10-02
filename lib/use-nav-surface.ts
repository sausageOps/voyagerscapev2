"use client";

import { useEffect, type RefObject } from "react";

/**
 * Context-aware navigation surface.
 *
 * Sections declare themselves with `data-nav-surface="dark"`; everything else
 * counts as light. While any dark section sits underneath the fixed header,
 * this hook publishes `data-nav-surface="dark"` on <html>, and the header's
 * primary navigation pills swap to their light treatment (see
 * NavMenu.module.css). When the last dark section leaves the header's band,
 * the attribute returns to "light" and the pills go back to the dark
 * treatment.
 *
 * Detection is geometric, not per-frame: one IntersectionObserver whose root
 * is the viewport clipped down to the header's own footprint (negative
 * bottom rootMargin), so a section counts only while it actually occupies
 * the strip the pills float over. No pixel sampling, no scroll listeners.
 * A MutationObserver (structure only — never attributes/styles) re-arms the
 * intersection observer when sections mount or unmount (route transitions,
 * lazy content), and a debounced resize keeps the band height current
 * (the header is shorter on mobile).
 */

/** The opt-in marker carried by sections with a dark background. */
const DARK_SECTIONS = '[data-nav-surface="dark"]';

/** Fallback band height if the header cannot be measured yet. */
const DEFAULT_BAND = 96;

export function useNavSurface(headerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.navSurface = "light";

    let observer: IntersectionObserver | null = null;
    let mutations: MutationObserver | null = null;
    let resizeTimer = 0;
    let mutationTimer = 0;
    const intersecting = new Set<Element>();

    /* The pills float inside the header's own footprint, so that rectangle
       is the detection band. The small buffer catches sections that begin
       right at the header's lower edge. */
    const bandHeight = () => {
      const header = headerRef.current;
      if (!header || typeof header.getBoundingClientRect !== "function") {
        return DEFAULT_BAND;
      }
      return Math.ceil(header.getBoundingClientRect().height) + 8;
    };

    const publish = () => {
      root.dataset.navSurface = intersecting.size > 0 ? "dark" : "light";
    };

    const observe = () => {
      observer?.disconnect();
      intersecting.clear();

      const sections = Array.from(document.querySelectorAll(DARK_SECTIONS));
      if (!sections.length) {
        publish();
        return;
      }

      /* Clip the viewport root to the header's band: everything below the
         band is subtracted, so a section intersects only while it is
         genuinely underneath the navigation. */
      const clip = Math.max(0, window.innerHeight - bandHeight());
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) intersecting.add(entry.target);
            else intersecting.delete(entry.target);
          }
          publish();
        },
        { rootMargin: `0px 0px -${clip}px 0px` },
      );
      sections.forEach((section) => observer?.observe(section));
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(observe, 200);
    };

    /* Route transitions and lazy content change the set of sections under
       the header; re-arm on structural DOM changes only. */
    const onMutate = () => {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(observe, 120);
    };

    observe();
    mutations = new MutationObserver(onMutate);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", onResize);

    return () => {
      observer?.disconnect();
      mutations?.disconnect();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(mutationTimer);
      window.removeEventListener("resize", onResize);
      delete root.dataset.navSurface;
    };
  }, [headerRef]);
}
