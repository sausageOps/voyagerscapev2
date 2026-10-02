/* =========================================================
   ⚠ TEMPORARY PREVIEW SHIM — STAGE 3 PROTOTYPE ONLY
   ⚠ DO NOT MERGE THIS FILE.
   ---------------------------------------------------------
   This file is the ONLY thing standing between the real
   homepage and `/`. It exists purely so Arena's root preview
   opens straight onto the Stage 3 mesh-gradient prototype.

   Nothing else was changed to make this work:

     - components/HomeConnect/**  (CRT, hero, directory, …)
     - components/HomeCanvas.*    (the current atmosphere)
     - components/AppShell.tsx, SiteHeader, SiteFooter, NavMenu
     - styles/globals.css, next.config.mjs, lib/routes.ts

   …are all byte-for-byte identical to d8f7dee (PR #35). The
   homepage is not modified, only un-routed for this PR.

   TO RESTORE THE REAL HOMEPAGE — one command, nothing else:

       git checkout d8f7dee -- app/page.tsx

   The original file was exactly:

       import type { Metadata } from "next";
       import HomeConnect from "@/components/HomeConnect/HomeConnect";

       export const metadata: Metadata = { … };

       export default function HomePage() {
         return <HomeConnect />;
       }

   The prototype also remains available at its own route,
   /stage3-atmosphere, which is unaffected by this shim.
   ========================================================= */

import type { Metadata } from "next";
import PreviewShellMask from "@/components/stage3/PreviewShellMask";
import Stage3Atmosphere from "@/components/stage3/Stage3Atmosphere";

export const metadata: Metadata = {
  title: "Stage 3 — Atmosphere prototype (preview)",
  description: "Temporary prototype preview. Not the Voyagerscape homepage.",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <>
      <PreviewShellMask />
      <Stage3Atmosphere />
    </>
  );
}
