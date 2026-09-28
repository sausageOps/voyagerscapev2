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
import { useUI } from "@/lib/ui-store";
import styles from "./RouteTransition.module.css";

/**
 * GLOBAL PAGE TRANSITION SYSTEM — COORDINATED MASK WIPE
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
 * The transition is a quick coordinated mask wipe, not a loading screen:
 * a repeating stripe mask sweeps shut over the current page as ONE
 * surface (~170ms), the destination PAGE NAME (Pixelify Sans, title
 * case, nothing else) settles in the middle while the route commits
 * underneath, then the same mask lifts away to reveal the new page
 * (~180ms). ~450ms end to end. The startup PageLoader is a separate
 * system and is untouched.
 *
 * The same controller serves desktop nav, the mobile menu and any future
 * surface: mobile-menu taps are vetted by the same capture handler, the
 * layer stacks above the menu overlay (104 > 100), and an open menu is
 * asked to close the moment a transition begins — so menu close and the
 * mask sweep read as one continuous navigation on a phone.
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
 * and layers can never stack.
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

/* ---- Timing budget: ~440ms end to end ---- */
/** Reveal never begins before this — the name's brief on-screen window. */
const REVEAL_NOT_BEFORE_MS = 255;
/** Failsafe: never sit in a transition if a commit never arrives. */
const COVERED_TIMEOUT_MS = 1600;

/* ---- Mask shape: a repeating stripe surface, animated as ONE mask ----
   A handful of full-height bars scale in with a tight stagger — a few
   DOM nodes, transform-only, reads as a single sweeping cover. */
const BARS_DESKTOP = 10;
const BARS_MOBILE = 6;

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
  const [barCount, setBarCount] = useState(0);
  const [destName, setDestName] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  const phaseRef = useRef<Phase>(phase);
  const pendingRef = useRef<PendingNav | null>(null);
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
      setBarCount(window.innerWidth <= 768 ? BARS_MOBILE : BARS_DESKTOP);
      // If the mobile menu is open, its own close animation starts NOW —
      // alongside the mask sweep — instead of only after the commit.
      if (mobileMenuOpenRef.current) setMobileMenuOpenRef.current(false);
      if (phaseRef.current === "idle") setPhaseBoth("covering");
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
      } catch {
        pendingRef.current = null;
        setPhaseBoth("revealing");
        return;
      }
    }
    setPhaseBoth((p) => (p === "covering" ? "covered" : p));
  }, [setPhaseBoth]);

  /* ------------------------------------------------------------------
     4) COVERED CONTINUITY — while the commit lands, never freeze the
     cover timeline mid-air (the phase switch kills it). Complete the
     sweep and the name rise cleanly, then hold. The reveal fires the
     moment the pathname actually commits — no animation deadline, no
     arbitrary wait.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "covered") return;
    const root = layerRef.current;
    if (!root || prefersReducedMotion()) return;
    const bars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-bar]"));
    const name = nameRef.current;
    const chars = name
      ? gsap.utils.toArray<HTMLElement>(name.querySelectorAll("[data-char]"))
      : [];
    if (bars.length > 0) {
      gsap.to(bars, { scaleY: 1, duration: 0.05, ease: "power1.out", overwrite: "auto" });
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
  }, [phase, barCount]);

  /* ------------------------------------------------------------------
     4b) FAILSAFE — if a commit never lands, peel the mask back open.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (phase !== "covered") return;
    const timer = window.setTimeout(() => {
      if (!pendingRef.current) return;
      pendingRef.current = null;
      setPhaseBoth((p) => (p === "covered" ? "revealing" : p));
    }, COVERED_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, setPhaseBoth]);

  /* ------------------------------------------------------------------
     5) COVER — the repeating stripe mask sweeps shut as ONE surface
     (~170ms); the name settles as it closes; the route commits at full
     coverage.
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

    const bars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-bar]"));
    const name = nameRef.current;
    const chars = name
      ? gsap.utils.toArray<HTMLElement>(name.querySelectorAll("[data-char]"))
      : [];
    const edge = root.querySelector<HTMLElement>("[data-edge]");
    if (bars.length === 0) return;

    gsap.set(root, { autoAlpha: 1 });
    gsap.set(bars, { scaleY: 0, transformOrigin: "center top" });
    if (name) gsap.set(name, { autoAlpha: 1, y: 0 });
    if (chars.length > 0) gsap.set(chars, { yPercent: 110 });
    if (edge) gsap.set(edge, { x: 0 });

    const inDur = 0.11 + (bars.length - 1) * 0.008; // full-coverage moment

    const tl = gsap.timeline();
    // 1. One coordinated sweep: bars drop in left→right as a soft wave,
    //    with a thin brand-pink edge riding the leading line.
    tl.to(bars, {
      scaleY: 1,
      duration: 0.11,
      ease: "power2.inOut",
      stagger: { each: 0.008, from: "start" },
    });
    if (edge) {
      tl.fromTo(
        edge,
        { x: 0 },
        { x: window.innerWidth + 6, duration: inDur, ease: "power1.inOut" },
        0,
      );
    }
    // 2. Full coverage → the route commits underneath the closed mask.
    tl.call(commitPending, [], inDur - 0.005);
    // 3. The destination name rises in, character by character, through a
    //    masked reveal — a beat before the mask reopens.
    if (chars.length > 0) {
      const gap = Math.min(0.014, 0.08 / chars.length);
      tl.to(
        chars,
        { yPercent: 0, duration: 0.13, ease: "power3.out", stagger: gap },
        inDur - 0.1,
      );
    }

    return () => {
      tl.kill();
    };
  }, [phase, barCount, commitPending]);

  /* ------------------------------------------------------------------
     6) REVEAL — the name lifts away and the same mask peels back up off
     the new page (~180ms), same coordinated surface language.
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

    const bars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-bar]"));
    const name = nameRef.current;
    const edge = root.querySelector<HTMLElement>("[data-edge]");
    const outDur = 0.1 + (bars.length - 1) * 0.008;

    if (name) tl.to(name, { autoAlpha: 0, y: -6, duration: 0.07, ease: "power2.in" }, 0);
    if (bars.length > 0) {
      tl.set(bars, { transformOrigin: "center bottom" }, 0);
      tl.to(
        bars,
        {
          scaleY: 0,
          duration: 0.1,
          ease: "power2.inOut",
          stagger: { each: 0.008, from: "end" },
        },
        0.015,
      );
    }
    // The pink edge rides back across right→left with the lifting surface.
    if (edge) {
      tl.set(edge, { left: "auto", right: "-2px", x: 0 }, 0);
      tl.fromTo(
        edge,
        { x: 0 },
        { x: -(window.innerWidth + 6), duration: outDur, ease: "power1.inOut" },
        0.015,
      );
    }

    return () => {
      tl.kill();
    };
  }, [phase, barCount, setPhaseBoth]);

  const contextValue = useMemo<RouteTransitionContextValue>(
    () => ({ navigate, transitioning: phase !== "idle", phase }),
    [navigate, phase],
  );

  return (
    <RouteTransitionContext.Provider value={contextValue}>
      {children}
      {phase !== "idle" ? (
        <div ref={layerRef} className={styles.root} aria-hidden="true" data-transition-layer>
          {!reduced && barCount > 0 ? (
            <div className={styles.mask}>
              {Array.from({ length: barCount }, (_, i) => (
                <span key={i} data-bar className={styles.bar} />
              ))}
            </div>
          ) : null}
          {!reduced && barCount > 0 ? <span data-edge className={styles.edge} /> : null}
          {!reduced && destName ? (
            <span ref={nameRef} className={styles.name} data-name>
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
