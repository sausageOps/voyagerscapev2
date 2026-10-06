"use client";

import { ContactShadows, Float, OrbitControls, Stage } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { HTMLTexture, Mesh, type ShaderMaterial } from "three";
import { InteractionManager } from "three/addons/interaction/InteractionManager.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { screenMaterial } from "./crt-effect";

type ScreenMaterial = ShaderMaterial & { map: HTMLTexture | null };
const material = screenMaterial as ScreenMaterial;

const Mac = () => {
  const gltf = useLoader(GLTFLoader, "/mac.glb");
  const { gl, camera } = useThree();
  const screenRef = useRef<Mesh>(null);

  const interactions = useRef<InteractionManager | null>(null);

  useEffect(() => {
    const element = document.getElementById("computer_screen");
    if (!element) throw new Error("#computer_screen element not found");

    const texture = new HTMLTexture(element);

    interactions.current = new InteractionManager();

    material.uniforms.map.value = texture;
    material.map = texture;

    interactions.current.connect(gl, camera);
    if (screenRef.current) interactions.current.add(screenRef.current);

    /* VOYAGERSCAPE PORT NOTE (non-visual, added during the temporary port):
       The HTML-in-Canvas feature is experimental. three's WebGLTextures only
       uploads HTMLTexture when the WebGL context exposes texElementImage2D,
       which Chromium ships behind chrome://flags/#canvas-draw-element
       (Chrome Canary if unavailable in stable). Per the port brief we do NOT
       substitute a fallback — we report the missing browser feature clearly
       in the console and keep the original implementation untouched. */
    const glContext = gl.getContext();
    if (!("texElementImage2D" in glContext)) {
      console.warn(
        "[CodropsMacDemo] HTMLTexture is not supported by this browser: " +
          "the WebGL context has no texElementImage2D (HTML-in-Canvas proposal). " +
          "Enable chrome://flags/#canvas-draw-element in a Chromium-based browser " +
          "(or use Chrome Canary) and reload. The Mac and its CRT shader still " +
          "render, but the live HTML screen cannot be rasterized onto the texture."
      );
    }

    window.dispatchEvent(new Event("mac-canvas-ready"));
  }, [gl, camera]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    interactions.current?.update();
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.05}>
      <primitive object={gltf.scene} />
      <mesh
        ref={screenRef}
        position={[0, 0.102, 0.183]}
        rotation={[(-Math.PI / 180) * 6.5, 0, 0]}
        material={material}
      >
        <planeGeometry args={[562 * 0.00062, 408 * 0.00062]} />
      </mesh>
    </Float>
  );
};

/* VOYAGERSCAPE INTEGRATION NOTES (layout only — the 3D scene is untouched):
   - The source renders <main className="fixed inset-0 h-svh">, a fullscreen
     page overlay appropriate to the standalone Codrops demo. Inside
     Voyagerscape the Mac is a hero OBJECT, so the stage is an absolutely
     positioned layer that fills the dedicated hero container
     (.codrops-mac-hero — see index.tsx / styles.css). No global fixed layer.
   - enableZoom={false}: the source's OrbitControls owned the wheel (zoom +
     preventDefault) over the whole fixed viewport, which hijacked page
     scrolling. With zoom disabled, OrbitControls' wheel handler returns
     before preventDefault, so the wheel always bubbles to the page (Lenis)
     and normal Voyagerscape scrolling works — including over the Mac.
   - enableRotate={!coarsePointer}: on touch devices the one-finger orbit
     gesture is turned off (combined with `touch-action: pan-y pinch-zoom`
     on the canvas, styles.css) so mobile scrolling stays native. IMPORTANT:
     the controls component itself must stay mounted with enabled=true —
     drei only calls controls.update() while enabled, and that update() is
     what aims the camera at the Mac (camera.lookAt(target)). Disabling the
     controls entirely leaves the camera un-aimed, the Mac out of frame and
     the screen mesh culled — which stops HTMLTexture from ever uploading.
   - The Mac, camera, Stage, Float, ContactShadows, HTMLTexture,
     InteractionManager and the screen plane are the original implementation. */
export const Scene = () => {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="codrops-mac-stage">
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0.02, 0.01, 0.05], fov: 24, near: 0.1, far: 100 }}
    >
      <Suspense fallback={null}>
        <Stage
          intensity={0.5}
          environment="forest"
          shadows={false}
          adjustCamera={false}
        >
          <Mac />
        </Stage>
      </Suspense>

      <ContactShadows
        position={[0, -0.35, 0]}
        opacity={0.5}
        blur={2}
        far={4}
        resolution={128}
      />

      <OrbitControls
        enableDamping
        enablePan={false}
        enableZoom={false}
        enableRotate={!coarsePointer}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
      />
      </Canvas>
    </div>
  );
};
