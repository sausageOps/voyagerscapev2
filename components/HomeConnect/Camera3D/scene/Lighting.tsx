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
    scene.environmentIntensity = 0.85;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight
        args={[new THREE.Color(PALETTE.lightSky), new THREE.Color(PALETTE.lightGround), 0.34]}
      />
      <ambientLight color={PALETTE.lightKey} intensity={0.1} />

      {/* key */}
      <directionalLight color={PALETTE.lightKey} intensity={1.65} position={[-3.4, 4.2, 5.2]} />

      {/* fill — pale pink, deliberately weak */}
      <directionalLight color={PALETTE.lightFill} intensity={0.5} position={[4.6, -1.2, 3.0]} />

      {/* rim / separation — pale yellow from behind */}
      <directionalLight color={PALETTE.lightRim} intensity={1.0} position={[3.2, 2.6, -4.2]} />

      {/* a very low bounce from below so the underside never goes black */}
      <directionalLight color={PALETTE.lightGround} intensity={0.22} position={[-1.0, -3.5, 1.5]} />
    </>
  );
}
