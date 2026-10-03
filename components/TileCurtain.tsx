"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import styles from "./TileCurtain.module.css";

/**
 * VERTICAL TILE CURTAIN — the Voyagerscape loading/transition surface.
 * ===================================================================
 *
 * The Animata "Vertical Tiles" preloader (animata.design/docs/preloader/
 * vertical-tiles), transposed onto this project's stack:
 *
 *   • Tile count is calculated dynamically from the viewport width
 *     (Animata: `Math.max(3, Math.floor(width / minTileWidth))`; here the
 *     target width is editorial-chunky rather than hairline, so the count
 *     reads as deliberate tiles, not stripes).
 *   • The stagger is CENTER-OUT: the tile nearest the middle moves first,
 *     the outermost tiles follow (Animata's `order = |index - center|`).
 *   • Tiles move VERTICALLY only — translateY, no scale, no rotation.
 *   • SEAM-FREE GEOMETRY, straight from the Animata reference: tiles are
 *     absolutely positioned at percentage lefts and sized one pixel
 *     WIDER than their slot (`width = 100%/count + 1px`, Animata's
 *     `width / tileCount + 1`), so every tile overlaps its neighbour by
 *     ~1px. Equal flex columns can leave subpixel hairlines between
 *     tiles (each tile rasterizes to its own device-pixel row and the
 *     rounding gaps show the page beneath); the overlap makes the
 *     curtain read as one continuous surface — stationary AND mid-
 *     animation, since translateY never disturbs the horizontal edges.
 *
 * Differences from the reference, on purpose:
 *
 *   • The count is computed once, at mount. The curtain only exists for
 *     the life of a load/transition; re-computing mid-animation would
 *     swap the very nodes GSAP is tweening. The tiles are percentage-
 *     positioned, so they keep covering the full width at any viewport
 *     size; the +1px overhang of the last tile is clipped by the row.
 *   • This component is purely presentational: it renders covered (no
 *     JS required to be covered) and lets the consumer drive GSAP on the
 *     `[data-tile]` nodes.
 *   • Before hydration (server render) it draws ONE full-cover tile in
 *     place of the row: identical solid colour, identical coverage, so
 *     the very first paint is already curtain-coloured with zero layout
 *     shift when the real tiles arrive.
 */

/** Aimed-for tile width in CSS pixels (count = viewport / this, min 3). */
const TARGET_TILE_WIDTH = 90;

/** Tile count for a viewport width — the Animata formula, coarser grain. */
export function computeTileCount(width: number): number {
  return Math.max(3, Math.round(width / TARGET_TILE_WIDTH));
}

/** useLayoutEffect that stays silent during SSR (standard iso pattern). */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function TileCurtain() {
  /* 0 → the single-tile SSR cover above; the real count lands in a layout
     effect, committed before paint and before any consumer's effects. */
  const [count, setCount] = useState(0);

  useIsoLayoutEffect(() => {
    setCount(computeTileCount(window.innerWidth));
  }, []);

  return (
    <div className={styles.row} aria-hidden="true">
      {count === 0 ? (
        <span className={styles.tileFallback} data-tile />
      ) : (
        Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={styles.tile}
            data-tile
            /* Animata's overlap geometry: percentage slot + 1px width, so
               adjacent tiles overlap and no subpixel seam can open up. */
            style={{
              left: `${(i * 100) / count}%`,
              width: `calc(${100 / count}% + 1px)`,
            }}
          />
        ))
      )}
    </div>
  );
}
