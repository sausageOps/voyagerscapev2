/**
 * TEMPORARY HERO MOUNT — Codrops Mac demo ("Exploring the HTML-in-Canvas
 * Proposal") integrated as the Voyagerscape homepage's hero object.
 *
 * Source: https://github.com/motiontx/html-in-canvas
 *         app/examples/basic-ui/page.tsx
 * Article: https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/
 *
 * VOYAGERSCAPE INTEGRATION (layout layer only — the demo itself is the
 * original implementation, untouched):
 *
 * - The source composes <Header /> <GridBackground className="bg-codrops" />
 *   <ComputerScreen /> <Scene /> <Footer /> as a standalone page. Voyagerscape
 *   keeps its own shell (AppBackdrop, HomeCanvas atmosphere, SiteHeader,
 *   SiteFooter, PageLoader, hero typography), so only the demo's core —
 *   ComputerScreen + Scene — is mounted here, inside the site's existing
 *   hero-object slot (HomeConnect's .stage). The Codrops GridBackground /
 *   #253ddd blue is NOT used.
 *
 * - .codrops-mac-hero is a dedicated hero region: relative, controlled
 *   width/height, overflow hidden, stacking isolated inside the slot. The
 *   3D canvas renders inside this region — there is no global fixed overlay.
 *
 * - .codrops-mac-screen-mount is the DOM mount point for the real
 *   #computer_screen element. When the browser supports HTML-in-Canvas,
 *   three's WebGLTextures re-parents that element INTO the WebGL canvas
 *   (layoutsubtree) and InteractionManager aligns it with the screen plane —
 *   that is the live technique and it is fully preserved. The mount point
 *   itself is visibility:hidden so that (a) the element never flashes in the
 *   page before being re-parented, and (b) in browsers WITHOUT the
 *   chrome://flags/#canvas-draw-element feature the un-reparented element
 *   stays visually out of the way while the console reports the missing
 *   feature (see scene.tsx). No screenshot/PNG/video substitute is used.
 */
import "./styles.css";

import { ComputerScreen } from "./computer-screen";
import { Scene } from "./scene";

const CodropsMacHero = () => (
  <div className="codrops-mac-hero">
    <div className="codrops-mac-screen-mount" aria-hidden="true">
      <ComputerScreen />
    </div>
    <Scene />
  </div>
);

export default CodropsMacHero;
