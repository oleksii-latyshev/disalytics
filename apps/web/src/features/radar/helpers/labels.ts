import type { WeaponClass, WeaponIconId } from '@disa/demo-core';
import { sampleAt } from '@disa/demo-core';
import { damagePass } from './damage-pass';
import { drawWeaponMark } from './equipment-marks';
import {
  DETAIL_LEAD_PX,
  haloStroke,
  isOnPlate,
  LABEL_HALO_PX,
  LABEL_HEIGHT_PX,
  type LabelStyle,
  WEAPON_BOX_PX,
} from './label-box';
import { labelPlacer } from './label-placer';
import type { LabelSubject } from './label-subject';
import { drawLeaderLine, leaderStroke } from './leader-line';
import type { PlateBounds } from './view';

export type { LabelStyle } from './label-box';
/* The names beside the tokens on the plate, and what the two other label modules are for.
   `label-box.ts` is every size and box a label is made of, `damage-pass.ts` is the hit's figure —
   the second consumer of this pass's placer — and `label-subject.ts` is what all three are told
   about the frame. This file re-exports what it exported before the split, so nothing outside
   `features/radar/helpers` changed an import. */
export { LABEL_HEIGHT_PX, readLabelStyle } from './label-box';
export type { LabelSubject } from './label-subject';
export { labelsBySlot } from './label-subject';

/** Behind the name rather than around it: a halo, not the chip #111 shipped — DESIGN.md §6.1. */
export interface LabelColors {
  readonly halo: string;
  readonly ink: string;
  /** What a hit took, beside the token that took it — the same token the flash on it is drawn in. */
  readonly damage: string;
  /**
   * The hairline back to the token, for a name the placer had to put outside the four boxes
   * "beside" used to mean. It is a mark and nothing on it is read aloud, which is what lets it sit
   * at the ink §14 keeps for marks — a line loud enough to be found by following it from a name is
   * a line loud enough to be mistaken for something the map is telling you.
   */
  readonly leader: string;
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
  // Two boxes a slot, not one: a hit puts a figure beside a name, and a placer told to hold ten
  // boxes stops keeping track after the tenth — the eleventh is then placed against nothing and
  // lands on whatever is already there.
  const placer = labelPlacer(slotCount * 2, LABEL_HEIGHT_PX);
  const widths = new Float32Array(slotCount);

  /* Where each name went this frame — x, y, width, height a slot — and whether the placer had to
     reach outside the cardinal four to put it there. The names are placed in one pass and written
     in another, with the leader lines between the two: a line drawn as its own name was written
     would be laid over every name placed after it, and a hairline crossing a nickname is a worse
     defect than the one this fixes. Owned by the pass and rewritten in place, because this runs
     inside a draw. */
  const boxes = new Float32Array(slotCount * 4);
  const hasBox = new Uint8Array(slotCount);
  const isDisplaced = new Uint8Array(slotCount);

  /* The hit's figure, sharing this pass's placer so that every name is placed before any figure —
     which is what makes a figure give way to a name rather than the other way round. */
  const damage = damagePass(placer, style, colors.damage);

  /* The detail character width for the mono face, measured once in `measure` below. Monospace
     characters have uniform advance width, which lets us compute any line width in O(1) without
     calling `measureText` per frame or allocating `TextMetrics` inside a draw. */
  let detailCharWidth = 0;

  function detailLineWidth(line: string): number {
    return line.length * detailCharWidth + WEAPON_BOX_PX + 2 * LABEL_HALO_PX;
  }

  /** One placed label: the mark it leads with, then the name, both over the same halo. */
  function write(
    context: CanvasRenderingContext2D,
    boxX: number,
    boxY: number,
    label: string,
    weapon: WeaponClass | null,
    icon: WeaponIconId | undefined,
    detail: string | null,
    detailExtra: string | null,
  ): void {
    const x = boxX + LABEL_HALO_PX;
    const y = boxY + LABEL_HEIGHT_PX / 2;

    // The mark leads the name rather than trailing it, and is right-aligned in a box the name
    // always starts after, so ten labels line their weapons up in one column — DESIGN.md §6.1.
    if (weapon !== null) drawWeaponMark(context, x, y, weapon, icon, colors.ink);

    context.strokeText(label, x + WEAPON_BOX_PX, y);

    context.fillStyle = colors.ink;
    context.fillText(label, x + WEAPON_BOX_PX, y);

    if (detail === null && detailExtra === null) return;

    // The detail line(s), under the name that owns them. Set in the mono face and one rank down,
    // so the name is still what the label reads as — and they go through the same halo and ink.
    context.font = style.detailFont;
    if (detail !== null) {
      context.strokeText(detail, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX);
      context.fillText(detail, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX);
    }
    if (detailExtra !== null) {
      context.strokeText(detailExtra, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX * 2);
      context.fillText(detailExtra, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX * 2);
    }
    context.font = style.font;
  }

  let detailLines = 0;
  let detailBlockWidth = 0;

  function measureDetailLines(detail: string | null, detailExtra: string | null): void {
    detailLines = 0;
    detailBlockWidth = 0;
    if (detail !== null) {
      detailLines++;
      detailBlockWidth = Math.max(detailBlockWidth, detailLineWidth(detail));
    }
    if (detailExtra !== null) {
      detailLines++;
      detailBlockWidth = Math.max(detailBlockWidth, detailLineWidth(detailExtra));
    }
  }

