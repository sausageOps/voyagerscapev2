"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { useUI } from "@/lib/ui-store";
import TileCurtain from "./TileCurtain";
import { nextTransitionVariant, variantById } from "./RouteTransitionVariants";
import variantStyles from "./RouteTransitionVariants.module.css";
import styles from "./RouteTransition.module.css";

/**
 * GLOBAL PAGE TRANSITION SYSTEM — VERTICAL TILE CURTAIN
 * =====================================================
 *
 * One route-agnostic transition layer mounted once in AppShell:
 *
 *   <RouteTransitionProvider>        ← state machine, nav interception, layer
 *     …all chrome + pages…
 *     <RouteTransition>              ← content stage (subtle in/out motion)
 *       <main>{children}</main>
 *     </RouteTransition>
 *     <CommandTerminal />            ← uses useRouteTransition().navigate()
 *   </RouteTransitionProvider>
 *
 * The transition is the same Vertical Tiles language as the startup
 * loader: a curtain of cream tiles (TileCurtain, var(--vs-bg)) sweeps
 * down over the current page from the top, staggered CENTER-OUT (middle
 * tiles first, outer tiles following), the destination PAGE NAME
 * (Pixelify Sans, title case, nothing else — ink on the cream) settles
 * in the middle while the route commits underneath, then the same tiles
 * continue downward off the screen to reveal the new page — one
 * continuous top-to-bottom flow. The startup PageLoader is a separate
 * system and is untouched apart from sharing the TileCurtain primitive
 * and the scroll lock.
 *
 * The same controller serves desktop nav, the mobile menu and any future
 * surface: mobile-menu taps are vetted by the same capture handler, the
 * layer stacks above the menu overlay (104 > 100), and an open menu is
 * asked to close the moment a transition begins — so menu close and the
 * tile sweep read as one continuous navigation on a phone.
 *
 * How internal navigation is detected (unchanged architecture):
 *   • Link / anchor clicks — one capture-phase listener on `document` vets
 *     every <a href>: internal & same-tab & unmodified primary click →
 *     orchestrated dissolve; external targets, downloads, mailto/tel,
 *     hash-only and same-page links are left completely untouched. No Link
 *     rewrites — every future internal route inherits the behavior.
 *   • Programmatic navigation — `useRouteTransition().navigate(href)`
 *     (used by the command terminal; available to all future pages).
 *     Un-orchestrated router.push() commits still get a subtle content fade.
 *   • Browser back / forward — `popstate` arms the same dissolve for the
 *     URL the browser moved to. History is never patched → no loops.
 *
 * Race safety: a single state machine (idle → covering → covered →
 * revealing → idle). While non-idle, further navigations are ignored and
 * the layer swallows pointer events, so double-clicks can't double-fire
 * and layers can never stack. Scrolling is locked while non-idle
 * (ref-counted body lock, shared with the startup loader) and restored
 * the moment the machine returns to idle — including every failsafe path.
 *
 * Opt-out per link: `data-transition="off"`.
 */

type Phase = "idle" | "covering" | "covered" | "revealing";
type NavKind = "push" | "pop";

interface PendingNav {
  href: string;
  kind: NavKind;
}

interface RouteTransitionContextValue {
  /** Orchestrated navigation: dissolve closed → route change → dissolve open. */
  navigate: (href: string) => void;
  /** True while any transition phase is active. */
  transitioning: boolean;
  /** Current state-machine phase (used by the content stage). */
  phase: Phase;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export function useRouteTransition(): RouteTransitionContextValue {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) throw new Error("useRouteTransition must be used inside <RouteTransitionProvider>");
  return ctx;
}

/* ---- Timing budget ----------------------------------------------------
   Cover: tiles drop in from the top, center-out (~0.5s to full coverage).
   Reveal: the same tiles continue downward off screen (~0.8s). End to end
   ≈ 1.3s on desktop — the cinematic Vertical Tiles language the brief
   asks for, faster on mobile where the tile count (and so the stagger
   tail) is small. */
