import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Store" };

export default function StorePage() {
  return (
    <PlaceholderPage
      title="Store"
      index="04"
      note="This route is scaffolded and waiting for its content. The shell, navigation, terminal and visual modes already work here."
    />
  );
}
