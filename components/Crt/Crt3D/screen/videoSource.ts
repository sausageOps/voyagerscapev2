/**
 * A LOCAL VIDEO AS A SCREEN SOURCE
 * ================================
 *
 * A thin wrapper around one `<video>` element whose only job is to hand
 * decoded frames to the phosphor canvas. It is NOT a player: it has no
 * controls, no sound, no UI and no presence in the layout.
 *
 * WHY IT DRAWS INTO THE CANVAS INSTEAD OF BECOMING ITS OWN TEXTURE
 * ----------------------------------------------------------------
 * The obvious route is a `THREE.VideoTexture` bound straight to the tube
 * shader's `uMap`. It is also the wrong one here, because everything that
 * makes the tube read as hardware lives downstream of the 320x240 canvas,
 * not downstream of the texture:
 *
 *   - phosphor persistence  (composited in `lighter` against the previous
 *                            painted frame — needs a frame buffer)
 *   - the channel OSD       (drawn into the raster, not over the glass)
 *   - the sync disturbance  (re-lays the raster in horizontal bands, which
 *                            a shader cannot do: it has no frame memory)
 *   - the bezel spill light (sampled from a 16x12 downscale of the canvas)
 *
 * Swapping the texture would have silently dropped all four for this one
 * channel. Blitting the video into the existing canvas instead means the
 * footage arrives at the glass having been through exactly the same
 * pipeline as the procedural programmes — same raster resolution, same
 * 24fps cadence, same persistence, same curvature, same shader. That is
 * the difference between footage ON the tube and footage IN it.
 *
 * FIT: LETTERBOX, NOT CROP
 * ------------------------
 * The aperture is 4:3 because a CRT aperture is 4:3. The clip is 16:9. It
 * is drawn CONTAINED — full frame, bars top and bottom — rather than
 * cropped to fill, for two reasons. It is what a widescreen source
 * actually did on a 4:3 set, and a cover-crop would take 17% off each
 * side, which on this clip means cutting through the HUD that lives in
 * the bottom corners. The bars are not painted: they are simply the
 * unlit-tube fill the screen system already lays down before every
 * paint, so they pick up the vignette, the raster and the glass with
 * everything else.
 *
 * PLAYBACK IS DRIVEN BY WHETHER IT IS BEING LOOKED AT
 * ---------------------------------------------------
 * `draw()` is only called while this channel is the one on screen AND the
 * hero is rendering — the canvas drops its frameloop entirely when the
 * monitor scrolls out of view or the tab is backgrounded. So rather than
 * leaving a decoder running for a picture nobody is receiving, a small
 * watchdog pauses the element as soon as frames stop being asked for, and
 * the next `draw()` starts it again. Nothing else has to know.
 */

/**
 * ASSET REVISIONS, BY CHANNEL NUMBER
 * ----------------------------------
 * A clip that is REPLACED keeps its filename, so every cache between the
 * file and the tube — the browser's HTTP cache, its separate media cache,
 * and any proxy in front of the dev server — is entitled to keep serving
 * the bytes it already has. The element makes that worse by design: it
 * sets `src` exactly once, at construction, and never re-fetches, so an
 * already-loaded page will loop the old footage indefinitely no matter
 * what is on disk.
 *
 * A revision in the query string is the cheapest fix that actually
 * guarantees the right bytes: a cache entry keyed on the old URL cannot
 * satisfy a request for the new one. The value is the commit that
 * replaced the asset, so it reads as provenance rather than as a magic
 * number, and the map only names channels whose clip has actually been
 * swapped — every other channel's URL is left exactly as it was.
 *
 * Only needed while filenames are stable across content changes. If the
 * clips ever move to content-hashed names this whole map disappears.
 */
const ASSET_REV: Record<number, string> = {
  /* Channel 01's clip was replaced in a2b82b3: it had been a duplicate of
     channel 04's NFS footage, and is now the GTA San Andreas clip. Same
     filename, completely different content — exactly the case a cache
     cannot detect on its own. */
  1: "a2b82b3",
};

