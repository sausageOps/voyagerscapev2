"use client";

import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import Explorer from "./Explorer";

export interface HeroObjectProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  level: number;
  onShutter: () => void;
}

/**
 * Branch-only central hero experiment.
 *
 * The surrounding homepage, recorder contract, capability fallback and global
 * motion/cursor systems remain untouched. Explorer owns its restrained
 * observation state while forwarding an activation to the existing hero
 * action so the public component contract does not change.
 */
export default function HeroObject({ onShutter }: HeroObjectProps) {
  return <Explorer onObserve={onShutter} />;
}