/** Reveal never begins before this — the name's brief on-screen window. */
const REVEAL_NOT_BEFORE_MS = 460;
/** Failsafe: never sit in a transition if a commit never arrives. The
    tile curtain covers more slowly than the old mask wipe did, so the
    commit window is nudged up with it. */
const COVERED_TIMEOUT_MS = 2000;
/** Extra hold for one re-issued push before the curtain gives up. */
const COVERED_RETRY_WINDOW_MS = 1500;

/* ---- Tile motion (per tile; the stagger is center-out) ---- */
const TILE_COVER_DURATION = 0.28;
const TILE_COVER_STAGGER = 0.024;
const TILE_REVEAL_DURATION = 0.5;
const TILE_REVEAL_STAGGER = 0.034;

/** Scroll-lock key for this system (ref-counted in lib/scroll-lock). */
const SCROLL_LOCK_KEY = "route-transition";

/** Full-coverage moment for a curtain of `count` tiles (center-out). */
function coverEndFor(count: number): number {
  /* Outermost tile delay = its distance from the center × stagger. */
  return TILE_COVER_DURATION + Math.ceil((count - 1) / 2) * TILE_COVER_STAGGER;
}

/** Pathname of a (possibly relative) href, for same-page comparisons. */
function toPathname(href: string): string {
  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return href.split(/[?#]/)[0] || "/";
  }
}

/** Normal title case for display: "ART" → "Art", "isle of skye" → "Isle Of Skye". */
function toTitleCase(text: string): string {
  return text.toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, ch: string) => sp + ch.toUpperCase());
}

/**
 * Destination page name — from the shared ROUTES registry first (the same
 * registry the nav uses, so future pages listed there get their display
 * label automatically), otherwise a humanized pathname fallback. Always
 * normal title case, only ever the main page name — no numbers, no
 * status text.
 */
function resolveDestinationName(href: string): string {
  const path = toPathname(href);
  const hit = ROUTES.find((r) => r.href === path || (r.match?.includes(path) ?? false));
  if (hit) return toTitleCase(hit.label);

  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return "Home";
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    /* keep raw segment */
  }
  const human = decoded.replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  return human ? toTitleCase(human) : "Page";
}

/** Vets an event target for an internal, orchestratable href (pure — no
 *  side effects). Returns null for anything that must stay native. */
