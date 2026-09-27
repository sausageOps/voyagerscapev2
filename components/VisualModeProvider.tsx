"use client";

import { useEffect, type ReactNode } from "react";
import { useUI } from "@/lib/ui-store";

/** Reflects the session visual mode onto <html> so filters apply globally. */
export default function VisualModeProvider({ children }: { children: ReactNode }) {
  const { visualMode } = useUI();

  useEffect(() => {
    const root = document.documentElement;
    if (visualMode === "normal") {
      root.removeAttribute("data-visual-mode");
    } else {
      root.setAttribute("data-visual-mode", visualMode);
    }
    return () => root.removeAttribute("data-visual-mode");
  }, [visualMode]);

  return <>{children}</>;
}