  /**
   * One slot's whole label: whether it gets one at all, how big its box is, and where the placer
   * put it. It is its own function rather than the body of the loop below because the decision has
   * five arms — unnamed, unmeasured, off the plate, with a round and without — and `draw` is what
   * the frame budget is read against, so it stays a loop and a call.
   */
  function place(
    slot: number,
    bounds: PlateBounds,
    subject: LabelSubject,
    tokenRadius: number,
  ): void {
    hasBox[slot] = 0;

    if (!subject.isNamed(slot)) return;

    const label = labelBySlot[slot];
    const width = sampleAt(widths, slot);
    if (label === undefined || width === 0) return;

    // A name belongs to a token the reader can see. Without this the placer clamps the label of a
    // player the zoom has left off the plate to the nearest edge, and a panned plate grows a row of
    // names along it — DESIGN.md §6.1 puts the label beside its token or nowhere.
    const tokenX = subject.x(slot);
    const tokenY = subject.y(slot);
    if (!isOnPlate(tokenX, tokenY, bounds)) return;

    // The selected player's label can carry one or two detail lines (keys/speed and pitch),
    // so the placer keeps its neighbours clear of the full block rather than of the name alone.
    const detail = subject.detail(slot);
    const detailExtra = subject.detailExtra?.(slot) ?? null;
    measureDetailLines(detail, detailExtra);

    const boxWidth = detailLines === 0 ? width : Math.max(width, detailBlockWidth);
    const boxHeight = LABEL_HEIGHT_PX + DETAIL_LEAD_PX * detailLines;

    placer.place(tokenX, tokenY, tokenRadius, boxWidth, bounds, boxHeight);

    const offset = slot * 4;
    boxes[offset] = placer.x;
    boxes[offset + 1] = placer.y;
    boxes[offset + 2] = boxWidth;
    boxes[offset + 3] = boxHeight;
    hasBox[slot] = 1;
    isDisplaced[slot] = placer.isDisplaced ? 1 : 0;
  }

  /**
   * The hairline back to the token, for every name the placer could not put beside one. It is the
   * answer to what a name two rows out belongs to: in a spawn cluster five names stack into a
   * column beside five tokens twenty pixels apart, and until the line was drawn nothing on the
   * plate said which name went with which player.
   *
   * Only a name gets one. The hit's figure is placed by the same placer and is displaced more
   * often, and it needs no line because it already has a tie the name does not: the token it
   * belongs to is flashing in the same colour on the same frame.
   */
  function drawLeaders(
    context: CanvasRenderingContext2D,
    subject: LabelSubject,
    tokenRadius: number,
  ): void {
    leaderStroke(context, colors.leader);
    context.globalAlpha = 1;

    for (let slot = 0; slot < slotCount; slot++) {
      if (hasBox[slot] === 0 || isDisplaced[slot] === 0) continue;

      const offset = slot * 4;
      drawLeaderLine(
        context,
        subject.x(slot),
        subject.y(slot),
        tokenRadius,
        sampleAt(boxes, offset),
        sampleAt(boxes, offset + 1),
        sampleAt(boxes, offset + 2),
        sampleAt(boxes, offset + 3),
      );
    }

    // The halo the names are about to be written through, which the lines above stroked over.
    haloStroke(context, colors.halo);
  }

  /** Every placed name, written after every line, so no line is laid over a name. */
  function writeNames(context: CanvasRenderingContext2D, subject: LabelSubject): void {
    context.globalAlpha = 1;

    for (let slot = 0; slot < slotCount; slot++) {
      if (hasBox[slot] === 0) continue;

      const label = labelBySlot[slot];
      if (label === undefined) continue;

      const offset = slot * 4;
      write(
        context,
        sampleAt(boxes, offset),
        sampleAt(boxes, offset + 1),
        label,
        subject.weapon(slot),
        subject.icon(slot),
        subject.detail(slot),
        subject.detailExtra?.(slot) ?? null,
      );
    }
  }

  return {
    measure(context): void {
      context.font = style.font;

      for (let slot = 0; slot < slotCount; slot++) {
        const label = labelBySlot[slot];

        widths[slot] =
          label === undefined || label === ''
            ? 0
            : WEAPON_BOX_PX + context.measureText(label).width + 2 * LABEL_HALO_PX;
      }

      context.font = style.detailFont;
      detailCharWidth = context.measureText('0').width;

      damage.measure(context);
    },

    draw(context, bounds, subject, tokenRadius): void {
      context.font = style.font;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      // The halo is a stroke under the glyphs rather than a box behind them: a background per label
      // is ten more rectangles on a plate that now carries ten larger tokens — DESIGN.md §6.1. It is
      // set once for the whole pass, and the weapon mark strokes with it too.
      haloStroke(context, colors.halo);
      placer.reset();

      for (let slot = 0; slot < slotCount; slot++) {
        place(slot, bounds, subject, tokenRadius);
      }

      drawLeaders(context, subject, tokenRadius);
      writeNames(context, subject);

      for (let slot = 0; slot < slotCount; slot++) {
        damage.place(context, slot, bounds, subject, tokenRadius);
      }
    },
  };
}
