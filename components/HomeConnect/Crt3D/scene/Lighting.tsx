"use client";

import { forwardRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { PALETTE } from "../materials/palette";
import { createStudioEnvironment } from "../materials/env";
import { FRONT_Z, SCREEN } from "../proportions";

/**
 * STUDIO RIG
 * ==========
 *
 * Soft, even, room-like. A CRT is a domestic object and it belongs in the
 * Voyagerscape cream environment — the moment this gets dramatic it starts
 * looking like a prop in a sci-fi film, which is explicitly not the brief.
 *
 *   key    upper left front, soft white — describes the form
 *   fill   lower right, pale pink at low intensity — keeps the shadow side
 *          warm and on-brand rather than letting it go grey
 *   rim    behind upper right, pale yellow — separation along the top and
 *          the right flank, so the cream shell lifts off the cream page
 *   skim   from directly above, picking out the vent slots
 *   bounce very low from below, so the underside never goes black
 *   hemi   cream sky over warm ground: ambient that still has direction
 *
 * Shadow maps are off. The only shadow is the procedural contact plane,
 * which costs two triangles instead of a render target.
 *
 * THE SCREEN AS A LIGHT SOURCE
 * ----------------------------
 * `spill` is a point light sitting a little in front of the tube, driven
 * every frame from the mean luminance of the phosphor canvas. It is the
 * reason the inside of the bezel goes faintly cold blue when the maze is
 * on screen and warm when the driving sunset is. Without it the monitor is
 * an object with a bright picture stuck to it; with it, the picture is
 * lighting the room.
 *
 * It is deliberately weak and has a short distance falloff — a CRT throws
 * very little light in a lit room, and overdriving this is the fastest way
 * to make the object look like it is on fire.
 */
const Lighting = forwardRef<THREE.PointLight>(function Lighting(_props, spillRef) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const env = createStudioEnvironment(gl);
    if (!env) return;
    scene.environment = env;
    // Held below 1 so reflections read as a lit room, not a mirror.
    scene.environmentIntensity = 0.7;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight
        args={[new THREE.Color(PALETTE.lightSky), new THREE.Color(PALETTE.lightGround), 0.26]}
      />
      <ambientLight color={PALETTE.lightKey} intensity={0.1} />

      {/* key — swung round to the side so it rakes across the bezel steps
          and the moulding seam instead of washing the face flat */}
      <directionalLight color={PALETTE.lightKey} intensity={1.05} position={[-4.2, 3.6, 4.2]} />

      {/* fill — pale pink, deliberately weak */}
      <directionalLight color={PALETTE.lightFill} intensity={0.3} position={[4.8, -1.0, 3.2]} />

      {/* rim — the right flank sits against cream page and would otherwise
          dissolve into it */}
      <directionalLight color={PALETTE.lightRim} intensity={0.72} position={[4.2, 2.0, -3.4]} />

      {/* skim from overhead: this is the light that finds the vent slots */}
      <directionalLight color={PALETTE.lightKey} intensity={0.22} position={[0.3, 6.0, -0.6]} />

      {/* bounce */}
      <directionalLight color={PALETTE.lightGround} intensity={0.2} position={[-1.0, -3.5, 2.0]} />

      {/* the tube, spilling onto its own bezel */}
      <pointLight
        ref={spillRef}
        color={PALETTE.screenSpill}
        intensity={0}
        distance={3.2}
        decay={2}
        position={[0, SCREEN.cy, FRONT_Z + 0.42]}
      />
    </>
  );
});

export default Lighting;
