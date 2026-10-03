/**
 * Ref-counted body scroll lock.
 * ============================
 *
 * Shared by the initial-load curtain and the route-transition layer so the
 * two can never fight over `body.style.overflow` (and so an unlock from one
 * system can never strand the other's lock). The existing mobile menu
 * manipulates the same inline property directly — the release protocol
 * below is written to co-exist with it: on the final release we only touch
 * the inline value if it is still the "hidden" we set. If another system
 * has since written something else, it owns the property now and we leave
 * it alone.
 */

const held = new Set<string>();

/** Snapshot of the inline overflow value before the first holder locked. */
let savedOverflow: string | null = null;

/** Lock body scrolling under `key`. Idempotent per key; client-only. */
export function lockScroll(key: string): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (held.has(key)) return;
  if (held.size === 0) {
    savedOverflow = body.style.overflow;
    body.style.overflow = "hidden";
  }
  held.add(key);
}

/**
 * Release `key`'s claim. When the last holder releases, the pre-lock inline
 * value is restored — unless somebody else has overwritten the property in
 * the meantime (see header note), in which case theirs stands.
 */
export function unlockScroll(key: string): void {
  if (typeof document === "undefined") return;
  if (!held.has(key)) return;
  held.delete(key);
  if (held.size === 0 && savedOverflow !== null) {
    const body = document.body;
    if (body.style.overflow === "hidden") {
      body.style.overflow = savedOverflow;
    }
    savedOverflow = null;
  }
}
