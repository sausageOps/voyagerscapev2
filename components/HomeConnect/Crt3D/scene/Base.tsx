"use client";

import { useEffect, useMemo } from "react";
import { buildBase } from "../geometry/monitor";
import type { CrtMaterials } from "../materials/materials";

/**
 * TILT / SWIVEL BASE
 *
 * Placement and material only; the two mouldings are built in
 * `geometry/monitor.ts`, which carries the reasoning for their
 * proportions.
 */
export default function Base({ materials }: { materials: CrtMaterials }) {
  const geo = useMemo(() => buildBase(), []);

  useEffect(() => () => geo.dispose(), [geo]);

  return <mesh geometry={geo} material={materials.shell} />;
}
