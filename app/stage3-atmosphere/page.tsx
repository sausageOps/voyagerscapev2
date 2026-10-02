import type { Metadata } from "next";
import Stage3Atmosphere from "@/components/stage3/Stage3Atmosphere";

/* =========================================================
   STAGE 3 — ATMOSPHERE PROTOTYPE (ISOLATED TEST ROUTE)

   /stage3-atmosphere exists to evaluate one thing: a living
   pastel colour field inside a static frame.

   It is not linked from anywhere, not in lib/routes.ts, not in
   the command terminal, and not indexed. The homepage and every
   existing component are untouched by it.
   ========================================================= */

export const metadata: Metadata = {
  title: "Stage 3 — Atmosphere prototype",
  description: "Isolated visual prototype. Not part of the Voyagerscape site.",
  robots: { index: false, follow: false },
};

export default function Stage3AtmospherePage() {
  return <Stage3Atmosphere />;
}
