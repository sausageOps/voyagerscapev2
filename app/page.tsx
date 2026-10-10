import type { Metadata } from "next";
import HomeConnect from "@/components/HomeConnect/HomeConnect";
import PinnedPanels from "@/components/PinnedPanels/PinnedPanels";

export const metadata: Metadata = {
  title: "Voyagerscape — Connect",
  description:
    "Voyagerscape is an independent design practice building considered digital objects. Leave us a message.",
};

/* The homepage: the existing hero, then the pinned panels. The site footer
   is mounted by AppShell after this route content, so it still follows the
   last panel. Nothing here is mounted on any other route. */
export default function HomePage() {
  return (
    <>
      <HomeConnect />
      <PinnedPanels />
    </>
  );
}
