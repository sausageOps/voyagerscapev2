"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { PALETTE } from "../materials/palette";
import { createStudioEnvironment } from "../materials/env";

/**
 * MINIMAL STUDIO RIG
 * ==================
 *
 * Four lights, no shadow maps, plus a procedural environment for specular.
 *
 *   key   — upper left front, soft white. Defines the form.
 *   fill  — lower right, pale pink at low intensity. Keeps the shadow side
 *           warm and on-brand instead of letting it go grey.
 *   rim   — behind upper right, pale yellow. Separation edge along the top
 *           and the right flank so the object lifts off the cream page.
 *   hemi  — cream sky over warm ground: ambient that still has direction.
 *
 * Shadow maps are deliberately OFF. The only shadow is the fake contact plane
 * in ContactShadow.tsx, which costs 2 triangles instead of a render target.
 */
export default function Lighting() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  /* Procedural PMREM environment — generated once, disposed on unmount. */
  useEffect(() => {
    const env = createStudioEnvironment(gl);
    if (!env) return;
    scene.environment = env;
    // Held below 1 so reflections read as a lit room, not a mirror.
    scene.environmentIntensity = 0.72;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight
        args={[new THREE.Color(PALETTE.lightSky), new THREE.Color(PALETTE.lightGround), 0.22]}
      />
      <ambientLight color={PALETTE.lightKey} intensity={0.08} />

      {/* key — swung further round to the side than Stage 1 so it rakes
          across the bevels and the barrel shoulders instead of washing the
          front face flat. This is the light doing the form description. */}
      <directionalLight color={PALETTE.lightKey} intensity={1.18} position={[-4.4, 3.4, 4.0]} />

      {/* fill — pale pink, deliberately weak. Held down further in Stage 1B:
          the barrel is metallic, so a saturated light on it produces a
          coloured specular, and at 0.5 that landed as a magenta blotch on
          the lower right of the lens. */}
      <directionalLight color={PALETTE.lightFill} intensity={0.34} position={[4.6, -1.2, 3.0]} />

      {/* rim / separation — pale yellow from behind. Stronger in Stage 1B:
          the right flank was reading at almost the same value as the cream
          page behind it, so the silhouette dissolved on that side. */}
      <directionalLight color={PALETTE.lightRim} intensity={0.88} position={[4.0, 2.2, -3.6]} />

      {/* a skim along the top plate, to pick out the seam and the controls */}
      <directionalLight color={PALETTE.lightKey} intensity={0.15} position={[0.4, 6.0, 0.8]} />

      {/* a very low bounce from below so the underside never goes black */}
      <directionalLight color={PALETTE.lightGround} intensity={0.22} position={[-1.0, -3.5, 1.5]} />
    </>
  );
}