function resolveInternalHref(target: EventTarget | null, currentPath: string): string | null {
  const anchor = (target as Element | null)?.closest?.("a[href]");
  if (!anchor) return null;
  const a = anchor as HTMLAnchorElement;
  if (a.dataset.transition === "off") return null; // explicit opt-out
  if (a.target && a.target !== "_self") return null; // new tab/window
  if (a.hasAttribute("download")) return null; // file download
  if (a.getAttribute("aria-disabled") === "true") return null;
  const raw = a.getAttribute("href") ?? "";
  if (raw.startsWith("#")) return null; // same-page anchor
  let url: URL;
  try {
    url = new URL(a.href, window.location.href);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null; // mailto:, tel:…
  if (url.origin !== window.location.origin) return null; // external
  if (url.pathname === currentPath) return null; // same page (anchor/query)
  return url.pathname + url.search + url.hash;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen } = useUI();

  const [phase, setPhase] = useState<Phase>("idle");
  const [destName, setDestName] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  /* Codrops-inspired variant for THIS transition (see
     RouteTransitionVariants.tsx). null → the existing Vertical Tiles
     curtain, which stays the fallback/safety transition. The rotation
     cursor lives at module scope in the registry, so the index
     persists across mounts: nav #1 → ivory curtain, #2 → lavender
     clip, #3 → parchment sweep, #4 → sage split, #5 → blush band,
     #6 → ivory again. Never random, never reset by a remount. */
  const [variantId, setVariantId] = useState<string | null>(null);

  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  const phaseRef = useRef<Phase>(phase);
  const pendingRef = useRef<PendingNav | null>(null);
  /** Variant driving the in-flight transition (set together with phase). */
  const variantRef = useRef<ReturnType<typeof variantById>>(null);
  /** True when a variant threw and the plain shield took over — the
      reveal then fades the shield out instead of animating panels. */
  const emergencyRef = useRef(false);
  /** True once the covered watchdog has re-issued a dropped push. */
  const pushRetriedRef = useRef(false);
  const coverStartedAtRef = useRef(0);
  const mobileMenuOpenRef = useRef(mobileMenuOpen);
  mobileMenuOpenRef.current = mobileMenuOpen;
  const setMobileMenuOpenRef = useRef(setMobileMenuOpen);
  setMobileMenuOpenRef.current = setMobileMenuOpen;

  const layerRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLSpanElement | null>(null);

  /** Sets state and keeps the synchronous ref in step (guards read it). */
  const setPhaseBoth = useCallback((value: Phase | ((prev: Phase) => Phase)) => {
    const next = typeof value === "function" ? (value as (p: Phase) => Phase)(phaseRef.current) : value;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /** Open a transition toward a destination. */
  const begin = useCallback(
    (href: string, kind: NavKind) => {
      coverStartedAtRef.current = performance.now();
      pushRetriedRef.current = false;
      pendingRef.current = { href, kind };
      // Warm the payload NOW — the commit at full coverage (~180ms) then
      // lands with the page ready instead of starting the fetch cold.
      try {
        routerRef.current.prefetch(href);
      } catch {
        /* best-effort; plain navigation still works without it */
      }
      setDestName(resolveDestinationName(href));
      setReduced(prefersReducedMotion());
      // If the mobile menu is open, its own close animation starts NOW —
      // alongside the tile sweep — instead of only after the commit.
      if (mobileMenuOpenRef.current) setMobileMenuOpenRef.current(false);
      // Pick this transition's variant ONLY when a transition actually
      // starts (idle → covering). Navigations that arrive while already
      // transitioning are absorbed by the in-flight one, so the rotation
      // cursor advances exactly once per visible transition — the
      // deterministic 0 → 1 → 2 → 3 → 4 → 0 sequence across the session.
      if (phaseRef.current === "idle") {
        const variant = nextTransitionVariant();
        variantRef.current = variant;
        emergencyRef.current = false;
        setVariantId(variant.id);
        setPhaseBoth("covering");
      }
    },
    [setPhaseBoth],
  );

  /** Public orchestrated navigation (interception layer + future pages). */
  const navigate = useCallback(
    (href: string) => {
      if (phaseRef.current !== "idle") return; // one transition at a time
      if (toPathname(href) === pathnameRef.current) return; // same page
      begin(href, "push");
    },
    [begin],
  );

  /* ------------------------------------------------------------------
     1) LINK-CLICK INTERCEPTION — vets every anchor, replaces nothing.
     ------------------------------------------------------------------ */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return; // primary button only
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = resolveInternalHref(event.target, pathnameRef.current);
      if (!href) return;

      // Ours: stop the native/Next click handling and orchestrate instead.
      event.preventDefault();
      event.stopPropagation();
      if (phaseRef.current !== "idle") return; // rapid double-click — first nav wins
      begin(href, "push");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin]);

  /* ------------------------------------------------------------------
     1b) INTENT PREFETCH — the route payload starts fetching the moment
     the user hovers / focuses an internal link (best-effort), so the
     commit at full coverage lands with the page already warm. This is
     what removes the covered-state dead time on slow fetches.
     ------------------------------------------------------------------ */
  useEffect(() => {
    const onIntent = (event: Event) => {
      const href = resolveInternalHref(event.target, pathnameRef.current);
      if (!href) return;
      try {
        routerRef.current.prefetch(href);
      } catch {
        /* prefetch is best-effort; the click path works without it */
      }
    };
    document.addEventListener("pointerover", onIntent, true);
    document.addEventListener("focusin", onIntent, true);
    return () => {
      document.removeEventListener("pointerover", onIntent, true);
      document.removeEventListener("focusin", onIntent, true);
    };
  }, []);

  /* ------------------------------------------------------------------
     2) BROWSER BACK / FORWARD — the same mask wipe for the popped URL.
     History itself is never touched (no patch → no loops).
     ------------------------------------------------------------------ */
  useEffect(() => {
    const onPopState = () => {
      const target = window.location.pathname;
      if (target === pathnameRef.current) return; // hash-only pop
      begin(target + window.location.search + window.location.hash, "pop");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [begin]);

  /* ------------------------------------------------------------------
     3) ROUTE-COMMIT WATCHER — the pathname changing completes a pending
     transition. The reveal begins at first opportunity after the commit,
     but never before the name's brief window has elapsed.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (pathname === pathnameRef.current) return;
    pathnameRef.current = pathname;
    const pending = pendingRef.current;
    if (!pending) return; // un-orchestrated commit → stage fades subtly
    pendingRef.current = null;

    const elapsed = performance.now() - coverStartedAtRef.current;
    const remaining = prefersReducedMotion()
      ? 60
      : Math.max(20, REVEAL_NOT_BEFORE_MS - elapsed);
    const timer = window.setTimeout(() => {
      setPhaseBoth((p) => (p === "covering" || p === "covered" ? "revealing" : p));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [pathname, setPhaseBoth]);

  /** Push the route once the field has closed (push navigations only). */
  const commitPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (pending.kind === "push") {
      try {
        routerRef.current.push(pending.href);
      } catch (e) {
        pendingRef.current = null;
        setPhaseBoth("revealing");
        return;
      }
    }
    setPhaseBoth((p) => (p === "covering" ? "covered" : p));
  }, [setPhaseBoth]);

  /* ------------------------------------------------------------------
     4) COVERED CONTINUITY — while the commit lands, never freeze the
     curtain timeline mid-air (the phase switch kills it). Hold the tiles
     at full coverage cleanly; the reveal fires the moment the pathname
     actually commits — no animation deadline, no arbitrary wait.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "covered") return;
    const root = layerRef.current;
    if (!root || prefersReducedMotion()) return;
    const tiles = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-tile]"));
    const name = nameRef.current;
    const chars = name
      ? gsap.utils.toArray<HTMLElement>(name.querySelectorAll("[data-char]"))
      : [];
    if (tiles.length > 0) {
      gsap.to(tiles, { yPercent: 0, duration: 0.05, ease: "power1.out", overwrite: "auto" });
    }
    if (chars.length > 0) {
      gsap.to(chars, {
        yPercent: 0,
        duration: 0.1,
        ease: "power3.out",
        stagger: 0.008,
        overwrite: "auto",
      });
    }

    /* Variant overlays hold their own covered state (idempotent set —
       the same re-assertion the tiles get above). */
    const variant = variantRef.current;
    if (variant && !emergencyRef.current) {
      try {
        variant.hold(root);
      } catch {
        /* the reveal's own fallback (root fade) still completes the
           transition safely */
      }
    }
  }, [phase]);

  /* ------------------------------------------------------------------
     4b) WALL-CLOCK WATCHDOG — GSAP advances on requestAnimationFrame,
     which a frozen frame pipeline (background tab, occluded window)
     can stop entirely. Every phase therefore has a hard wall-clock
     deadline after which the state machine advances WITHOUT the
     animation: covering commits whatever is pending and reveals,
     covered reveals, revealing returns to idle. A transition can stall
     visually in that degenerate case, but it can never hang.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase === "idle") return undefined;

    if (phase === "covering") {
      // The cover never completed (frozen frame pipeline): commit now.
      const timer = window.setTimeout(() => {
        if (phaseRef.current !== "covering") return;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending?.kind === "push") {
          try {
            routerRef.current.push(pending.href);
          } catch {
            /* fall through to the reveal */
          }
        }
        setPhaseBoth("revealing");
      }, COVERED_TIMEOUT_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === "covered") {
      // The commit hasn't landed. Next's app router can silently drop a
      // push that races its prefetch, so the first deadline RE-ISSUES the
      // push once (idempotent if the original lands late) and holds the
      // curtain a little longer; the second deadline reveals regardless.
      const retryTimer = window.setTimeout(() => {
        if (phaseRef.current !== "covered") return;
        const pending = pendingRef.current;
        if (pending?.kind === "push" && !pushRetriedRef.current) {
          pushRetriedRef.current = true;
          try {
            routerRef.current.push(pending.href);
          } catch {
            /* the final deadline below still reveals */
          }
          return; // stay covered — the retry gets its own window
        }
        pendingRef.current = null;
        setPhaseBoth("revealing");
      }, COVERED_TIMEOUT_MS);
      const finalTimer = window.setTimeout(() => {
        if (phaseRef.current !== "covered") return;
        pendingRef.current = null;
        setPhaseBoth("revealing");
      }, COVERED_TIMEOUT_MS + COVERED_RETRY_WINDOW_MS);
      return () => {
        window.clearTimeout(retryTimer);
        window.clearTimeout(finalTimer);
      };
    }

    // revealing: never hang on a frozen reveal animation.
    const timer = window.setTimeout(() => {
      if (phaseRef.current === "revealing") setPhaseBoth("idle");
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [phase, setPhaseBoth]);

  /* ------------------------------------------------------------------
     5) COVER — the tile curtain drops in from the top, CENTER-OUT
     (middle tiles first, outer tiles following); the name settles as
     it closes; the route commits at full coverage.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "covering") return;
    const root = layerRef.current;
    if (!root) return;

    // Reduced motion: shield only, near-immediate navigation.
    if (prefersReducedMotion()) {
      const tl = gsap.timeline();
      tl.set(root, { autoAlpha: 1 });
      tl.call(commitPending, [], 0.03);
      return () => {
        tl.kill();
      };
    }

    const tiles = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-tile]"));
    const name = nameRef.current;
    const chars = name
      ? gsap.utils.toArray<HTMLElement>(name.querySelectorAll("[data-char]"))
      : [];

    /* ---- Codrops-inspired variant path ----
       The registry supplies the overlay's cover timeline; the commit is
       scheduled at the variant's own full-coverage moment and the
       destination name rises through the same masked-char treatment the
       tile curtain uses, so every variant reads as one Voyagerscape
       motion language. Any throw falls through to the safety shield
       below — navigation itself can never break. */
    const variant = variantRef.current;
    if (variant && !emergencyRef.current) {
      try {
        const tl = variant.cover(root);
        gsap.set(root, { autoAlpha: 1 });
        if (name) gsap.set(name, { autoAlpha: 1, y: 0 });
        if (chars.length > 0) gsap.set(chars, { yPercent: 110 });
        tl.call(commitPending, [], Math.max(0, variant.commitAt - 0.005));
        if (chars.length > 0) {
          const gap = Math.min(0.014, 0.08 / chars.length);
          tl.to(
            chars,
            { yPercent: 0, duration: 0.13, ease: "power3.out", stagger: gap },
            Math.max(0, variant.commitAt - 0.12),
          );
        }
        return () => {
          tl.kill();
        };
      } catch (err) {
        console.error(
          `[RouteTransition] variant "${variant.id}" could not run; falling back to the safety shield.`,
          err,
        );
        emergencyRef.current = true;
        // fall through to the shield below
      }
    }

    /* ---- Safety shield (variant failure path): solid cover,
       near-immediate commit, fade reveal on the other side. ---- */
    if (emergencyRef.current) {
      gsap.set(root, { autoAlpha: 1, background: "var(--vs-bg)" });
      const stuckPanels = root.querySelectorAll("[data-panel]");
      if (stuckPanels.length > 0) gsap.set(stuckPanels, { autoAlpha: 0 });
      if (name) gsap.set(name, { autoAlpha: 1, y: 0 });
      if (chars.length > 0) gsap.set(chars, { yPercent: 0 });
      const tl = gsap.timeline();
      tl.call(commitPending, [], 0.03);
      return () => {
        tl.kill();
      };
    }

    /* ---- Existing Vertical Tiles fallback (unchanged) ---- */
    if (tiles.length === 0) return;

    gsap.set(root, { autoAlpha: 1 });
    gsap.set(tiles, { yPercent: -100 });
    if (name) gsap.set(name, { autoAlpha: 1, y: 0 });
    if (chars.length > 0) gsap.set(chars, { yPercent: 110 });

    const coverEnd = coverEndFor(tiles.length);

    const tl = gsap.timeline();
    // 1. The curtain arrives: tiles drop in from above, staggered from
    //    the center outward — transform-only, sine.inOut (the Animata
    //    ease), no springs, no scale.
    tl.to(tiles, {
      yPercent: 0,
      duration: TILE_COVER_DURATION,
      ease: "sine.inOut",
      stagger: { each: TILE_COVER_STAGGER, from: "center" },
    });
    // 2. Full coverage → the route commits underneath the closed curtain.
    tl.call(commitPending, [], Math.max(0, coverEnd - 0.005));
    // 3. The destination name rises in, character by character, through a
    //    masked reveal — a beat before the curtain continues downward.
    if (chars.length > 0) {
      const gap = Math.min(0.014, 0.08 / chars.length);
      tl.to(
        chars,
        { yPercent: 0, duration: 0.13, ease: "power3.out", stagger: gap },
        Math.max(0, coverEnd - 0.12),
      );
    }

    return () => {
      tl.kill();
    };
  }, [phase, commitPending]);

  /* ------------------------------------------------------------------
     6) REVEAL — the name lifts away and the curtain continues downward,
     off the bottom of the screen, CENTER-OUT again — the same continuous
     top-to-bottom flow the startup loader exits with.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "revealing") return;
    const root = layerRef.current;
    if (!root) return;

    const tl = gsap.timeline({
      onComplete: () => setPhaseBoth("idle"),
    });

    if (prefersReducedMotion()) {
      tl.to(root, { autoAlpha: 0, duration: 0.12, ease: "power1.out" });
      return () => {
        tl.kill();
      };
    }

    const tiles = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-tile]"));
    const name = nameRef.current;

    if (name) tl.to(name, { autoAlpha: 0, y: -6, duration: 0.07, ease: "power2.in" }, 0);

    /* ---- Variant reveal: the registry appends its panel tweens to the
       shared timeline. A throw (or the emergency flag) falls back to a
       plain layer fade — the page always comes back. ---- */
    const variant = variantRef.current;
    if (variant && !emergencyRef.current) {
      try {
        variant.reveal(root, tl);
      } catch (err) {
        console.error(
          `[RouteTransition] variant "${variant.id}" reveal failed; fading the layer instead.`,
          err,
        );
        tl.to(root, { autoAlpha: 0, duration: 0.2, ease: "power1.out" }, 0.015);
      }
    } else if (emergencyRef.current) {
      tl.to(root, { autoAlpha: 0, duration: 0.25, ease: "power1.out" }, 0.015);
    } else if (tiles.length > 0) {
      tl.to(
        tiles,
        {
          yPercent: 100,
          duration: TILE_REVEAL_DURATION,
          ease: "sine.inOut",
          stagger: { each: TILE_REVEAL_STAGGER, from: "center" },
          overwrite: "auto", // a watchdog-reveal may interrupt mid-flight
        },
        0.015,
      );
    }

    return () => {
      tl.kill();
    };
  }, [phase, setPhaseBoth]);

  /* ------------------------------------------------------------------
     7) SCROLL LOCK — while any transition phase is active the page
     beneath is inert: the layer swallows pointer events (below) and the
     body is locked (ref-counted, shared with the startup loader). Every
     path back to idle — including the failsafes and unmount — releases.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "idle") lockScroll(SCROLL_LOCK_KEY);
    else unlockScroll(SCROLL_LOCK_KEY);
  }, [phase]);

  useEffect(() => () => unlockScroll(SCROLL_LOCK_KEY), []);

  const contextValue = useMemo<RouteTransitionContextValue>(
    () => ({ navigate, transitioning: phase !== "idle", phase }),
    [navigate, phase],
  );

  /* Active registry variant (null → the existing Vertical Tiles fallback). */
  const activeVariant = variantById(variantId);

  return (
    <RouteTransitionContext.Provider value={contextValue}>
      {children}
      {phase !== "idle" ? (
        <div
          ref={layerRef}
          className={styles.root}
          aria-hidden="true"
          data-transition-layer
          data-variant={activeVariant ? activeVariant.id : "tiles"}
        >
          {!reduced ? (
            activeVariant ? (
              activeVariant.render()
            ) : (
              <TileCurtain />
            )
          ) : null}
          {!reduced && destName ? (
            <span
              ref={nameRef}
              /* On pale variant surfaces the name carries its own warm-dark
                 ink (theme-independent; see RouteTransitionVariants.module.css). */
              className={
                activeVariant
                  ? `${styles.name} ${variantStyles.nameOnPale}`
                  : styles.name
              }
              data-name
            >
              {destName.split("").map((ch, i) => (
                <span key={`${destName}-${i}`} className={styles.charMask}>
                  <span data-char className={styles.char}>
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
    </RouteTransitionContext.Provider>
  );
}

/**
 * Content stage — wraps the routed <main>. A subtle dim while the field
 * closes; a soft fade as it opens (parallel to the reveal, adds no time).
 * Also preserves the original subtle fade for first mount and for routes
 * committed outside the system (direct router.push elsewhere).
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { phase } = useRouteTransition();
  const ref = useRef<HTMLDivElement | null>(null);
  const lastPathRef = useRef<string | null>(null);

  /* Orchestrated motion, driven by the provider's state machine: while
     the mask sweeps, the page drifts a couple of vw and dims a touch —
     never more than a breath — then settles as the new page reveals. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (phase === "covering") {
      gsap.killTweensOf(el);
      if (prefersReducedMotion()) return;
      gsap.to(el, {
        x: -0.022 * window.innerWidth,
        opacity: 0.85,
        duration: 0.18,
        ease: "power1.inOut",
      });
    } else if (phase === "covered") {
      if (prefersReducedMotion()) return;
      gsap.set(el, { x: -0.022 * window.innerWidth, opacity: 0.85 });
    } else if (phase === "revealing") {
      gsap.killTweensOf(el);
      if (prefersReducedMotion()) {
        gsap.set(el, { clearProps: "opacity,transform" });
        return;
      }
      gsap.fromTo(
        el,
        { x: 0.02 * window.innerWidth, opacity: 0.85 },
        {
          x: 0,
          opacity: 1,
          duration: 0.18,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    } else {
      /* idle — the DOM is ALWAYS left clean, even if a tween was
         interrupted by the phase change itself. */
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "opacity,transform" });
    }
    return () => {
      gsap.killTweensOf(el);
    };
  }, [phase]);

  /* First-mount intro + graceful fade for un-orchestrated commits. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (phase !== "idle") return; // the state machine owns this reveal
    if (prefersReducedMotion()) return;
    const tween = gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: "opacity,transform" });
    };
  }, [pathname, phase]);

  return <div ref={ref}>{children}</div>;
}
