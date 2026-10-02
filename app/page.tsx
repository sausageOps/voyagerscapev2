import type { Metadata } from "next";
import HomeConnect from "@/components/HomeConnect/HomeConnect";

export const metadata: Metadata = {
  title: "Voyagerscape — Visual Art, Machines & Field Notes",
  description:
    "Voyagerscape is a living visual archive where photography, technology and experimentation meet.",
};

export default function HomePage() {
  return <HomeConnect />;
}
