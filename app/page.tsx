import type { Metadata } from "next";
import HomeConnect from "@/components/HomeConnect/HomeConnect";
import PanelMotionPrototype from "@/components/PanelMotionPrototype";

export const metadata: Metadata = {
  title: "Voyagerscape — Connect",
  description:
    "Voyagerscape is an independent design practice building considered digital objects. Leave us a message.",
};

export default function HomePage() {
  return (
    <>
      <HomeConnect />
      {/* TEMPORARY: fake-panel motion prototype. Remove when approved. */}
      <PanelMotionPrototype />
    </>
  );
}
