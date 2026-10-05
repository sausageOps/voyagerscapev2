"use client";

import gsap from "gsap";

/** Shared, deliberately restrained motion vocabulary. */
export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  soft: "expo.out",
} as const;

export const DUR = {
  micro: 0.22,
  fast: 0.36,
  base: 0.6,
  slow: 0.9,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Splits text into word > char spans for staggered reveals (no layout shift). */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === "true") {
    return Array.from(el.querySelectorAll<HTMLElement>("[data-char]"));
  }
  const source = el.textContent ?? "";
  const words = source.split(/(\s+)/);
  el.textContent = "";
  const chars: HTMLElement[] = [];

  words.forEach((word) => {
    if (word.trim() === "") {
      el.appendChild(document.createTextNode(word));
      return;
    }
    const wordEl = document.createElement("span");
    wordEl.setAttribute("data-word", "");
    wordEl.style.display = "inline-block";
    wordEl.style.whiteSpace = "nowrap";
    for (const ch of Array.from(word)) {
      const charEl = document.createElement("span");
      charEl.setAttribute("data-char", "");
      charEl.style.display = "inline-block";
      charEl.style.willChange = "transform, opacity, filter";
      charEl.textContent = ch;
      wordEl.appendChild(charEl);
      chars.push(charEl);
    }
    el.appendChild(wordEl);
  });

  el.dataset.split = "true";
  return chars;
}

/** Entrance: characters settle from a small offset with a hint of blur. */
export function revealChars(
  chars: HTMLElement[],
  { delay = 0, stagger = 0.012 }: { delay?: number; stagger?: number } = {},
) {
  if (prefersReducedMotion()) {
    gsap.set(chars, { opacity: 1, y: 0, filter: "blur(0px)" });
    return gsap.timeline();
  }
  return gsap.fromTo(
    chars,
    { yPercent: 42, opacity: 0, filter: "blur(6px)" },
    {
      yPercent: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.72,
      ease: EASE.soft,
      stagger,
      delay,
      clearProps: "filter,willChange",
    },
  );
}

/** Generic fade + rise entrance used by cards, labels and chrome. */
export function revealUp(
  targets: gsap.TweenTarget,
  { delay = 0, stagger = 0.06, y = 14 }: { delay?: number; stagger?: number; y?: number } = {},
) {
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0 });
    return gsap.timeline();
  }
  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: DUR.base,
      ease: EASE.out,
      stagger,
      delay,
      clearProps: "transform,willChange",
    },
  );
}

/** Writes --mx/--my/--sheen so the glass specular tracks the pointer. */
export function attachGlassSpecular(el: HTMLElement) {
  const onMove = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mx", `${x.toFixed(2)}%`);
    el.style.setProperty("--my", `${y.toFixed(2)}%`);
  };
  const onEnter = () => el.style.setProperty("--sheen", "0.85");
  const onLeave = () => {
    el.style.setProperty("--sheen", "0");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "0%");
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
  };
}

export { gsap };
