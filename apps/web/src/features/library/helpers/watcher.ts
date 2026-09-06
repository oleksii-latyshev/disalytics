// `features/radar` imports no other feature, so this is the downward direction hard rule 13 allows
// — the same import `DemoDialog` makes for `PlateStill`, and for the same reason: the plate's own
// marks are drawn by the plate's own code or they are a second drawing of them (#220).

import type { CanvasSize } from '@/core/renderer';
import { drawSelectionRing, drawToken, type VisionWedge } from '@/features/radar';
import { readCssToken } from '@/shared/lib';

/**
 * Where it looks with no pointer to look at: down and to the left, at the action it stands over.
 */
export const RESTING_ANGLE = (3 * Math.PI) / 4;

/** The token, at §6.3's own upper bound rather than at a size invented for this card. */
const WATCHER_RADIUS_PX = 10;

/**
 * How far the cone reaches. On the plate it is around 140px, and **that is the whole reason this
 * mark is the cone and not the token alone**: three smaller marks were built and looked at first —
 * a token with a needle in the card's corner, which reads as a switch when the needle is level and
 * as a magnifying glass when it is diagonal, and the same mark inside a round tile, which reads as
 * an icon button. A filled circle with a straight tail is an icon of something else at every angle
 * and every size that fits a corner. A cone is not, and #249 is the finding underneath that: what
 * makes this mark legible is its *area*, so it works at the size it was drawn for and at no other.
 */
const WATCHER_CONE_PX = 150;

/** Where the figure stands in the card: right side, on the middle line, clear of the column of
 * content that starts at the left edge. */
const WATCHER_INSET_PX = 44;

export interface WatcherColours {
  readonly resting: string;
  readonly lifted: string;
  readonly ring: string;
  readonly edge: string;
}

/**
 * **No data colour, and that is the whole rule for this mark.** A side's colour on a screen with no
 * sides on it is what `--color-pixel-1` and `--color-pixel-2` were minted to avoid one layer up
 * (#332), and the drag acknowledgement in this product is white by §17 rule 5. So the figure is the
 * chrome's own ink, and noticing a file is a step *up* the same ink rather than a hue.
 *
 * The ring's inner edge is the **card's** ground rather than the plate's: the mark stands on
 * `--color-surface-1` here, and that hairline exists to separate a white ring from what is under it.
 */
export function watcherColours(): WatcherColours {
  return {
    resting: readCssToken('--color-ink-dim'),
    lifted: readCssToken('--color-ink'),
    ring: readCssToken('--color-ink'),
    edge: readCssToken('--color-surface-1'),
  };
}

/**
 * A player standing on the card that takes a demo, looking wherever the pointer is.
 *
 * **The shapes are the plate's and only the pose is this card's** — which is the split
 * `plate-legend.ts` already declares for the help sheet's specimens, and it is what keeps one mark
 * from becoming two drawings of itself. The cone is drawn first and the token over it, in that
 * order, because that is the order the plate draws them in: the cone tints the ground rather than
 * the player standing in it.
 *
 * **There is no needle**, and that is §6.1's own rule rather than a simplification: the needle
 * exists because ten cones are a fog, and the cone is what the *selected* player gets. One figure
 * with a cone is the selected player. A dot with a straight tail out of it is also, at every angle,
 * an icon of something else — which is what the first three builds of this mark found out.
 */
export function drawWatcher(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  angle: number,
  isLifted: boolean,
  colours: WatcherColours,
  wedge: VisionWedge,
): void {
  const x = size.width - WATCHER_INSET_PX;
  const y = size.height / 2;
  const ink = isLifted ? colours.lifted : colours.resting;

  wedge(context, x, y, angle, WATCHER_CONE_PX, colours.lifted);
  drawToken(context, x, y, WATCHER_RADIUS_PX, ink);

  // The one stroke a token may carry, spent on the one thing this card has to acknowledge.
  if (isLifted) {
    drawSelectionRing(context, x, y, WATCHER_RADIUS_PX, colours.ring, colours.edge);
  }
}

/**
 * Where the figure stands, in the viewport. It is read off the canvas's own box and offset by the
 * same inset `drawWatcher` positions itself by — one definition, so the cone cannot point from
 * somewhere the figure is not.
 */
export interface WatcherBox {
  readonly top: number;
  readonly right: number;
  readonly height: number;
}

/** The angle from where the figure stands to a point in the viewport, which is where it looks. */
export function angleToPointer(box: WatcherBox, clientX: number, clientY: number): number {
  return Math.atan2(clientY - (box.top + box.height / 2), clientX - (box.right - WATCHER_INSET_PX));
}
