let context: AudioContext | null = null;

/** Lazily creates one shared context; browsers may reject this and that is fine. */
export function playTactile(kind: "tick" | "brand" | "click" = "tick") {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    context ??= new window.AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "brand" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(kind === "brand" ? 420 : kind === "click" ? 180 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "brand" ? 680 : 320, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "brand" ? 0.018 : 0.012, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  } catch {
    // Audio is enhancement only and must never affect interaction.
  }
}
