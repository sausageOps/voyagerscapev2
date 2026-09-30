"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CRT } from "../palette";
import { createStudioEnvironment } from "@/components/HomeConnect/Camera3D/materials/env";

/**
 * STUDIO RIG (reused pattern)
 * ===========================
 *
 * The same procedural PMREM environment the camera hero uses, plus a small
 * directional set tuned for a large matte machine: a raking key to describe
 * the funnel and vents, a warm rim for silhouette separation off the cream
 * page, and a low bounce so the underside never crushes to black. No shadow
 * maps — the only shadow is the contact plane.
 */
export default function Lighting() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const env = createStudioEnvironment(gl);
    if (!env) return;
    scene.environment = env;
    scene.environmentIntensity = 0.66;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight
        args={[new THREE.Color(CRT.lightSky), new THREE.Color(CRT.lightGround), 0.24]}
      />
      <ambientLight color={CRT.lightKey} intensity={0.1} />

      {/* key — high left front, rakes the funnel + vents */}
      <directionalLight color={CRT.lightKey} intensity={1.12} position={[-4.6, 4.0, 4.4]} />

      {/* fill — soft lavender from the right, keeps shadows on-brand */}
      <directionalLight color={CRT.lightFill} intensity={0.3} position={[4.8, -0.8, 3.2]} />

      {/* rim — warm yellow from behind for silhouette separation */}
      <directionalLight color={CRT.lightRim} intensity={0.9} position={[3.6, 2.6, -4.0]} />

      {/* deck skim */}
      <directionalLight color={CRT.lightKey} intensity={0.16} position={[0.4, 6.0, 1.0]} />

      {/* low bounce */}
      <directionalLight color={CRT.lightGround} intensity={0.24} position={[-1.0, -3.6, 1.8]} />
    </>
  );
}
