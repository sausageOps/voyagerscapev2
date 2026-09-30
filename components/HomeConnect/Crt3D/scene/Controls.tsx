"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { CrtMaterials } from "../materials";
import { BUTTONS, FRONT_Z, KNOBS, LEDS, READOUT } from "../proportions";
import { curvedPanel, roundedBox, bake, merge } from "../geometry";
import type { ReadoutTexture } from "./screenTexture";

export interface ControlRefs {
  knobs: MutableRefObject<(THREE.Group | null)[]>;
  buttons: MutableRefObject<(THREE.Group | null)[]>;
  leds: MutableRefObject<(THREE.Mesh | null)[]>;
}

/** Build one knob's static geometry in local space, facing +z. */
function knobGeometry(r: number, h: number) {
  const graphite: THREE.BufferGeometry[] = [];
  const cap: THREE.BufferGeometry[] = [];
  const brass: THREE.BufferGeometry[] = [];

  // body
  const body = new THREE.CylinderGeometry(r, r * 1.04, h, 28);
  body.rotateX(Math.PI / 2);
  graphite.push(bake(body, [0, 0, h / 2]));

  // knurl ridges around the side
  const ridges = 16;
  for (let i = 0; i < ridges; i++) {
    const a = (i / ridges) * Math.PI * 2;
    const rib = new THREE.BoxGeometry(0.014, h * 0.7, 0.03);
    graphite.push(
      bake(rib, [Math.cos(a) * r, Math.sin(a) * r, h / 2], [0, 0, a + Math.PI / 2]),
    );
  }

  // machined top cap
  const capGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.05, 28);
  capGeo.rotateX(Math.PI / 2);
  cap.push(bake(capGeo, [0, 0, h + 0.02]));

  // brass indicator line from centre to edge, pointing +y
  const mark = new THREE.BoxGeometry(0.02, r * 0.66, 0.02);
  brass.push(bake(mark, [0, r * 0.4, h + 0.055]));
  // brass dot at hub
  const hub = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12);
  hub.rotateX(Math.PI / 2);
  brass.push(bake(hub, [0, 0, h + 0.05]));

  return {
    graphite: merge(graphite),
    cap: merge(cap),
    brass: merge(brass),
  };
}

/**
 * CONTROLS
 * ========
 *
 * The fascia along the bottom of the front face: three rotary knobs, two
 * tactile buttons, a stack of indicator LEDs, and the small amber secondary
 * readout. Each knob and button is its own group so the rig can turn / press
 * them. Static geometry is welded per material.
 */
export default function Controls({
  materials,
  readout,
  refs,
}: {
  materials: CrtMaterials;
  readout: ReadoutTexture;
  refs: ControlRefs;
}) {
  const knob = useMemo(() => knobGeometry(KNOBS.r, KNOBS.h), []);

  // Button cap + recessed bezel geometry (local space, facing +z).
  const button = useMemo(() => {
    const s = BUTTONS.size;
    const cap = bake(roundedBox(s, s, BUTTONS.h, 0.05, 0.05, 0.02), [0, 0, BUTTONS.h / 2]);
    const bezel = bake(roundedBox(s + 0.08, s + 0.08, 0.05, 0.04, 0.04, 0.015), [0, 0, 0.02]);
    return { cap, bezel };
  }, []);

  // LED lens geometry.
  const ledGeo = useMemo(() => new THREE.CylinderGeometry(LEDS.r, LEDS.r, 0.04, 16), []);
  const ledSocket = useMemo(() => {
    const g = new THREE.CylinderGeometry(LEDS.r * 1.7, LEDS.r * 1.7, 0.03, 16);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  // Readout: recessed dark surround + curved amber panel.
  const readoutSurround = useMemo(
    () => roundedBox(READOUT.w + 0.14, READOUT.h + 0.14, 0.1, 0.05, 0.05, 0.02),
    [],
  );
  const readoutPanel = useMemo(() => curvedPanel(READOUT.w, READOUT.h, 0.02, 12), []);
  const readoutMat = useMemo(() => {
    const m = materials.readout.clone();
    m.emissiveMap = readout.texture;
    m.map = readout.texture;
    m.emissive = new THREE.Color("#ffffff");
    m.toneMapped = false;
    m.needsUpdate = true;
    return m;
  }, [materials.readout, readout.texture]);

  useEffect(
    () => () => {
      knob.graphite.dispose();
      knob.cap.dispose();
      knob.brass.dispose();
      button.cap.dispose();
      button.bezel.dispose();
      ledGeo.dispose();
      ledSocket.dispose();
      readoutSurround.dispose();
      readoutPanel.dispose();
      readoutMat.dispose();
    },
    [knob, button, ledGeo, ledSocket, readoutSurround, readoutPanel, readoutMat],
  );

  const ledMats = [materials.ledGreen, materials.ledYellow, materials.ledPink];

  // rotate the flat LED lens to face +z
  const ledRot: [number, number, number] = [Math.PI / 2, 0, 0];

  return (
    <group>
      {/* knobs */}
      {KNOBS.xs.map((x, i) => (
        <group
          key={`knob-${i}`}
          position={[x, KNOBS.y, FRONT_Z]}
          ref={(el) => {
            refs.knobs.current[i] = el;
          }}
        >
          <mesh geometry={knob.graphite} material={materials.graphiteSoft} />
          <mesh geometry={knob.cap} material={materials.knobCap} />
          <mesh geometry={knob.brass} material={materials.brassBright} />
        </group>
      ))}

      {/* buttons */}
      {BUTTONS.xs.map((x, i) => (
        <group key={`btn-${i}`} position={[x, BUTTONS.y, FRONT_Z]}>
          <mesh geometry={button.bezel} material={materials.graphite} />
          <group
            ref={(el) => {
              refs.buttons.current[i] = el;
            }}
          >
            <mesh
              geometry={button.cap}
              material={i === 0 ? materials.buttonPink : materials.buttonYellow}
            />
          </group>
        </group>
      ))}

      {/* indicator LEDs */}
      {LEDS.ys.map((y, i) => (
        <group key={`led-${i}`} position={[LEDS.x, y, FRONT_Z]}>
          <mesh geometry={ledSocket} material={materials.graphite} position={[0, 0, 0.01]} />
          <mesh
            geometry={ledGeo}
            material={ledMats[i]}
            rotation={ledRot}
            position={[0, 0, 0.05]}
            ref={(el) => {
              refs.leds.current[i] = el;
            }}
          />
        </group>
      ))}

      {/* secondary readout */}
      <group position={[READOUT.x, READOUT.y, FRONT_Z]}>
        <mesh geometry={readoutSurround} material={materials.graphite} position={[0, 0, 0.0]} />
        <mesh geometry={readoutPanel} material={readoutMat} position={[0, 0, 0.02]} />
      </group>
    </group>
  );
}
