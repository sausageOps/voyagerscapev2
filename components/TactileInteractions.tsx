"use client";

import { useEffect } from "react";
import { playTactile } from "@/lib/tactile";

/** One delegated sound layer for all opt-in interactive controls. */
export default function TactileInteractions() {
  useEffect(() => {
    let last: Element | null = null;
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tactile]");
      if (!target || target === last) return;
      last = target;
      playTactile(target.dataset.tactile === "brand" ? "brand" : "tick");
    };
    const onOut = (event: PointerEvent) => {
      if (!((event.relatedTarget as Element | null)?.closest?.("[data-tactile]"))) last = null;
    };
    const onDown = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tactile]");
      if (target && event.pointerType !== "touch") playTactile("click");
    };
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, []);
  return null;
}
