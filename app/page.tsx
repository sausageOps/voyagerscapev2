import type { Metadata } from "next";
import Home from "@/components/Home/Home";

export const metadata: Metadata = {
  title: "Voyagerscape — Images become worlds",
  description:
    "Voyagerscape is a visual practice working across photography, art, motion, design, code and experiment. A wall, not a feed.",
  openGraph: {
    title: "Voyagerscape — Images become worlds",
    description:
      "A visual practice working across photography, art, motion, design, code and experiment.",
    type: "website",
  },
};

export default function HomePage() {
  return <Home />;
}
