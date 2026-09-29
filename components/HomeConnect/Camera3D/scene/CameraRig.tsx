"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { STAGING } from "../proportions";
import { useCameraMaterials } from "../materials/materials";
import { radialShadowTexture } from "../geometry/shapes";
import { TALLY_COLOR, type TallyState } from "../materials/palette";
import CameraBody from "./CameraBody";
import LensAssembly from "./LensAssembly";
import Controls from "./Controls";
import ContactShadow from "./ContactShadow";
import Lighting from "./Lighting";

interface RigProps {
  status: TallyState;
  /** Stage 1 keeps idle motion available but optional. */
  idle: boolean;
}

/**
 * CAMERA RIG
 * ==========
 *
 * The root of the scene: staging rotation, the assembled object, the ground
 * shadow and the lighting.
 *
 * STAGE 1 MOTION POLICY
 * ---------------------
 * There is exactly one animated thing here: a very slow, very small idle
 * float, present only to demonstrate that the object is dimensional (you can
 * see the highlight travel and the silhouette shift). Amplitudes are ~0.018
 * world units and ~0.6°, over periods of 9–14 seconds.
 *
 * Cursor physics, lens parallax, focus-ring travel, aperture and shutter
 * interaction are deliberately NOT implemented — they are Stages 3 to 5.
 */
export default function CameraRig({ status, idle }: RigProps) {
  const objectRef = useRef<THREE.Group>(null);
  const shadowTex = useMemo(() => radialShadowTexture(), []);
  const materials = useCameraMaterials(shadowTex);

  /* Tally lamp is state display, not interaction — it keeps the existing
     device-status contract alive without pulling Stage 5 forward. */
  const tallyColor = TALLY_COLOR[status];
  materials.tally.color.set(tallyColor);
  materials.tally.emissive.set(tallyColor);
  materials.tally.emissiveIntensity = status === "idle" ? 0.2 : 0.75;

  useFrame((state) => {
    const group = objectRef.current;
    if (!group || !idle) return;
    const t = state.clock.elapsedTime;

    // Three incommensurate periods so the loop is never legible.
    group.position.y = Math.sin(t * 0.46) * 0.018;
    group.rotation.y = STAGING.yaw + Math.sin(t * 0.33) * 0.011;
    group.rotation.z = STAGING.roll + Math.sin(t * 0.27) * 0.004;
  });

  return (
    <>
      <Lighting />

      {/* Ground shadow lives outside the object's roll so it stays level. */}
      <group rotation={[0, STAGING.yaw, 0]}>
        <ContactShadow materials={materials} />
      </group>

      <group ref={objectRef} rotation={[0, STAGING.yaw, STAGING.roll]}>
        <CameraBody materials={materials} />
        <LensAssembly materials={materials} />
        <Controls materials={materials} />
      </group>
    </>
  );
}