/**
 * Where a channel's clip lives. All five are committed to the repository
 * and served statically from `/public/crt`, so there is no network
 * dependency, no CDN and no manifest to keep in step — the channel number
 * IS the filename, and adding a sixth is a file plus a line in the table
 * in `programmes.ts`.
 */
export const channelSrc = (n: number): string => {
  const path = `/crt/channel-${String(n).padStart(2, "0")}.mp4`;
  const rev = ASSET_REV[n];
  return rev ? `${path}?v=${rev}` : path;
};

/** Channel 01's source, and the constructor's default. */
export const CHANNEL_01_SRC = channelSrc(1);

/**
 * Gestures allowed to retry a blocked autoplay. A muted, inline video is
 * permitted to start on its own under every current policy, but a user
 * who has hard-disabled autoplay still gets the picture on first contact
 * with the page rather than a dead channel.
 */
const RESUME_EVENTS = ["pointerdown", "touchstart", "keydown"] as const;

/** `HAVE_CURRENT_DATA` — there is a frame at the current position. */
const HAVE_CURRENT_DATA = 2;

/** How long after the last requested frame the decoder is stood down. */
const IDLE_PAUSE_MS = 420;
const WATCHDOG_MS = 500;

export class VideoSource {
  private el: HTMLVideoElement | null = null;
  /**
   * Bumped by every change of intent. A `play()` promise that rejects
   * carrying a stale token was cancelled by us (pausing a pending play
   * rejects it with an AbortError) rather than refused by the browser,
   * and must NOT be mistaken for a blocked autoplay.
   */
  private gen = 0;
  private resumeHandler: (() => void) | null = null;
  private watchdog: number | null = null;

  /** True once at least one decoded frame has reached the canvas. */
  private painted = false;
  /** Media time of the last frame drawn, for change detection. */
  private lastTime = -1;
  /** Wall clock of the last `draw()`, for the idle watchdog. */
  private lastDraw = 0;
  /** What playback state the caller has asked for. */
  private wantPlay = false;
  private disposed = false;

