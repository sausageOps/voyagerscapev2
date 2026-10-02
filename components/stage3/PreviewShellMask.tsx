/* =========================================================
   STAGE 3 — PREVIEW SHELL MASK (TEMPORARY, PROTOTYPE ONLY)

   Hides the global app shell for the duration of a prototype
   route, so the frame and its atmosphere are the only things
   on screen.

   Why a <style> element rather than a CSS file:

   - It is server-rendered, so it applies before first paint.
     An imported stylesheet would too, but a global CSS import
     in the App Router stays attached to the document after a
     client-side navigation, which would leak these rules onto
     /about, /art and the real homepage. A <style> element
     rendered by the page is owned by React and is removed the
     moment the route unmounts, so it cannot leak.
   - Without it there is a visible flash of the real header,
     footer and old homepage atmosphere between first paint and
     hydration (the prototype itself only mounts on the client,
     via a portal).

   It hides, it never edits: no shared component, class or token
   is touched, and nothing here runs outside the prototype routes.
   ========================================================= */

const CSS = `
/* Everything the shell renders directly into <body> is hidden; the
   prototype's own portal root carries data-stage3-preview and survives.
   <nextjs-portal> is exempt so the dev error overlay still works.

   This also hides the global custom cursor, which lives in <body> too —
   so the native cursor has to be handed back, otherwise the
   html.has-custom-cursor rule in globals.css (cursor: none !important)
   would leave the preview with no pointer at all. */
body > *:not([data-stage3-preview]):not(nextjs-portal) {
  display: none !important;
}

html.has-custom-cursor,
html.has-custom-cursor * {
  cursor: auto !important;
}
`;

export default function PreviewShellMask() {
  return <style data-stage3-preview-mask dangerouslySetInnerHTML={{ __html: CSS }} />;
}
