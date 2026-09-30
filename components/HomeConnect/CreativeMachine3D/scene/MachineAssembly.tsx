"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { MachineMaterials } from "../materials/MachineMaterials";

interface MachineAssemblyProps {
  materials: MachineMaterials;
  dialRef: MutableRefObject<THREE.Group | null>;
  armRef: MutableRefObject<THREE.Group | null>;
  meterRefs: MutableRefObject<Array<THREE.Group | null>>;
}

function useShellGeometry() {
  const geometry = useMemo(() => {
    /* The silhouette has drafted shoulders, a narrow service waist and an
       asymmetric right-side carriage. It is the main cue that this is an
       invented instrument, not a box decorated with controls. */
    const shape = new THREE.Shape();
    shape.moveTo(-1.5, -1.22);
    shape.lineTo(1.15, -1.22);
    shape.quadraticCurveTo(1.52, -1.22, 1.52, -0.86);
    shape.lineTo(1.52, 0.68);
    shape.quadraticCurveTo(1.5, 0.98, 1.2, 1.06);
    shape.lineTo(0.78, 1.16);
    shape.lineTo(0.48, 1.42);
    shape.quadraticCurveTo(0.34, 1.53, 0.04, 1.53);
    shape.lineTo(-0.47, 1.53);
    shape.quadraticCurveTo(-0.7, 1.51, -0.87, 1.3);
    shape.lineTo(-1.1, 1.1);
    shape.lineTo(-1.36, 1.04);
    shape.quadraticCurveTo(-1.58, 0.96, -1.58, 0.7);
    shape.lineTo(-1.58, -0.92);
    shape.quadraticCurveTo(-1.57, -1.15, -1.5, -1.22);
    shape.closePath();

    const extrusion = new THREE.ExtrudeGeometry(shape, {
      depth: 1.04,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.075,
      bevelSegments: 3,
      curveSegments: 12,
    });
    extrusion.translate(0, 0, -0.52);
    extrusion.computeVertexNormals();
    return extrusion;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function VentBank({ materials }: Pick<MachineAssemblyProps, "materials">) {
  return (
    <group position={[-1.28, -0.59, 0.62]}>
      <RoundedBox args={[0.28, 0.73, 0.045]} radius={0.08} smoothness={2} material={materials.panelInset} />
      {[-0.21, -0.07, 0.07, 0.21].map((y) => (
        <RoundedBox
          key={y}
          args={[0.16, 0.034, 0.02]}
          radius={0.015}
          smoothness={1}
          position={[0, y, 0.038]}
          material={materials.metalDark}
        />
      ))}
    </group>
  );
}

function ServiceRail({ materials }: Pick<MachineAssemblyProps, "materials">) {
  return (
    <group position={[1.48, -0.1, 0.04]} rotation={[0, -0.08, 0]}>
      <RoundedBox args={[0.13, 1.47, 0.22]} radius={0.05} smoothness={2} material={materials.metalDark} />
      {[-0.46, 0.03, 0.5].map((y) => (
        <mesh key={y} position={[0.075, y, 0.126]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
          <cylinderGeometry args={[0.044, 0.044, 0.035, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function Display({ materials, meterRefs }: Pick<MachineAssemblyProps, "materials" | "meterRefs">) {
  return (
    <group position={[-0.24, 0.13, 0.59]}>
      <RoundedBox args={[1.98, 1.18, 0.12]} radius={0.15} smoothness={3} material={materials.panel} />
      <RoundedBox args={[1.76, 0.96, 0.038]} radius={0.11} smoothness={2} position={[0, 0, 0.073]} material={materials.screen} />

      {/* An abstract reading field: no faux interface copy, only an offset
          scan line, three responsive meters and an orbital locator. */}
      <RoundedBox
        args={[1.14, 0.05, 0.016]}
        radius={0.02}
        smoothness={1}
        position={[-0.15, 0.25, 0.105]}
        material={materials.scan}
      />
      <RoundedBox
        args={[0.72, 0.032, 0.014]}
        radius={0.015}
        smoothness={1}
        position={[-0.35, -0.28, 0.104]}
        material={materials.metal}
      />
      <mesh position={[0.64, 0.06, 0.108]} material={materials.lavender}>
        <ringGeometry args={[0.12, 0.155, 16]} />
      </mesh>
      <mesh position={[0.64, 0.06, 0.109]} material={materials.pink}>
        <circleGeometry args={[0.038, 12]} />
      </mesh>
      {[-0.58, -0.39, -0.2].map((x, index) => (
        <group key={x} ref={(node) => { meterRefs.current[index] = node; }} position={[x, -0.02, 0.108]}>
          <RoundedBox args={[0.1, 0.26, 0.018]} radius={0.025} smoothness={1} material={materials.scan} />
        </group>
      ))}
    </group>
  );
}

function Scanner({ materials }: Pick<MachineAssemblyProps, "materials">) {
  return (
    <group position={[1.11, 0.22, 0.62]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.metalDark}>
        <cylinderGeometry args={[0.42, 0.42, 0.16, 8]} />
      </mesh>
      <mesh position={[0, 0, 0.096]} rotation={[Math.PI / 2, 0, 0]} material={materials.panelInset}>
        <cylinderGeometry args={[0.33, 0.33, 0.018, 8]} />
      </mesh>
      <RoundedBox args={[0.12, 0.44, 0.024]} radius={0.045} smoothness={2} position={[0, 0, 0.12]} material={materials.yellow} />
      <RoundedBox args={[0.34, 0.055, 0.02]} radius={0.02} smoothness={1} position={[0, -0.18, 0.121]} material={materials.metal} />
    </group>
  );
}

function ControlDial({ materials, dialRef }: Pick<MachineAssemblyProps, "materials" | "dialRef">) {
  const ticks = useMemo(
    () => Array.from({ length: 12 }, (_, index) => (index / 12) * Math.PI * 2),
    [],
  );

  return (
    <group ref={dialRef} position={[1.08, -0.74, 0.69]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.metalDark}>
        <cylinderGeometry args={[0.43, 0.43, 0.14, 16]} />
      </mesh>
      <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} material={materials.lavender}>
        <cylinderGeometry args={[0.336, 0.336, 0.052, 16]} />
      </mesh>
      {ticks.map((angle) => (
        <RoundedBox
          key={angle}
          args={[0.035, 0.075, 0.025]}
          radius={0.012}
          smoothness={1}
          position={[Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0.088]}
          rotation={[0, 0, angle]}
          material={materials.metal}
        />
      ))}
      <RoundedBox args={[0.052, 0.19, 0.028]} radius={0.018} smoothness={1} position={[0, 0.055, 0.125]} material={materials.panelInset} />
      <mesh position={[-0.135, -0.13, 0.125]} material={materials.pink}>
        <circleGeometry args={[0.042, 12]} />
      </mesh>
    </group>
  );
}

function TopArray({ materials, armRef }: Pick<MachineAssemblyProps, "materials" | "armRef">) {
  return (
    <group>
      <RoundedBox args={[1.12, 0.2, 0.38]} radius={0.08} smoothness={2} position={[-0.11, 1.31, 0.05]} material={materials.metalDark} />
      <RoundedBox args={[0.64, 0.08, 0.065]} radius={0.025} smoothness={1} position={[-0.11, 1.42, 0.25]} material={materials.brass} />
      <group ref={armRef} position={[0.42, 1.39, 0.08]}>
        <mesh position={[0, 0.26, 0]} material={materials.metal}>
          <cylinderGeometry args={[0.045, 0.06, 0.54, 10]} />
        </mesh>
        <RoundedBox args={[0.68, 0.22, 0.23]} radius={0.07} smoothness={2} position={[0.04, 0.56, 0.015]} material={materials.panel} />
        <RoundedBox args={[0.43, 0.07, 0.03]} radius={0.02} smoothness={1} position={[0.04, 0.56, 0.14]} material={materials.scan} />
        <mesh position={[-0.29, 0.56, 0.145]} material={materials.signal}>
          <circleGeometry args={[0.045, 12]} />
        </mesh>
      </group>
    </group>
  );
}

export default function MachineAssembly({ materials, dialRef, armRef, meterRefs }: MachineAssemblyProps) {
  const shellGeometry = useShellGeometry();

  return (
    <group>
      <mesh geometry={shellGeometry} material={materials.shell} />

      {/* The front apron ties display, scanner and dial into one chassis. */}
      <RoundedBox args={[3.07, 2.23, 0.11]} radius={0.18} smoothness={3} position={[-0.02, -0.11, 0.56]} material={materials.shellEdge} />
      <RoundedBox args={[3.0, 2.13, 0.045]} radius={0.15} smoothness={2} position={[-0.02, -0.11, 0.635]} material={materials.shell} />

      <Display materials={materials} meterRefs={meterRefs} />
      <Scanner materials={materials} />
      <ControlDial materials={materials} dialRef={dialRef} />
      <VentBank materials={materials} />
      <ServiceRail materials={materials} />
      <TopArray materials={materials} armRef={armRef} />

      {/* Tactile lower deck / fixing hardware. */}
      <RoundedBox args={[0.43, 0.15, 0.08]} radius={0.045} smoothness={1} position={[-0.82, -1.03, 0.69]} material={materials.rubber} />
      {[-0.96, -0.69].map((x) => (
        <mesh key={x} position={[x, -1.03, 0.748]} material={materials.brass}>
          <circleGeometry args={[0.037, 10]} />
        </mesh>
      ))}
      <RoundedBox args={[0.58, 0.105, 0.065]} radius={0.035} smoothness={1} position={[0.15, -1.07, 0.68]} material={materials.metalDark} />
      <RoundedBox args={[0.25, 0.08, 0.03]} radius={0.024} smoothness={1} position={[0.15, -1.07, 0.733]} material={materials.yellow} />

      {/* Small state lamps sit along a shared service channel rather than as
          unrelated decorations. */}
      {[0.63, 0.78, 0.93].map((x, index) => (
        <mesh key={x} position={[x, 0.84, 0.695]} material={index === 1 ? materials.signal : materials.metal}>
          <circleGeometry args={[0.038, 12]} />
        </mesh>
      ))}

      {/* Short feet read against the contact shadow without turning the object
          into a vehicle. */}
      <RoundedBox args={[0.62, 0.15, 0.42]} radius={0.06} smoothness={2} position={[-0.86, -1.32, -0.05]} material={materials.rubber} />
      <RoundedBox args={[0.62, 0.15, 0.42]} radius={0.06} smoothness={2} position={[0.86, -1.32, -0.05]} material={materials.rubber} />
    </group>
  );
}
