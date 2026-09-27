import type { Metadata } from "next";
import HomeConnect from "@/components/HomeConnect/HomeConnect";

export const metadata: Metadata = {
  title: "Connect",
  description:
    "Leave Voyagerscape a voice message, or reach the studio directly. Transmission desk open.",
  alternates: { canonical: "/" },
};

/** Alias of the homepage — one implementation, rendered at both paths. */
export default function ConnectPage() {
  return <HomeConnect />;
}
