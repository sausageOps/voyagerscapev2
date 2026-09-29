import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import type { TallyState } from "./materials/palette";

/**
 * Device status resolution, mirrored from `components/HomeConnect/Camera.tsx`.
 *
 * Deliberately duplicated rather than imported: Camera.tsx is the production
 * fallback and Stage 1 must not modify it for any reason, including a harmless
 * export. Ten lines is a cheap price for leaving the fallback byte-identical.
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
