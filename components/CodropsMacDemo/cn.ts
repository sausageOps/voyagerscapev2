/**
 * VOYAGERSCAPE PORT NOTE
 * The source demo imports `cn` from its own "@/lib/utils", which is
 * clsx + tailwind-merge (the Codrops repo runs Tailwind + shadcn).
 * Voyagerscape has neither package installed, and every cn() call in the
 * ported demo only joins conditional class names — there is never a
 * conflicting-Tailwind-class merge to resolve — so filtering falsy values
 * and joining with spaces is behaviourally identical for these call sites.
 * No other change; the demo markup keeps its original class names.
 */
export const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(" ");
