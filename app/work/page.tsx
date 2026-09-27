import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Work" };

export default function WorkPage() {
  return (
    <PlaceholderPage
      title="Work"
      index="03"
      note="This route is scaffolded and waiting for its content. The shell, navigation, terminal and visual modes already work here."
    />
  );
}
