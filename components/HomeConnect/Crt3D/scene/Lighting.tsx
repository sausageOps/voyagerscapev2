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
 *   fill   upper RIGHT front, near-white — the counter-key; see below
 *   bounce low right, full brand pink at 0.17 — warms the shadow side
 *          without colouring the form
 *   rim    behind upper right, pale yellow — separation along the top and
 *          the right flank, so the cream shell lifts off the cream page
 *   skim   from directly above, picking out the vent slots
 *   bounce very low from below, so the underside never goes black
 *   hemi   cream sky over warm ground: ambient that still has direction
 *
 * LIT FOR AN OBJECT THAT TURNS ±20°
 * ---------------------------------
 * The fill is the light this iteration changed, and it was not a
 * refinement — it was a bug fix found by rendering the nine cursor
 * positions side by side.
 *
 * With a single strong key upper-left and only a weak low fill opposite,
 * the monitor was beautifully lit for half its rotation range and went
 * flat mauve-grey for the other half: swing the face toward +X and it
 * turns out of the key and finds nothing on the other side. Half of the
 * interaction made the hero look broken, and no single screenshot would
 * ever have shown it.
 *
 * So the fill was raised from 0.3 to 0.6 and lifted from below the
 * horizon to upper-right, making it a proper counter-key. It is still
 * clearly subordinate — 57% of the key, and softer — so the form still
 * reads and the object is not lit flat from both sides. What it
 * guarantees is that there is no orientation in the reachable range
 * where the front of the monitor has no light on it. Turning the object
 * now changes WHICH light describes it rather than WHETHER one does.
 *
 * Its COLOUR had to change with its intensity. The old fill was full
 * brand pink, which is unobjectionable at 0.3 from below and dyes the
 * entire casting pink at 0.6 from the front. The brand temperature now
 * comes from a separate weak bounce low on the right, where it warms the
 * shadow side without tinting the form.
 *
 * TOTAL EXPOSURE IS HELD, NOT RAISED
 * ----------------------------------
 * Redistributing light is not the same as adding it. The counter-key
 * brought 0.47 of new intensity to the front of the object, so the key
 * came down from 1.05 to 0.92 and the rim from 0.72 to 0.62 to pay for
 * most of it. The sum is within about 10% of the version before this
 * change, which matters because the shell is a pale cream at #e8dec7 and
 * has very little headroom before the highlights clip and the plastic
 * starts reading as white.
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
        args={[new THREE.Color(PALETTE.lightSky), new THREE.Color(PALETTE.lightGround), 0.3]}
      />
      {/* Raised slightly with the wider rotation range: surfaces that
          swing away from every directional source still need a floor, or
          they read as holes in the object rather than as planes in
          shadow. */}
      <ambientLight color={PALETTE.lightKey} intensity={0.13} />

      {/* key — swung round to the side so it rakes across the bezel steps
          and the moulding seam instead of washing the face flat */}
      <directionalLight color={PALETTE.lightKey} intensity={0.92} position={[-4.2, 3.6, 4.2]} />

      {/* counter-key — subordinate but real */}
      <directionalLight color={PALETTE.lightCounter} intensity={0.6} position={[4.6, 2.3, 3.9]} />

      {/* brand bounce — full pink, weak, from below right */}
      <directionalLight color={PALETTE.lightFill} intensity={0.17} position={[4.4, -2.4, 2.6]} />

      {/* rim — the right flank sits against cream page and would otherwise
          dissolve into it */}
      <directionalLight color={PALETTE.lightRim} intensity={0.62} position={[4.2, 2.0, -3.4]} />

      {/* skim from overhead: this is the light that finds the vent slots */}
      <directionalLight color={PALETTE.lightKey} intensity={0.22} position={[0.3, 6.0, -0.6]} />

      {/* bounce */}
      <directionalLight color={PALETTE.lightGround} intensity={0.2} position={[-1.0, -3.5, 2.0]} />

    </>
  );
}
