import { sampleAt } from '@disa/demo-core';
import type { PlateBounds } from './view';

/** How far the name sits from the token it names, on whichever side it ends up on. */
const LABEL_GAP_PX = 4;

/**
 * Chooses where each label goes so that no two overlap — DESIGN.md §6.1 moves the label on a
 * collision, never the token. The result of the last `place` is read off `x` and `y`: this runs for
 * ten players every animation frame, so nothing here returns an object.
 */
export interface LabelPlacer {
  x: number;
  y: number;
  reset(): void;
  place(
    tokenX: number,
    tokenY: number,
    tokenRadius: number,
    width: number,
    bounds: PlateBounds,
    /** This label's own box height, for the one label that is taller than a name. */
    height?: number,
  ): void;
}

/**
 * Where a label may sit, in three rings: the four a reader expects — under the token, over it,
 * either side — then the four corners, then a second and third row above and below. **The order is
 * the point**: the cardinal four are tried first, so a label that could be placed before this is
 * placed in exactly the same box, and the outer rings are reached only by a label that would
 * otherwise have been drawn on top of another one.
 *
 * They exist because a buy phase is five players standing on one spawn point, where every cardinal
 * box of every label overlaps a neighbour's. With four positions the fifth label fell back to the
 * first and a name was drawn over a name: measured on the fixture, a buy phase buried **40% of its
 * labels at 1440×900 and 70% at 1024×800** under more than a quarter of their own area, and with
 * twelve it is **0% in every window measured**, at both viewports, with a player selected and
 * without. The rows are what does most of that work — a cluster has room above and below it and
 * almost none to either side.
 */
const CANDIDATE_COUNT = 12;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  return value > max ? max : value;
}

/**
 * The box height arrives as an argument rather than as an import from `labels`, which is where it
 * is defined: the label pass reaches for the placer, so the placer reaching back would be a cycle
 * between two siblings. Nothing here knows what a label is made of — only how tall its box is.
 *
 * The constructor's height is the ordinary one and `place` may override it for a single label. The
 * per-entry height was already stored — a placed box has always carried its own — so what this adds
 * is the *candidate* being allowed to differ, which is what lets the selected player's label carry
 * its round underneath the name without the labels around it overlapping the extra lines.
 */
export function labelPlacer(capacity: number, height: number): LabelPlacer {
  // x, y, width, height per label already placed this frame.
  const placed = new Float32Array(capacity * 4);
  const candidates = new Float32Array(CANDIDATE_COUNT * 2);
  let count = 0;

  function overlapsPlaced(x: number, y: number, width: number, boxHeight: number): boolean {
    for (let index = 0; index < count; index++) {
      const offset = index * 4;
      const otherX = sampleAt(placed, offset);
      const otherY = sampleAt(placed, offset + 1);

      if (
        x < otherX + sampleAt(placed, offset + 2) &&
        x + width > otherX &&
        y < otherY + sampleAt(placed, offset + 3) &&
        y + boxHeight > otherY
      ) {
        return true;
      }
    }

    return false;
  }

  const placer: LabelPlacer = {
    x: 0,
    y: 0,

    reset(): void {
      count = 0;
    },

    place(tokenX, tokenY, tokenRadius, width, bounds, boxHeight = height): void {
      const half = width / 2;
      const gap = tokenRadius + LABEL_GAP_PX;
      const maxX = bounds.left + Math.max(bounds.width - width, 0);
      const maxY = bounds.top + Math.max(bounds.height - boxHeight, 0);

      candidates[0] = tokenX - half;
      candidates[1] = tokenY + gap;
      candidates[2] = tokenX - half;
      candidates[3] = tokenY - gap - boxHeight;
      candidates[4] = tokenX + gap;
      candidates[5] = tokenY - boxHeight / 2;
      candidates[6] = tokenX - gap - width;
      candidates[7] = tokenY - boxHeight / 2;
      candidates[8] = tokenX + gap;
      candidates[9] = tokenY + gap;
      candidates[10] = tokenX - gap - width;
      candidates[11] = tokenY + gap;
      candidates[12] = tokenX + gap;
      candidates[13] = tokenY - gap - boxHeight;
      candidates[14] = tokenX - gap - width;
      candidates[15] = tokenY - gap - boxHeight;
      candidates[16] = tokenX - half;
      candidates[17] = tokenY + gap + boxHeight;
      candidates[18] = tokenX - half;
      candidates[19] = tokenY - gap - 2 * boxHeight;
      candidates[20] = tokenX - half;
      candidates[21] = tokenY + gap + 2 * boxHeight;
      candidates[22] = tokenX - half;
      candidates[23] = tokenY - gap - 3 * boxHeight;

      let chosenX = 0;
      let chosenY = 0;

      for (let candidate = 0; candidate < CANDIDATE_COUNT; candidate++) {
        const x = clamp(sampleAt(candidates, candidate * 2), bounds.left, maxX);
        const y = clamp(sampleAt(candidates, candidate * 2 + 1), bounds.top, maxY);

        if (candidate === 0) {
          chosenX = x;
          chosenY = y;
        }

        if (!overlapsPlaced(x, y, width, boxHeight)) {
          chosenX = x;
          chosenY = y;
          break;
        }
      }

      if (count < capacity) {
        const offset = count * 4;
        placed[offset] = chosenX;
        placed[offset + 1] = chosenY;
        placed[offset + 2] = width;
        placed[offset + 3] = boxHeight;
        count++;
      }

      placer.x = chosenX;
      placer.y = chosenY;
    },
  };

  return placer;
}
