/**
 * CHANNEL SIGNAL
 * ==============
 *
 * A one-field mutable object shared between the DOM button and the render
 * loop. The button increments `seq`; the rig notices the number changed on
 * its next frame and starts a channel change.
 *
 * It is a ref rather than React state on purpose. State would re-render the
 * whole scene subtree on every click to deliver a single integer that only
 * `useFrame` ever reads, and it would couple the timing of a sub-second
 * hardware sequence to React's scheduler. A counter also survives two
 * clicks landing inside one frame of each other, which a boolean would
 * swallow.
 */
export interface ChannelSignal {
  seq: number;
}

export const createChannelSignal = (): ChannelSignal => ({ seq: 0 });
