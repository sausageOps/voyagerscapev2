import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import type { TallyState } from "./materials/palette";

/**
 * Device status resolution.
 *
 * The hero object still reports the recorder's state — that contract is
 * unchanged by the switch from the camera to the monitor. On the CRT it
 * drives the power LED's colour and nothing else: the screen belongs to the
 * archive programmes, and overloading it with app state would turn a
 * playful object into a status widget.
 */

/** Screen-reader wording only — never rendered onto the object. */
export const STATUS_TEXT: Record<TallyState, string> = {
  idle: "Idle",
  rec: "Recording",
  wait: "Encoding",
  play: "Playing back",
  err: "No input",
};

export function resolveStatus(r: RecordingState, p: AudioPlaybackState): TallyState {
  if (p === "playing") return "play";
  if (r === "recording") return "rec";
  if (r === "processing" || r === "submitting") return "wait";
  if (r === "error") return "err";
  return "idle";
}
