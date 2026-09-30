import type { AudioPlaybackState, RecordingState } from "@/lib/ui-store";
import type { MachineStatus } from "./scene/MachineRig";

export const MACHINE_STATUS_TEXT: Record<MachineStatus, string> = {
  idle: "Idle and ready",
  rec: "Listening",
  wait: "Processing signal",
  play: "Playing signal",
  err: "Input unavailable",
};

export function resolveMachineStatus(recording: RecordingState, playback: AudioPlaybackState): MachineStatus {
  if (playback === "playing") return "play";
  if (recording === "recording") return "rec";
  if (recording === "processing" || recording === "submitting") return "wait";
  if (recording === "error") return "err";
  return "idle";
}
