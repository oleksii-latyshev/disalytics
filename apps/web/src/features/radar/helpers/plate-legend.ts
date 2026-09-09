import type { PlateMark } from './legend-box';
import { EVENT_MARKS } from './legend-event-marks';
import { TOKEN_MARKS } from './legend-token-marks';

export { MARK_HEIGHT_PX, MARK_WIDTH_PX, type PlateMark, type PlateMarkId } from './legend-box';

/**
 * Every mark the plate draws, drawn by the plate's own functions — `docs/DESIGN.md` §10.6. A legend
 * written by hand drifts from the renderer within two issues, so **nothing in this trio decides what
 * a mark looks like**: the colour comes off `RadarColors`, the geometry and the opacity out of the
 * same `tokens`, `grenades` and `kill-line` helpers the layers call, and all either list chooses is
 * where in the swatch a mark sits and how far through its own life it is caught.
 *
 * The two lists are split the way the plate's own layers are — what belongs to a *player* against
 * what records an *event* — and this file is the order they are read in. That order is the whole of
 * what it decides, which is why the split is safe: `TOKEN_MARKS` and `EVENT_MARKS` were contiguous
 * runs of one array before it.
 *
 * The vision wedge is the one mark of §6.1 with no entry, and the reason is the swatch rather than
 * the renderer — #249 settled that after building it. Nothing stands in the way of drawing it: #232
 * made `visionWedge()` a factory that owns its own gradient cache, so the sheet can hold one of its
 * own and the token layer's is untouched. **The cone is unreadable at this size**, because what
 * makes it legible on the plate is area and not ink: it is painted at α0.15 fading to nothing over
 * its whole radius, which is around 140px there and 18 here — a sixtieth of the area. Measured in
 * the built sheet, the swatch reaches α0.063 at 10px from the token and α0.031 at 14, over
 * `--color-surface-0` and over a mid-grey alike, and a reader sees a token beside an empty box.
 * The alternative is this file choosing an opacity, which is the one thing it may not do. So the
 * entry for a selected player names the cone in words, and the words carry no number that could go
 * stale.
 */
export const PLATE_MARKS: readonly PlateMark[] = [...TOKEN_MARKS, ...EVENT_MARKS];
