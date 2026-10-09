import type { Metadata } from "next";
import HomeHero from "@/components/HomeHero/HomeHero";

export const metadata: Metadata = {
  description:
    "Voyagerscape — a visual field archive. Photography, exploration and quiet observation from the long way round.",
};

export default function HomePage() {
  return <HomeHero />;
}
