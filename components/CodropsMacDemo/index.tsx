/**
 * TEMPORARY MOUNT — Codrops Mac demo ("Exploring the HTML-in-Canvas Proposal")
 * ported 1:1 into Voyagerscape for evaluation.
 *
 * Source: https://github.com/motiontx/html-in-canvas
 *         app/examples/basic-ui/page.tsx
 * Article: https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/
 *
 * The source page composes: <Header /> <GridBackground className="bg-codrops" />
 * <ComputerScreen /> <Scene /> <Footer />. Voyagerscape's AppShell already
 * provides the site header/footer (which must stay untouched for this
 * experiment), so this port keeps the demo itself — GridBackground,
 * ComputerScreen, Scene — in the source's order, wrapped in one
 * `.codrops-mac-demo` div that scopes the translated Tailwind utilities
 * (see styles.css). No Voyagerscape branding, no customisation.
 *
 * BROWSER SUPPORT: HTML-in-Canvas is experimental. The live HTML screen
 * requires Chromium with chrome://flags/#canvas-draw-element enabled
 * (or Chrome Canary). See the console warning emitted by Scene when the
 * WebGL context lacks texElementImage2D.
 */
import "./styles.css";

import { GridBackground } from "./grid-background";
import { ComputerScreen } from "./computer-screen";
import { Scene } from "./scene";

const CodropsMacDemo = () => (
  <div className="codrops-mac-demo">
    <GridBackground className="bg-codrops" />
    <ComputerScreen />
    <Scene />
  </div>
);

export default CodropsMacDemo;
