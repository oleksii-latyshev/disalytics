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
  ): void;
}

const CANDIDATE_COUNT = 4;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  return value > max ? max : value;
}

/**
 * The box height arrives as an argument rather than as an import from `labels`, which is where it
 * is defined: the label pass reaches for the placer, so the placer reaching back would be a cycle
 * between two siblings. Nothing here knows what a label is made of — only how tall its box is.
 */
export function labelPlacer(capacity: number, height: number): LabelPlacer {
  // x, y, width, height per label already placed this frame.
  const placed = new Float32Array(capacity * 4);
  const candidates = new Float32Array(CANDIDATE_COUNT * 2);
  let count = 0;

  function overlapsPlaced(x: number, y: number, width: number): boolean {
    for (let index = 0; index < count; index++) {
      const offset = index * 4;
      const otherX = sampleAt(placed, offset);
      const otherY = sampleAt(placed, offset + 1);

      if (
        x < otherX + sampleAt(placed, offset + 2) &&
        x + width > otherX &&
        y < otherY + sampleAt(placed, offset + 3) &&
        y + height > otherY
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

    place(tokenX, tokenY, tokenRadius, width, bounds): void {
      const half = width / 2;
      const gap = tokenRadius + LABEL_GAP_PX;
      const maxX = bounds.left + Math.max(bounds.width - width, 0);
      const maxY = bounds.top + Math.max(bounds.height - height, 0);

      candidates[0] = tokenX - half;
      candidates[1] = tokenY + gap;
      candidates[2] = tokenX - half;
      candidates[3] = tokenY - gap - height;
      candidates[4] = tokenX + gap;
      candidates[5] = tokenY - height / 2;
      candidates[6] = tokenX - gap - width;
      candidates[7] = tokenY - height / 2;

      let chosenX = 0;
      let chosenY = 0;

      for (let candidate = 0; candidate < CANDIDATE_COUNT; candidate++) {
        const x = clamp(sampleAt(candidates, candidate * 2), bounds.left, maxX);
        const y = clamp(sampleAt(candidates, candidate * 2 + 1), bounds.top, maxY);

        if (candidate === 0) {
          chosenX = x;
          chosenY = y;
        }

        if (!overlapsPlaced(x, y, width)) {
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
        placed[offset + 3] = height;
        count++;
      }

      placer.x = chosenX;
      placer.y = chosenY;
    },
  };

  return placer;
}
