"use client";

import { useEffect, useMemo } from "react";
import { buildHousing } from "../geometry/monitor";
import type { CrtMaterials } from "../materials/materials";

/**
 * HOUSING
 * =======
 *
 * Placement and materials only. Every buffer comes from
 * `geometry/monitor.ts`, which has no React and no WebGL in its dependency
 * chain so the object can be built and rasterised outside the browser.
 *
 * Six meshes, six materials, and because everything sharing a material was
 * welded at build time that is also the draw-call count for the entire
 * body of the monitor.
 */
export default function Housing({ materials }: { materials: CrtMaterials }) {
  const geo = useMemo(() => buildHousing(), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
    },
    [geo],
  );

  return (
    <group>
      <mesh geometry={geo.bezel} material={materials.bezel} />
      <mesh geometry={geo.wall} material={materials.bezelInner} />
      <mesh geometry={geo.rear} material={materials.shellRear} />
      <mesh geometry={geo.seam} material={materials.seam} />
      <mesh geometry={geo.ventPlate} material={materials.shellRear} />
      <mesh geometry={geo.ventFloor} material={materials.vent} />
    </group>
  );
}
