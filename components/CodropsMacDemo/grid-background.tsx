/**
 * VOYAGERSCAPE PORT NOTE
 * Ported from the Codrops source repo (motiontx/html-in-canvas),
 * components/ui/grid-background.tsx.
 *
 * The source is written with Tailwind v4 utility classes (including
 * arbitrary-value `after:*` pseudo-element utilities). Voyagerscape does
 * not use Tailwind, so the exact same DOM and class names are kept and the
 * utilities are translated 1:1 into styles.css, scoped under
 * `.codrops-mac-demo`. The `after:` chain became the
 * `.codrops-grid-layer::after` rule. Values were converted with Tailwind's
 * spacing scale (1 unit = 0.25rem): -inset-47 = -11.75rem,
 * -top-0.5 = -0.125rem. The `bg-codrops` colour is the source theme's
 * `--color-codrops: #253ddd`.
 */
interface GridBackgroundProps {
  className?: string;
}

export const GridBackground = ({ className }: GridBackgroundProps) => (
  <div
    className={["pointer-events-none fixed inset-0", className]
      .filter(Boolean)
      .join(" ")}
  >
    <div className="codrops-grid-layer absolute inset-0 overflow-hidden opacity-50" />
  </div>
);
