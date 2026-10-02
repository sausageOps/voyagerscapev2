import type { Metadata } from "next";
import EditorialPage from "@/components/EditorialPage";
export const metadata: Metadata = { title: "Privacy Protocol" };
export default function PrivacyPage(){ return <EditorialPage variant="privacy" />; }
