/**
 * Ref-counted body scroll lock.
 * ============================
 *
 * Shared by the initial-load curtain, the route-transition layer and the
 * side menu so they can never fight over `body.style.overflow` (and so an
 * unlock from one system can never strand the other's lock). The release
 * protocol is written to co-exist with any other writer of the inline
 * property: on the final release we only touch the inline value if it is
 * still the "hidden" we set. If another system has since written something
 * else, it owns the property now and we leave it alone.
 *
 * SMOOTH SCROLL (Lenis) — OPT-IN PER KEY
 * --------------------------------------
 * A holder that also needs inertia scrolling frozen passes `{ smooth: true }`.
 * The single Lenis instance is stopped while ANY such holder is present and
 * restarted when the last one releases. This is a separate ref-count from the
 * body lock, so a holder that only needs the body lock (the route transition)
 * never freezes inertia. Each key is independent: releasing one key can never
 * release another key's claim.
 */

interface LockOptions {
  /** Also stop the shared smooth-scroll engine while this key is held. */
  smooth?: boolean;
}

/** The smooth-scroll engine as the lock sees it. Registered by SmoothScroll. */
export interface SmoothScrollControl {
  stop(): void;
  start(): void;
}

const held = new Set<string>();

/** Snapshots of the inline overflow values before the first holder locked.
 *  `html` is locked as well as `body`: the global stylesheet sets
 *  `overflow-x: clip` on both, so `body`'s `overflow: hidden` does not reach
 *  the viewport on its own (touch layouts, where Lenis is off, still
 *  scrolled under a body-only lock). */
let savedBodyOverflow: string | null = null;
let savedHtmlOverflow: string | null = null;

/** Keys that currently require the smooth-scroll engine to be stopped. */
const smoothHeld = new Set<string>();
let smoothControl: SmoothScrollControl | null = null;
let smoothStopped = false;

/** Reconcile the engine with the set of smooth holders. Idempotent. */
function syncSmooth(): void {
  if (!smoothControl) return;
  const shouldStop = smoothHeld.size > 0;
  if (shouldStop && !smoothStopped) {
    smoothControl.stop();
    smoothStopped = true;
  } else if (!shouldStop && smoothStopped) {
    smoothControl.start();
    smoothStopped = false;
  }
}

/**
 * Register (or clear, with null) the live smooth-scroll engine. If holders
 * already exist when it registers, the engine is stopped immediately, so a
 * lock taken before the engine mounts is never silently dropped.
 */
export function setSmoothScrollControl(control: SmoothScrollControl | null): void {
  smoothControl = control;
  smoothStopped = false;
  if (control) syncSmooth();
}

/** Lock body scrolling under `key`. Idempotent per key; client-only. */
export function lockScroll(key: string, options: LockOptions = {}): void {
  if (typeof document === "undefined") return;
  if (!held.has(key)) {
    if (held.size === 0) {
      savedBodyOverflow = document.body.style.overflow;
      savedHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    held.add(key);
  }
  if (options.smooth && !smoothHeld.has(key)) {
    smoothHeld.add(key);
    syncSmooth();
  }
}

/**
 * Release `key`'s claim (body lock and, if it held one, the smooth stop).
 * When the last body holder releases, the pre-lock inline value is restored —
 * unless somebody else has overwritten the property in the meantime, in which
 * case theirs stands.
 */
export function unlockScroll(key: string): void {
  if (typeof document === "undefined") return;
  if (smoothHeld.delete(key)) syncSmooth();
  if (!held.has(key)) return;
  held.delete(key);
  if (held.size === 0 && savedBodyOverflow !== null) {
    const body = document.body;
    const root = document.documentElement;
    if (body.style.overflow === "hidden") {
      body.style.overflow = savedBodyOverflow;
    }
    if (root.style.overflow === "hidden") {
      root.style.overflow = savedHtmlOverflow ?? "";
    }
    savedBodyOverflow = null;
    savedHtmlOverflow = null;
  }
}
