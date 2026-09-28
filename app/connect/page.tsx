import type { Metadata } from "next";
import ConnectPage from "@/components/ConnectPage";

export const metadata: Metadata = {
  title: "Connect",
  description:
    "Leave Voyagerscape a voice message, or reach the studio directly. Transmission desk open.",
};

export default function Connect() {
  return <ConnectPage />;
}
