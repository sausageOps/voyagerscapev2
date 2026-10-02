import type { Metadata } from "next";
import Stage3Lab from "@/components/Stage3Atmosphere/Stage3Lab";

export const metadata: Metadata = {
  title: "Stage 3 — Atmosphere",
  description: "Isolated prototype route for the Stage 3 procedural colour atmosphere.",
  robots: { index: false, follow: false },
};

export default function Stage3AtmospherePage() {
  return <Stage3Lab />;
}
