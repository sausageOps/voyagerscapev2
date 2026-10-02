import type { Metadata } from "next";
import EditorialPage from "@/components/EditorialPage";
export const metadata: Metadata = { title: "Field Manual", description: "The practice and perspective behind Voyagerscape." };
export default function AboutPage(){ return <EditorialPage variant="about" />; }
