import type { Metadata } from "next";
import CodropsMacDemo from "@/components/CodropsMacDemo";

export const metadata: Metadata = {
  title: "Voyagerscape — Connect",
  description:
    "Voyagerscape is an independent design practice building considered digital objects. Leave us a message.",
};

/**
 * TEMPORARY HOMEPAGE MOUNT (1:1 technical port, no redesign):
 * the Codrops Mac demo — from "Exploring the HTML-in-Canvas Proposal"
 * (https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/,
 * source https://github.com/motiontx/html-in-canvas) — is mounted as the
 * homepage's main hero while the original HomeConnect hero is temporarily
 * unmounted. Everything else (AppShell, SiteHeader, SiteFooter, navigation,
 * preloader, other routes) is untouched. See components/CodropsMacDemo/.
 */
export default function HomePage() {
  return <CodropsMacDemo />;
}
