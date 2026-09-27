/**
 * VOYAGERSCAPE — message capture service layer.
 *
 * Wraps MediaRecorder behind a stable API so the UI never touches browser
 * primitives directly. `submitRecording` is the single seam where a real
 * transport (Cloudinary / S3 / Supabase / route handler) gets attached later.
 */

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
}

export interface SubmitResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Swap this for a real uploader; the UI contract does not change. */
export type SubmitTransport = (result: RecordingResult) => Promise<SubmitResult>;

const mockTransport: SubmitTransport = async (result) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(
      `[voyagerscape] mock submit — ${(result.blob.size / 1024).toFixed(1)}kb ${result.mimeType}`,
    );
  }
  return { ok: true, id: `vs_${Date.now().toString(36)}` };
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export class MessageRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private result: RecordingResult | null = null;
  private element: HTMLAudioElement | null = null;

  constructor(private transport: SubmitTransport = mockTransport) {}

  /** 1–3: permission, stream, recording start. Also wires an analyser. */
  async recordMessage(): Promise<void> {
    if (!isRecordingSupported()) {
      throw new Error("UNSUPPORTED_BROWSER");
    }
    this.deleteRecording();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    const mimeType = pickMimeType();
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      this.audioContext = new Ctx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.72;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyser);
    }

    this.startedAt = performance.now();
    this.recorder.start(120);
  }

  /** 6: stop and resolve a previewable result. */
  stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("NOT_RECORDING"));
        return;
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        const result: RecordingResult = {
          blob,
          url: URL.createObjectURL(blob),
          mimeType,
          durationMs: performance.now() - this.startedAt,
        };
        this.result = result;
        this.releaseStream();
        resolve(result);
      };
      recorder.stop();
    });
  }

  /** 7: playback preview through a managed audio element. */
  previewRecording(onEnded?: () => void): HTMLAudioElement | null {
    if (!this.result) return null;
    if (!this.element) {
      this.element = new Audio(this.result.url);
      this.element.preload = "metadata";
    }
    this.element.onended = () => onEnded?.();
    void this.element.play().catch(() => onEnded?.());
    return this.element;
  }

  pausePreview(): void {
    this.element?.pause();
  }

  /** 8: discard and free every resource. */
  deleteRecording(): void {
    this.element?.pause();
    this.element = null;
    if (this.result) {
      URL.revokeObjectURL(this.result.url);
      this.result = null;
    }
    this.chunks = [];
    this.releaseStream();
  }

  /** 9: hand off to the pluggable transport. */
  async submitRecording(): Promise<SubmitResult> {
    if (!this.result) return { ok: false, error: "NO_RECORDING" };
    try {
      return await this.transport(this.result);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SUBMIT_FAILED" };
    }
  }

  getResult(): RecordingResult | null {
    return this.result;
  }

  /** Normalised 0–1 input level for the visualiser. */
  getLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
    }
    return Math.min(1, peak * 1.8);
  }

  elapsedMs(): number {
    return this.startedAt ? performance.now() - this.startedAt : 0;
  }

  private releaseStream(): void {
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.analyser = null;
    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }
    this.audioContext = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    this.recorder = null;
  }

  /** Full teardown on unmount. */
  dispose(): void {
    this.deleteRecording();
  }
}
