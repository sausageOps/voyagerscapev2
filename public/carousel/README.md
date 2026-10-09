# /public/carousel — TEMPORARY placeholder photography

**Status: temporary.** The repository currently ships no Voyagerscape
photography (checked 2026-10-09: the only binary assets in `/public` were
fonts, nav icons, the CRT channel videos and `mac.glb`). The homepage Flex
Carousel therefore runs on this small, consistent set of **eight
AI-generated placeholder photographs** so the carousel can be built and
reviewed without inventing unrelated imagery or depending on a remote CDN.

Each placeholder is themed on a place from the site's own route/nav-icon
vocabulary (`lib/routes.ts`, `/public/icons/nav/*`):

| File | Stand-in for | Aspect |
| --- | --- | --- |
| `vs-01-fuji.jpg` | Mt. Fuji (N_FUJI) | landscape |
| `vs-02-kujukushima.jpg` | Kujukushima islands (N_KUJUKUSHIMA) | landscape |
| `vs-03-fukuroda-falls.jpg` | Fukuroda Falls (N_FUKURODA-FALLS) | portrait |
| `vs-04-glover-garden.jpg` | Glover Garden, Nagasaki (H_GLOVERGARDEN) | landscape |
| `vs-05-london-eye.jpg` | London Eye (L_RONDONAI) | portrait |
| `vs-06-whale-tail.jpg` | Whale watching (N_WHALE-WATCHING) | landscape |
| `vs-07-camellia.jpg` | Camellia (N_TSUBAKI) | portrait |
| `vs-08-kite.jpg` | Kite flying (N_TAKOAGE) | portrait |

Consistent treatment: warm muted analog-film palette to match the site's
warm ivory frame, soft grain, no text or watermarks.

**Replacement:** when the real archive photography is available, swap the
`src`/`alt`/`title`/`subtitle` values in `components/HomeCarousel/HomeCarousel.tsx`
(pointing at new files here) and delete this set. No carousel settings need
to change: cards keep their natural aspect ratio, so any mix of portrait and
landscape photographs works.
