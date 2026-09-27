"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type VisualMode = "normal" | "bw" | "negative";
export type RecordingState =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "ready"
  | "submitting"
  | "sent"
  | "error";
export type AudioPlaybackState = "stopped" | "playing" | "paused";

/** Single source of truth for transient UI state (never content state). */
export interface UIState {
  terminalOpen: boolean;
  mobileMenuOpen: boolean;
  visualMode: VisualMode;
  recorderOpen: boolean;
  recordingState: RecordingState;
  audioPlaybackState: AudioPlaybackState;
  loaded: boolean;
}

type Action =
  | { type: "terminal"; open: boolean }
  | { type: "mobileMenu"; open: boolean }
  | { type: "visualMode"; mode: VisualMode }
  | { type: "recorder"; open: boolean }
  | { type: "recordingState"; state: RecordingState }
  | { type: "playback"; state: AudioPlaybackState }
  | { type: "loaded" };

const initialState: UIState = {
  terminalOpen: false,
  mobileMenuOpen: false,
  visualMode: "normal",
  recorderOpen: false,
  recordingState: "idle",
  audioPlaybackState: "stopped",
  loaded: false,
};

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case "terminal":
      return { ...state, terminalOpen: action.open };
    case "mobileMenu":
      return { ...state, mobileMenuOpen: action.open };
    case "visualMode":
      return { ...state, visualMode: action.mode };
    case "recorder":
      return { ...state, recorderOpen: action.open };
    case "recordingState":
      return { ...state, recordingState: action.state };
    case "playback":
      return { ...state, audioPlaybackState: action.state };
    case "loaded":
      return { ...state, loaded: true };
    default:
      return state;
  }
}

interface UIContextValue extends UIState {
  setTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setVisualMode: (mode: VisualMode) => void;
  setRecorderOpen: (open: boolean) => void;
  setRecordingState: (state: RecordingState) => void;
  setPlaybackState: (state: AudioPlaybackState) => void;
  markLoaded: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<UIContextValue>(
    () => ({
      ...state,
      setTerminalOpen: (open: boolean) => dispatch({ type: "terminal", open }),
      toggleTerminal: () => dispatch({ type: "terminal", open: !state.terminalOpen }),
      setMobileMenuOpen: (open: boolean) => dispatch({ type: "mobileMenu", open }),
      setVisualMode: (mode: VisualMode) => dispatch({ type: "visualMode", mode }),
      setRecorderOpen: (open: boolean) => dispatch({ type: "recorder", open }),
      setRecordingState: (s: RecordingState) => dispatch({ type: "recordingState", state: s }),
      setPlaybackState: (s: AudioPlaybackState) => dispatch({ type: "playback", state: s }),
      markLoaded: () => dispatch({ type: "loaded" }),
    }),
    [state],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
