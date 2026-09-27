import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Privacy Policy" };

/** Linked from the footer; scaffolded so the link is never dead. */
export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy Policy"
      index="06"
      note="Our policy is being written. In the meantime, voice messages are held only until we reply, and nothing is shared with third parties."
    />
  );
}
