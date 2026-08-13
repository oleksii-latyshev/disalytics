import type { PlayerInfo } from '@disa/demo-core';
import { sampleAt } from '@disa/demo-core';
import type { CanvasSize } from '@/core/renderer';
import { readCssToken } from '@/shared/lib';

/** DESIGN.md §6.1 — Roboto Condensed 10px, which is what `--font-narrow` resolves to. */
const LABEL_SIZE_PX = 10;

/**
 * How far the halo reaches past the glyphs. It is ink like the text is, so the box the placer keeps
 * clear of its neighbours includes it — DESIGN.md §6.1 replaced the chip with this.
 */
export const LABEL_HALO_PX = 2;
export const LABEL_HEIGHT_PX = LABEL_SIZE_PX + 2 * LABEL_HALO_PX;

/** How far the name sits from the token it names, on whichever side it ends up on. */
const LABEL_GAP_PX = 4;

/**
 * A nick long enough to cover a bombsite stops being a label. The rails carry the full name, which
 * is what `CODE_REQUIREMENTS.md` §10 asks of a truncation.
 */
const MAX_LABEL_CHARS = 14;

export interface LabelStyle {
  readonly font: string;
}

export function readLabelStyle(): LabelStyle {
  return { font: `${LABEL_SIZE_PX}px ${readCssToken('--font-narrow')}` };
}

function shorten(name: string): string {
  const characters = [...name];

  return characters.length <= MAX_LABEL_CHARS
    ? name
    : `${characters.slice(0, MAX_LABEL_CHARS - 1).join('')}…`;
}

/** The text drawn beside each token, indexed by slot. An unnamed slot holds an empty string. */
export function labelsBySlot(players: readonly PlayerInfo[], slotCount: number): readonly string[] {
  const labels: string[] = new Array(slotCount).fill('');

  for (const player of players) {
    if (player.slot < slotCount) labels[player.slot] = shorten(player.name);
  }

  return labels;
}

/**
 * Chooses where each label goes so that no two overlap — DESIGN.md §6.1 moves the label on a
 * collision, never the token. The result of the last `place` is read off `x` and `y`: this runs for
 * ten players every animation frame, so nothing here returns an object.
 */
export interface LabelPlacer {
  x: number;
  y: number;
  reset(): void;
  place(tokenX: number, tokenY: number, tokenRadius: number, width: number, size: CanvasSize): void;
}

const CANDIDATE_COUNT = 4;

function clamp(value: number, limit: number): number {
  if (value < 0) return 0;

  return value > limit ? limit : value;
}

export function labelPlacer(capacity: number): LabelPlacer {
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
        y + LABEL_HEIGHT_PX > otherY
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

    place(tokenX, tokenY, tokenRadius, width, size): void {
      const half = width / 2;
      const gap = tokenRadius + LABEL_GAP_PX;
      const maxX = Math.max(size.width - width, 0);
      const maxY = Math.max(size.height - LABEL_HEIGHT_PX, 0);

      candidates[0] = tokenX - half;
      candidates[1] = tokenY + gap;
      candidates[2] = tokenX - half;
      candidates[3] = tokenY - gap - LABEL_HEIGHT_PX;
      candidates[4] = tokenX + gap;
      candidates[5] = tokenY - LABEL_HEIGHT_PX / 2;
      candidates[6] = tokenX - gap - width;
      candidates[7] = tokenY - LABEL_HEIGHT_PX / 2;

      let chosenX = 0;
      let chosenY = 0;

      for (let candidate = 0; candidate < CANDIDATE_COUNT; candidate++) {
        const x = clamp(sampleAt(candidates, candidate * 2), maxX);
        const y = clamp(sampleAt(candidates, candidate * 2 + 1), maxY);

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
        placed[offset + 3] = LABEL_HEIGHT_PX;
        count++;
      }

      placer.x = chosenX;
      placer.y = chosenY;
    },
  };

  return placer;
}
