"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CrtMaterials } from "../materials";
import { BASE, FRONT_Z, GROUND_Y, NECK_BOTTOM, NECK_TOP, SHELL, VENTS } from "../proportions";
import { roundedBox, roundedRectShape, extrudeCentred, bake, merge } from "../geometry";

/**
 * CRT BODY
 * ========
 *
 * The physical machine, minus the screen, fascia controls and signature —
 * those are their own groups so they can parallax. Everything here is static
 * and welded per material at build time (one draw call per finish).
 *
 *   shell    — stepped funnel body + base plinth + neck
 *   graphite — top-deck vent slots, rear connector recess, side seams
 *   metal    — rear connector barrels, base trim, feet
 */
export default function CrtBody({ materials }: { materials: CrtMaterials }) {
  const geo = useMemo(() => {
    const shellParts: THREE.BufferGeometry[] = [];
    const deepParts: THREE.BufferGeometry[] = [];
    const graphiteParts: THREE.BufferGeometry[] = [];
    const metalParts: THREE.BufferGeometry[] = [];

    /* ---- stepped funnel body ---- */
    for (const s of [SHELL.front, SHELL.mid, SHELL.rear]) {
      shellParts.push(
        bake(roundedBox(s.w, s.h, s.depth, s.rTop, s.rBot, SHELL.bevel), [0, 0, s.z]),
      );
    }
    // rear cap (slightly deeper finish so the back reads as a distinct plate)
    deepParts.push(
      bake(
        roundedBox(SHELL.cap.w, SHELL.cap.h, SHELL.cap.depth, SHELL.cap.rTop, SHELL.cap.rBot, 0.04),
        [0, 0, SHELL.cap.z],
      ),
    );

    /* ---- seam gap between front slab and mid body (a modelled groove) ---- */
    const seamZ = (SHELL.front.z - SHELL.front.depth / 2 + (SHELL.mid.z + SHELL.mid.depth / 2)) / 2;
    graphiteParts.push(
      bake(
        extrudeCentred(roundedRectShape(SHELL.mid.w - 0.02, SHELL.mid.h - 0.02, 0.2, 0.24), 0.02, 0.008, 12),
        [0, 0, seamZ],
      ),
    );

    /* ---- top-deck vents: recessed graphite slots on the mid-body deck ---- */
    // a shallow bone rail framing the vent field, sitting proud of the deck
    shellParts.push(
      bake(new THREE.BoxGeometry(VENTS.slotW + 0.3, 0.06, VENTS.count * VENTS.pitch + 0.24), [
        VENTS.x,
        VENTS.y - 0.01,
        VENTS.z,
      ]),
    );
    for (let i = 0; i < VENTS.count; i++) {
      const z = VENTS.z + (i - (VENTS.count - 1) / 2) * VENTS.pitch;
      const slot = new THREE.BoxGeometry(VENTS.slotW, 0.05, VENTS.slotD);
      graphiteParts.push(bake(slot, [VENTS.x, VENTS.y + 0.03, z]));
    }

    /* ---- side vents (left flank): short vertical louvers ---- */
    const flankX = -SHELL.mid.w / 2 + 0.01;
    for (let i = 0; i < 5; i++) {
      const y = 0.5 - i * 0.26;
      const slot = new THREE.BoxGeometry(0.06, 0.62, 0.05);
      graphiteParts.push(bake(slot, [flankX, y, SHELL.mid.z + 0.1]));
    }

    /* ---- rear connector cluster: recessed graphite panel + metal barrels -- */
    const panelZ = SHELL.cap.z - 0.02;
    graphiteParts.push(
      bake(new THREE.BoxGeometry(1.4, 0.9, 0.06), [0.35, -0.2, panelZ]),
    );
    // three coax-style connectors
    for (let i = 0; i < 3; i++) {
      const cx = -0.1 + i * 0.42;
      const barrel = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 20);
      barrel.rotateX(Math.PI / 2);
      metalParts.push(bake(barrel, [cx, 0.02, panelZ - 0.09]));
      const ring = new THREE.TorusGeometry(0.1, 0.02, 8, 20);
      metalParts.push(bake(ring, [cx, 0.02, panelZ - 0.04]));
    }
    // a rectangular data port
    metalParts.push(bake(new THREE.BoxGeometry(0.5, 0.16, 0.1), [0.35, -0.42, panelZ - 0.05]));

    /* ---- base: plinth + neck + feet ----
       roundedBox(w, h, depth) builds a w×h face extruded along +z by depth, so
       a flat plinth is (plateW, plateH, plateD) with NO rotation. */
    const plateY = GROUND_Y + BASE.plateH / 2;
    deepParts.push(
      bake(roundedBox(BASE.plateW, BASE.plateH, BASE.plateD, 0.09, 0.09, 0.05), [0, plateY, BASE.z]),
    );
    // neck column — embeds into the body and lands on the plinth
    const neckY = (NECK_TOP + NECK_BOTTOM) / 2;
    shellParts.push(
      bake(roundedBox(BASE.neckW, BASE.neckH, BASE.neckD, 0.08, 0.06, 0.05), [0, neckY, BASE.z]),
    );
    // metal trim ring where neck meets plinth
    const trimRing = new THREE.CylinderGeometry(0.62, 0.62, 0.05, 32);
    metalParts.push(bake(trimRing, [0, NECK_BOTTOM + 0.03, BASE.z]));
    // four feet
    for (const fx of [-1, 1]) {
      for (const fz of [-1, 1]) {
        const foot = new THREE.CylinderGeometry(0.15, 0.17, 0.08, 20);
        metalParts.push(
          bake(foot, [fx * (BASE.plateW / 2 - 0.3), GROUND_Y + 0.04, BASE.z + fz * (BASE.plateD / 2 - 0.3)]),
        );
      }
    }

    return {
      shell: merge(shellParts),
      deep: merge(deepParts),
      graphite: merge(graphiteParts),
      metal: merge(metalParts),
    };
  }, []);

  useEffect(
    () => () => {
      geo.shell.dispose();
      geo.deep.dispose();
      geo.graphite.dispose();
      geo.metal.dispose();
    },
    [geo],
  );

  return (
    <group>
      <mesh geometry={geo.shell} material={materials.shell} />
      <mesh geometry={geo.deep} material={materials.shellDeep} />
      <mesh geometry={geo.graphite} material={materials.graphite} />
      <mesh geometry={geo.metal} material={materials.metalDark} />
    </group>
  );
}
