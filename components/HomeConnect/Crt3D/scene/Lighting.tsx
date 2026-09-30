"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { PALETTE } from "../materials/palette";
import { createStudioEnvironment } from "../materials/env";

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
 * THE SCREENS ARE NOT LIT FROM HERE
 * ---------------------------------
 * Each machine carries its own spill light, parented inside it — see
 * CrtUnit. A screen glow that lives in the world rig stays put while the
 * object it belongs to rotates, which reads instantly as a lamp in the
 * room rather than as light coming off a picture.
 *
 * TWO OBJECTS, ONE RIG
 * --------------------
 * The directional set below is deliberately shared and deliberately
 * unchanged from the single-monitor version. Giving the second machine
 * its own key would have been the obvious way to make it read as
 * further away, and it would also have been the fastest way to destroy
 * the illusion that both are standing in one room: two objects under one
 * light have shadow terminators that agree, and that agreement is most
 * of what the eye uses to place them on the same surface. The distance
 * cue is carried by material tint and shadow density instead.
 */
export default function Lighting() {
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

    </>
  );
}
