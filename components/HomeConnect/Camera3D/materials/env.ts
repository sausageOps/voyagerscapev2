import * as THREE from "three";

/**
 * PROCEDURAL STUDIO ENVIRONMENT
 * =============================
 *
 * The single highest-value trick for making shaded primitives read as a
 * photographed product: give the materials something to reflect.
 *
 * Rather than downloading an HDRI (hundreds of KB, and the wrong colour
 * temperature for a cream page), we paint a small equirectangular gradient on
 * a 2D canvas — bright soft-box above, warm cream horizon, deeper warm grey
 * below — and run it through PMREMGenerator. Cost: one canvas, one prefilter
 * pass, roughly a millisecond, zero bytes over the network.
 *
 * This is what puts the soft gradient falloff across the cream shell and the
 * controlled highlight roll across the lens barrel.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* ---- base vertical gradient: sky → horizon → floor ---- */
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0.0, "#ffffff");
  base.addColorStop(0.32, "#fbf7f0");
  base.addColorStop(0.5, "#efe8dc");
  base.addColorStop(0.62, "#ddd4c5");
  base.addColorStop(1.0, "#a9a294");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  /* ---- key soft-box, upper left: a large soft rectangle of light ---- */
  const key = ctx.createRadialGradient(w * 0.26, h * 0.2, 0, w * 0.26, h * 0.2, w * 0.3);
  key.addColorStop(0, "rgba(255,255,255,1)");
  key.addColorStop(0.55, "rgba(255,255,255,0.45)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);

  /* ---- fill card, right: dimmer, faintly pink so the shadow side keeps
         the brand temperature instead of going neutral grey ---- */
  const fill = ctx.createRadialGradient(w * 0.74, h * 0.42, 0, w * 0.74, h * 0.42, w * 0.26);
  fill.addColorStop(0, "rgba(249,226,243,0.55)");
  fill.addColorStop(1, "rgba(249,226,243,0)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);

  /* ---- a narrow bright strip along the horizon: this is what draws the
         crisp specular line along the top edge of the lens barrel ---- */
  const strip = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.52);
  strip.addColorStop(0, "rgba(255,255,255,0)");
  strip.addColorStop(0.5, "rgba(255,255,255,0.7)");
  strip.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = strip;
  ctx.fillRect(0, h * 0.42, w, h * 0.1);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;
  equirect.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(equirect);

  equirect.dispose();
  pmrem.dispose();

  return target.texture;
}
