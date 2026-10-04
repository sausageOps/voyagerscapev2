/**
 * SPRING INTEGRATOR
 * =================
 *
 * The single motion primitive for the hero object. Everything that moves —
 * yaw, pitch, drift, the power switch, the channel knock — is one of these.
 *
 * Why a spring rather than the usual `lerp(current, target, 0.1)`:
 *
 *  - A lerp has no momentum. It decelerates into the target and stops dead,
 *    which reads as "a value being eased", not as a mass being moved. The
 *    brief asks for overshoot and settle, and a lerp mathematically cannot
 *    overshoot.
 *  - A spring carries velocity, which means an impulse can be *added* to it.
 *    That is what lets the channel-change knock live inside the same system
 *    the cursor is driving, instead of a separate tween fighting it for
 *    control of the same transform.
 *
 * Damping ratio ζ = damping / (2·√stiffness).
 *   ζ < 1  underdamped — overshoots, then settles. What we want.
 *   ζ = 1  critically damped — fastest approach with no overshoot.
 *   ζ > 1  overdamped — sluggish.
 *
 * A 17" CRT weighs 18kg, so this object runs its springs much closer to
 * critical (ζ ≈ 0.92) than a handheld prop would. See MOTION in
 * proportions.ts.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    initial = 0,
    public stiffness = 42,
    public damping = 8.2,
  ) {
    this.value = initial;
    this.target = initial;
  }

  /**
   * Advance by `dt` seconds.
   *
   * Sub-stepped at a fixed 120Hz. A semi-implicit Euler spring goes unstable
   * once dt·√stiffness gets large, and dt spikes are not hypothetical here —
   * returning to a backgrounded tab, or a long GC pause, hands you a dt of
   * several hundred milliseconds. Without sub-stepping a stiff spring
   * explodes on the first frame back.
   */
  step(dt: number) {
    const h = 1 / 120;
    let remaining = Math.min(dt, 0.25);

    while (remaining > 0) {
      const s = Math.min(h, remaining);
      const accel = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += accel * s;
      this.value += this.velocity * s;
      remaining -= s;
    }
  }

  /** Add velocity directly — the knock path. */
  impulse(v: number) {
    this.velocity += v;
  }

  /** Jump without animating (used when motion is disabled). */
  snap(to: number) {
    this.value = to;
    this.target = to;
    this.velocity = 0;
  }
}

/** Frame-rate independent exponential smoothing, for values that should not
 *  overshoot (proximity, hover blends). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
