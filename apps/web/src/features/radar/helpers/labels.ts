import type { PlayerInfo } from '@disa/demo-core';
import { sampleAt } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';
import type { PlateBounds } from './view';

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

/** Behind the name rather than around it: a halo, not the chip #111 shipped — DESIGN.md §6.1. */
export interface LabelColors {
  readonly halo: string;
  readonly ink: string;
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

/** What the label pass needs to know about a slot, answered by whoever is drawing the tokens. */
export interface LabelSubject {
  isNamed(slot: number): boolean;
  x(slot: number): number;
  y(slot: number): number;
  alpha(slot: number): number;
}

export interface LabelPass {
  /** Measured once per demo: a width taken against the fallback face would be wrong all match. */
  measure(context: CanvasRenderingContext2D): void;
  /**
   * The bounds are the *visible* plate rather than the canvas, and under a pan the two are not the
   * same rectangle — a name kept inside the canvas would stack against an edge the reader has
   * scrolled off the screen. The token radius arrives per draw because it follows the zoom.
   */
  draw(
    context: CanvasRenderingContext2D,
    bounds: PlateBounds,
    subject: LabelSubject,
    tokenRadius: number,
  ): void;
}

/**
 * The names beside the tokens. Everything it owns — the placer, the measured widths — outlives the
 * frame, because this runs inside a draw and nothing on the way to the canvas may allocate.
 */
export function labelPass(
  labelBySlot: readonly string[],
  slotCount: number,
  style: LabelStyle,
  colors: LabelColors,
): LabelPass {
  const placer = labelPlacer(slotCount);
  const widths = new Float32Array(slotCount);

  return {
    measure(context): void {
      context.font = style.font;

      for (let slot = 0; slot < slotCount; slot++) {
        const label = labelBySlot[slot];

        widths[slot] =
          label === undefined || label === ''
            ? 0
            : context.measureText(label).width + 2 * LABEL_HALO_PX;
      }
    },

    draw(context, bounds, subject, tokenRadius): void {
      context.font = style.font;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      // The halo is a stroke under the glyphs rather than a box behind them: a background per label
      // is ten more rectangles on a plate that now carries ten larger tokens — DESIGN.md §6.1.
      context.lineWidth = 2 * LABEL_HALO_PX;
      context.lineJoin = 'round';
      context.strokeStyle = colors.halo;
      placer.reset();

      for (let slot = 0; slot < slotCount; slot++) {
        if (!subject.isNamed(slot)) continue;

        const label = labelBySlot[slot];
        const width = sampleAt(widths, slot);
        if (label === undefined || width === 0) continue;

        // A name belongs to a token the reader can see. Without this the placer clamps the label
        // of a player the zoom has left off the plate to the nearest edge, and a panned plate grows
        // a row of names along it — DESIGN.md §6.1 puts the label beside its token or nowhere.
        const tokenX = subject.x(slot);
        const tokenY = subject.y(slot);
        if (
          tokenX < bounds.left ||
          tokenX > bounds.left + bounds.width ||
          tokenY < bounds.top ||
          tokenY > bounds.top + bounds.height
        ) {
          continue;
        }

        placer.place(tokenX, tokenY, tokenRadius, width, bounds);

        const x = placer.x + LABEL_HALO_PX;
        const y = placer.y + LABEL_HEIGHT_PX / 2;

        context.globalAlpha = subject.alpha(slot);
        context.strokeText(label, x, y);

        context.fillStyle = colors.ink;
        context.fillText(label, x, y);
      }
    },
  };
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

    place(tokenX, tokenY, tokenRadius, width, bounds): void {
      const half = width / 2;
      const gap = tokenRadius + LABEL_GAP_PX;
      const maxX = bounds.left + Math.max(bounds.width - width, 0);
      const maxY = bounds.top + Math.max(bounds.height - LABEL_HEIGHT_PX, 0);

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
        placed[offset + 3] = LABEL_HEIGHT_PX;
        count++;
      }

      placer.x = chosenX;
      placer.y = chosenY;
    },
  };

  return placer;
}
