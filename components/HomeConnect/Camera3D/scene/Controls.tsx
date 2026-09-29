"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TOP_Y, DIAL, SHUTTER, KNURL } from "../proportions";
import { bake, merge } from "../geometry/shapes";
import type { CameraMaterials } from "../materials/materials";

/**
 * TOP-DECK CONTROLS
 * =================
 *
 * The SVG drew the mode dial and shutter on the front face because a flat
 * illustration has nowhere else to put them. In three dimensions they belong
 * on the top plate, which is also what earns the three-quarter view its keep:
 * the dial and the pink shutter are the payoff for tilting the object.
 *
 * Stage 1 made both too small and too simple, so they read as nubs stuck to a
 * lid. Stage 1B gives them machining:
 *
 *   mode dial — knurled skirt, a recessed brushed top face with a raised rim,
 *               seated in a moulded boss rather than resting on the plate
 *   shutter   — pink button in a stepped metal collar with a bright lip
 *
 * A small counter window was tried here and removed. A window lying on the
 * deck is a horizontal, fairly reflective surface, and a horizontal surface
 * viewed from above mirrors the bright upper half of the environment — so
 * the "dark pane" rendered as a pale blob sitting against the prism housing,
 * reading as a modelling error rather than as a display. The front panel
 * already carries two recessed windows and the tally lamp; the deck does not
 * need a third.
 *
 * Stage 1B is still static. Hover depression and the shutter timeline belong
 * to the interaction stages.
 */
export default function Controls({ materials: m }: { materials: CameraMaterials }) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => {
    /* Cylinders here run along +Y (deck normal), so these stay unrotated. */
    const tubeY = (r: number, from: number, to: number, seg = 44) =>
      bake(new THREE.CylinderGeometry(r, r, to - from, seg, 1, true), [
        0,
        (from + to) / 2,
        0,
      ]);

    const discY = (r: number, y: number, seg = 40) => {
      const g = new THREE.CircleGeometry(r, seg);
      g.rotateX(-Math.PI / 2);
      g.translate(0, y, 0);
      return g;
    };

    const ringY = (rIn: number, rOut: number, y: number, seg = 44) => {
      const g = new THREE.RingGeometry(rIn, rOut, seg);
      g.rotateX(-Math.PI / 2);
      g.translate(0, y, 0);
      return g;
    };

    /* ------------------------------------------------------- mode dial -- */
    const dialBase = TOP_Y + 0.012;
    const dialTopY = dialBase + DIAL.h;
    const dialWellY = dialTopY - 0.016;

    // Moulded boss in the plate casting, so the dial emerges from the deck
    // instead of sitting on it.
    const seat = merge([
      tubeY(DIAL.r * 1.13, TOP_Y - 0.01, TOP_Y + 0.016, 44),
      ringY(DIAL.r * 1.02, DIAL.r * 1.13, TOP_Y + 0.016, 44),
    ]);
    bake(seat, [DIAL.x, 0, DIAL.z]);

    // Skirt + raised rim + recessed brushed top.
    const dialMetal = merge([
      tubeY(DIAL.r, dialBase, dialTopY, 48),
      ringY(DIAL.rInner, DIAL.r, dialTopY, 48),
      tubeY(DIAL.rInner, dialWellY, dialTopY, 40),
    ]);
    bake(dialMetal, [DIAL.x, 0, DIAL.z]);

    const dialFace = discY(DIAL.rInner, dialWellY, 40);
    bake(dialFace, [DIAL.x, 0, DIAL.z]);

    const knurl = new THREE.BoxGeometry(0.016, DIAL.h * 0.78, 0.022);

    /* --------------------------------------------------------- shutter -- */
    const collarBase = TOP_Y - 0.004;
    const collarTop = TOP_Y + 0.066;
    const buttonTop = collarTop + SHUTTER.h;

    const collar = merge([
      tubeY(SHUTTER.rCollar, collarBase, collarTop, 40),
      ringY(SHUTTER.rButton + 0.012, SHUTTER.rCollar, collarTop, 40),
      tubeY(SHUTTER.rButton + 0.012, collarTop - 0.03, collarTop, 36),
    ]);
    bake(collar, [SHUTTER.x, 0, SHUTTER.z]);

    const collarLip = new THREE.TorusGeometry(SHUTTER.rCollar - 0.006, 0.009, 10, 40);
    collarLip.rotateX(Math.PI / 2);
    bake(collarLip, [SHUTTER.x, collarTop, SHUTTER.z]);

    // Button: a short cylinder closed by a gently domed cap, which is what
    // catches the key light and makes the pink read as a soft-touch control.
    //
    // The cylinder must stop where the dome's RIM sits, not where its apex
    // sits. Running it to the apex leaves a bare tube standing proud of the
    // cap all the way round, and the open end of that tube scallops the
    // silhouette of the button.
    const capR = SHUTTER.rButton * 1.8;
    const capPhi = Math.asin(SHUTTER.rButton / capR);
    const capSag = capR * (1 - Math.cos(capPhi));
    const dome = new THREE.SphereGeometry(capR, 40, 14, 0, Math.PI * 2, 0, capPhi);
    dome.translate(0, buttonTop - capR, 0);

    const button = merge([
      tubeY(SHUTTER.rButton, collarTop - 0.012, buttonTop - capSag, 40),
      dome,
    ]);
    bake(button, [SHUTTER.x, 0, SHUTTER.z]);

    /* ----------------------------------------------------- index mark ---- */
    const index = bake(new THREE.BoxGeometry(0.018, 0.006, 0.05), [
      DIAL.x,
      dialTopY + 0.001,
      DIAL.z + DIAL.r * 0.72,
    ]);

    return {
      seat,
      dialMetal,
      dialFace,
      knurl,
      collar,
      collarLip,
      button,
      index,
      dialBase,
      dialTopY,
    };
  }, []);

  useEffect(
    () => () => {
      Object.entries(geo).forEach(([, g]) => {
        if (g instanceof THREE.BufferGeometry) g.dispose();
      });
    },
    [geo],
  );

  useLayoutEffect(() => {
    const mesh = knurlRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const r = DIAL.r + 0.002;
    const y = (geo.dialBase + geo.dialTopY) / 2;

    for (let i = 0; i < KNURL.dial; i += 1) {
      const a = (i / KNURL.dial) * Math.PI * 2;
      dummy.position.set(DIAL.x + Math.cos(a) * r, y, DIAL.z + Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geo]);

  return (
    <group>
      {/* boss moulded into the top plate */}
      <mesh geometry={geo.seat} material={m.deck} />

      {/* dial — dark drum, bright ridges. The reverse (pale drum, black
          teeth) rendered as a flat black gear with no material read. */}
      <mesh geometry={geo.dialMetal} material={m.metalDark} />
      <mesh geometry={geo.dialFace} material={m.metalBright} />
      <instancedMesh
        ref={knurlRef}
        args={[geo.knurl, m.metalMid, KNURL.dial]}
        frustumCulled={false}
      />
      <mesh geometry={geo.index} material={m.yellow} />

      {/* shutter */}
      <mesh geometry={geo.collar} material={m.metalMid} />
      <mesh geometry={geo.collarLip} material={m.metalBright} />
      <mesh geometry={geo.button} material={m.pink} />

    </group>
  );
}