  constructor(src: string = CHANNEL_01_SRC) {
    if (typeof document === "undefined") return;

    const el = document.createElement("video");
    /* Attributes AND properties: Safari reads some of these off the
       attribute at load time, and the inline/muted pair has to be true
       before the first `play()` or iOS refuses it outright. */
    el.muted = true;
    el.defaultMuted = true;
    el.loop = true;
    el.autoplay = true;
    el.playsInline = true;
    el.controls = false;
    el.preload = "auto";
    el.setAttribute("muted", "");
    el.setAttribute("loop", "");
    el.setAttribute("autoplay", "");
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    if ("disablePictureInPicture" in el) el.disablePictureInPicture = true;
    if ("disableRemotePlayback" in el) {
      (el as HTMLVideoElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;
    }

    /* OUT OF THE LAYOUT, BUT IN THE DOCUMENT.
       `display:none` and `visibility:hidden` are both grounds for a
       browser to refuse to decode, and a detached element is refused by
       some mobile Safari builds — so it is parented, fixed, one pixel and
       fully transparent. It is out of flow, so it cannot touch the page
       layout, and `pointer-events:none` keeps it out of the hit test the
       custom cursor runs. */
    el.style.cssText =
      "position:fixed;left:0;bottom:0;width:1px;height:1px;min-width:0;min-height:0;" +
      "opacity:0;pointer-events:none;border:0;z-index:-1;";

    el.src = src;
    document.body.appendChild(el);
    el.load();

    this.el = el;
    this.lastDraw = performance.now();
    this.wantPlay = true;
    this.apply();
  }

  /** True when a decoded frame is available to blit. */
  ready(): boolean {
    const el = this.el;
    return !!el && el.readyState >= HAVE_CURRENT_DATA && el.videoWidth > 0;
  }

  /**
   * True when the canvas would be out of date — used by the screen system
   * to grant a repaint under reduced motion, where the raster is painted
   * once and then left alone. Without it the held frame would be whatever
   * the tube had before the clip finished decoding, which is black.
   */
  dirty(): boolean {
    if (!this.ready()) return false;
    if (!this.painted) return true;
    return this.el!.currentTime !== this.lastTime;
  }

  /** Ask for playback. Idempotent; only acts on a change. */
  setPlaying(on: boolean) {
    if (this.disposed || this.wantPlay === on) return;
    this.wantPlay = on;
    this.apply();
  }

  /** Back to the top of the clip. Called when the channel is selected. */
  rewind() {
    const el = this.el;
    if (!el) return;
    try {
      el.currentTime = 0;
    } catch {
      /* not seekable yet; it is already at zero */
    }
  }

  /**
   * Blit the current frame, contained and centred, into the raster.
   * Returns false if there is nothing decoded yet, so the caller can put
   * something else on the tube in the meantime.
   */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
    this.lastDraw = performance.now();
    const el = this.el;
    if (!el || !this.ready()) return false;

    const scale = Math.min(w / el.videoWidth, h / el.videoHeight);
    const dw = Math.round(el.videoWidth * scale);
    const dh = Math.round(el.videoHeight * scale);
    const dx = Math.round((w - dw) / 2);
    const dy = Math.round((h - dh) / 2);

    /* The screen system paints with smoothing OFF, because the procedural
       programmes are authored on a hard pixel grid and must never be
       resampled. Photographic frames are the opposite case: nearest
       neighbour on a 2:1 downscale aliases the HUD into crawling noise.
       Enabled for this one blit and handed straight back. */
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(el, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = smoothing;

    this.painted = true;
    this.lastTime = el.currentTime;
    return true;
  }

  dispose() {
    this.disposed = true;
    this.wantPlay = false;
    this.gen += 1;
    this.stopWatchdog();
    this.disarmResume();
    const el = this.el;
    this.el = null;
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
    el.remove();
  }

  /* --------------------------------------------------------- internals -- */

  /** Reconcile the element with what the caller has asked for. */
  private apply() {
    const el = this.el;
    if (!el) return;
    const token = (this.gen += 1);

    if (!this.wantPlay) {
      /* Pausing a pending `play()` rejects that promise; the token above
         has already invalidated it, so the rejection is swallowed rather
         than read as the browser refusing us. */
      el.pause();
      this.stopWatchdog();
      return;
    }

    this.startWatchdog();
    if (!el.paused) return;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        /* Superseded by a later request — not a refusal. */
        if (token !== this.gen || !this.wantPlay) return;
        /* Genuinely blocked. Not worth logging at the user: wait for the
           first gesture and try once more. */
        this.armResume();
      });
    }
  }

  /**
   * Stands the decoder down when frames stop being asked for — the
   * channel changed, the hero scrolled out of view, or the tab went to
   * the background, all of which simply stop calling `draw()`. Only runs
   * while playback is wanted, so it cannot outlive the picture.
   */
  private startWatchdog() {
    if (this.watchdog !== null || typeof window === "undefined") return;
    this.watchdog = window.setInterval(() => {
      if (!this.wantPlay) return;
      if (performance.now() - this.lastDraw > IDLE_PAUSE_MS) this.setPlaying(false);
    }, WATCHDOG_MS);
  }

  private stopWatchdog() {
    if (this.watchdog === null || typeof window === "undefined") return;
    window.clearInterval(this.watchdog);
    this.watchdog = null;
  }

  private armResume() {
    if (this.resumeHandler || typeof window === "undefined") return;
    const handler = () => {
      this.disarmResume();
      if (this.wantPlay) this.apply();
    };
    this.resumeHandler = handler;
    for (const name of RESUME_EVENTS) {
      window.addEventListener(name, handler, { once: true, passive: true });
    }
  }

  private disarmResume() {
    const handler = this.resumeHandler;
    if (!handler || typeof window === "undefined") return;
    this.resumeHandler = null;
    for (const name of RESUME_EVENTS) window.removeEventListener(name, handler);
  }
}
