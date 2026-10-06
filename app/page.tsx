import type { Metadata } from "next";
import HomeExperiment from "@/components/HomeExperiment/HomeExperiment";

/**
 * HOMEPAGE — Voyagerscape experiment / trail.
 *
 * The previous homepage (HomeConnect, the voice-message desk) is left
 * untouched in components/HomeConnect and can be restored by swapping the
 * import back; nothing else in the app references this file.
 */
export const metadata: Metadata = {
  title: "Voyagerscape — Images become worlds",
  description:
    "Voyagerscape is a visual practice working between photograph, artefact and screen. Photography, art, motion, design, code, experiment.",
};

export default function HomePage() {
  return <HomeExperiment />;
}
