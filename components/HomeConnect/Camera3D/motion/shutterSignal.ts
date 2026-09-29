/**
 * SHUTTER SIGNAL
 * ==============
 *
 * A one-field mutable object shared between the DOM button and the render
 * loop. The button increments `seq`; the rig notices the number changed on
 * its next frame and starts the actuation.
 *
 * It is a ref rather than React state on purpose. State would re-render the
 * whole scene subtree on every click to deliver a single integer that only
 * `useFrame` ever reads, and it would couple the timing of a 90ms mechanical
 * sequence to React's scheduler. A counter also survives clicks that land
 * inside one frame of each other, which a boolean flag would swallow.
 */
export interface ShutterSignal {
  seq: number;
}

export const createShutterSignal = (): ShutterSignal => ({ seq: 0 });
