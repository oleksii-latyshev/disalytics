import type { PlayerInfo, WeaponClass, WeaponIconId } from '@disa/demo-core';
import { sampleAt } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';
import { damageFigure, drawDamageFigure } from './damage-figure';
import { drawWeaponMark, WEAPON_MARK_PX } from './equipment-marks';
import { labelPlacer } from './label-placer';
import type { PlateBounds } from './view';

/**
 * The size a name is set at on the plate, and it is §3's scale rather than a number of its own: the
 * same size §5.3's team row sets the same name at, so one nickname is one size wherever the screen
 * says it.
 *
 * It was 10 until this, chosen against a condensed face the product no longer has, and 10 is the
 * step §3 opens up the most because it is the step meant for a label nobody reads twice. A name
 * beside a moving token is read at a glance from a normal viewing distance, which is the opposite
 * demand, and at 10px the owner could not tell one player from another without zooming the browser.
 *
 * §3 attaches optical tracking to each step and this canvas applies none, which is worth stating so
 * the next reader does not have to work out whether it was forgotten: it was measured and left
 * alone. The step asks for 0.005em here, which is 0.065px a character — 0.9px across the longest
 * name this draws, and below the pixel the canvas would place it on. At the 10px this replaces the
 * same rule asked for four times as much, so the size that needs the tracking least is the one the
 * plate now sets.
 */
export const LABEL_SIZE_PX = 13;

/**
 * How far the halo reaches past the glyphs. It is ink like the text is, so the box the placer keeps
 * clear of its neighbours includes it — DESIGN.md §6.1 replaced the chip with this.
 *
 * **It stays 2 while the type grows**, and that is a decision rather than an oversight. The halo is
 * a device for holding a glyph off a bright plate pixel, not a proportion of the type: a 4px stroke
 * laid under 10px text was already close to closing the counters in `e` and `o`, and the same
 * stroke under 13px text leaves them further open. Scaling it with the size would have taken back
 * some of the legibility the size was raised for.
 */
export const LABEL_HALO_PX = 2;
export const LABEL_HEIGHT_PX = LABEL_SIZE_PX + 2 * LABEL_HALO_PX;

/**
 * Between the weapon mark and the name it leads, tight enough that the two read as one label — and
 * it stays 3px while the type grows, because what closes it into one shape is the halo rather than
 * the proportion: a 2px stroke reaches 2px from each side, and a gap it can cover at 10px it covers
 * at 13px.
 */
const WEAPON_GAP_PX = 3;

/**
 * The mark's box is reserved for every named slot, whether or not a mark goes in it. A width that
 * followed the weapon would move the name sideways every time its player switched, and would change
 * which labels collide from one frame to the next — the placer is allowed to depend on the frame,
 * but a reader should not have to watch a name twitch to learn that somebody drew a knife.
 */
const WEAPON_BOX_PX = WEAPON_MARK_PX + WEAPON_GAP_PX;

/**
 * A nick long enough to cover a bombsite stops being a label. The rails carry the full name, which
 * is what `CODE_REQUIREMENTS.md` §10 asks of a truncation.
 */
const MAX_LABEL_CHARS = 14;

export interface LabelStyle {
  readonly font: string;
  /** One rank down for the round's numbers, so the name stays the label's first reading. */
  readonly detailFont: string;
  /**
   * The hit's figure, at the name's own size in the mono face: every number in the product is
   * tabular, and this one is read at a glance beside a token rather than under a name.
   */
  readonly damageFont: string;
}

/** Behind the name rather than around it: a halo, not the chip #111 shipped — DESIGN.md §6.1. */
export interface LabelColors {
  readonly halo: string;
  readonly ink: string;
  /** What a hit took, beside the token that took it — the same token the flash on it is drawn in. */
  readonly damage: string;
}

/**
 * The detail is set in the mono face, because every number in the product is tabular, and one rank
 * down §3's scale from the name so that the name is still what the label reads as.
 */
const DETAIL_SIZE_PX = 12;

/** How far the round's line sits under the name it belongs to — the name's own size. */
const DETAIL_LEAD_PX = LABEL_SIZE_PX;

export function readLabelStyle(): LabelStyle {
  return {
    font: `${LABEL_SIZE_PX}px ${readCssToken('--font-ui')}`,
    detailFont: `${DETAIL_SIZE_PX}px ${readCssToken('--font-mono')}`,
    damageFont: `${LABEL_SIZE_PX}px ${readCssToken('--font-mono')}`,
  };
}

/**
 * The halo the label and its weapon mark share — a stroke laid under the glyphs rather than a box
 * behind them. Both callers take it from here, so §10.6's legend cannot draw a lighter or heavier
 * halo than the plate does.
 */
export function haloStroke(context: CanvasRenderingContext2D, halo: string): void {
  context.lineWidth = 2 * LABEL_HALO_PX;
  context.lineJoin = 'round';
  context.strokeStyle = halo;
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
  /** What the slot is holding this frame, or `null` where no sample ever saw it holding anything. */
  weapon(slot: number): WeaponClass | null;
  /**
   * The model of what it is holding, where the match's own weapon table names one. Utility, the
   * bomb and a weapon nobody here has drawn all answer `undefined` and are drawn by their class.
   */
  icon(slot: number): WeaponIconId | undefined;
  /**
   * The round's numbers for this slot, already formatted and translated, or `null` for every slot
   * that is not the selected one. It arrives as a finished string because a canvas cannot reach the
   * message catalogue and a draw may not allocate one.
   */
  detail(slot: number): string | null;
  /** What this slot has just taken, in whole health, or 0 where it has taken nothing lately. */
  damage(slot: number): number;
  /** How much of that figure's life is left — 1 while it holds, 0 once it has gone. */
  damageLife(slot: number): number;
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

/** Whether a token is inside the rectangle the reader is actually looking at. */
function isOnPlate(x: number, y: number, bounds: PlateBounds): boolean {
  return (
    x >= bounds.left &&
    x <= bounds.left + bounds.width &&
    y >= bounds.top &&
    y <= bounds.top + bounds.height
  );
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

  /* The figure's face is tabular, so a width is its digit count rather than a measurement: one
     `measureText` in `measure` below answers for all thousand readings, where measuring each would
     have been a thousand `TextMetrics` for a number that is three characters long. */
  let digitWidth = 0;

  /* The detail's width, cached against the string it was measured from. It cannot join `widths`
     above — those are measured once per demo, and this changes every round — and it may not be
     measured per frame either, because `measureText` returns a `TextMetrics` and this runs inside a
     draw. Measuring on change is once a round for one label. */
  let detailText: string | null = null;
  let detailWidth = 0;

  /** One placed label: the mark it leads with, then the name, both over the same halo. */
  function write(
    context: CanvasRenderingContext2D,
    label: string,
    weapon: WeaponClass | null,
    icon: WeaponIconId | undefined,
    alpha: number,
    detail: string | null,
  ): void {
    const x = placer.x + LABEL_HALO_PX;
    const y = placer.y + LABEL_HEIGHT_PX / 2;

    context.globalAlpha = alpha;

    // The mark leads the name rather than trailing it, and is right-aligned in a box the name
    // always starts after, so ten labels line their weapons up in one column — DESIGN.md §6.1.
    if (weapon !== null) drawWeaponMark(context, x, y, weapon, icon, colors.ink);

    context.strokeText(label, x + WEAPON_BOX_PX, y);

    context.fillStyle = colors.ink;
    context.fillText(label, x + WEAPON_BOX_PX, y);

    if (detail === null) return;

    // The round, under the name that owns it. It is set in the mono face and one rank down, so the
    // name is still what the label reads as — and it goes through the same halo, because the ground
    // under it is a map rather than a surface.
    context.font = style.detailFont;
    context.strokeText(detail, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX);
    context.fillText(detail, x + WEAPON_BOX_PX, y + DETAIL_LEAD_PX);
    context.font = style.font;
  }

  /**
   * How wide the round's line is, measured on the frame the string changes on and cached after it.
   * `measureText` returns a `TextMetrics`, so measuring per frame would allocate inside a draw —
   * and this string changes once a round, for one player.
   */
  function measuredDetail(context: CanvasRenderingContext2D, detail: string): number {
    if (detail !== detailText) {
      context.font = style.detailFont;
      detailText = detail;
      detailWidth = context.measureText(detail).width + WEAPON_BOX_PX + 2 * LABEL_HALO_PX;
      context.font = style.font;
    }

    return detailWidth;
  }

  /**
   * One slot's whole label: whether it gets one at all, how big its box is, and where the placer
   * put it. It is its own function rather than the body of the loop below because the decision has
   * five arms — unnamed, unmeasured, off the plate, with a round and without — and `draw` is what
   * the frame budget is read against, so it stays a loop and a call.
   */
  function place(
    context: CanvasRenderingContext2D,
    slot: number,
    bounds: PlateBounds,
    subject: LabelSubject,
    tokenRadius: number,
  ): void {
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

    // The selected player's label is two lines and as wide as the wider of them, so the placer
    // keeps its neighbours clear of the round underneath rather than of the name alone.
    const detail = subject.detail(slot);
    const boxWidth = detail === null ? width : Math.max(width, measuredDetail(context, detail));
    const boxHeight = detail === null ? LABEL_HEIGHT_PX : LABEL_HEIGHT_PX + DETAIL_LEAD_PX;

    placer.place(tokenX, tokenY, tokenRadius, boxWidth, bounds, boxHeight);
    write(context, label, subject.weapon(slot), subject.icon(slot), subject.alpha(slot), detail);
  }

  /**
   * The figure beside a token that has just been hit. It is a box of its own rather than a third
   * line under the name, and it goes through the same placer, so it can sit on whichever side of
   * the token is free — DESIGN.md §6.1 moves a label on a collision and never the token.
   *
   * Every name is placed before any figure, which is what the acceptance criterion asking that it
   * "must not cover the name" comes to in a placer: a box placed later gives way to the boxes
   * already down, so the figure moves for the names rather than the other way round.
   */
  function placeDamage(
    context: CanvasRenderingContext2D,
    slot: number,
    bounds: PlateBounds,
    subject: LabelSubject,
    tokenRadius: number,
  ): void {
    if (!subject.isNamed(slot)) return;

    const life = subject.damageLife(slot);
    if (life <= 0) return;

    const text = damageFigure(subject.damage(slot));
    if (text === undefined) return;

    const tokenX = subject.x(slot);
    const tokenY = subject.y(slot);
    if (!isOnPlate(tokenX, tokenY, bounds)) return;

    const width = text.length * digitWidth + 2 * LABEL_HALO_PX;
    placer.place(tokenX, tokenY, tokenRadius, width, bounds);

    // The figure fades over match time along with the token's own flash, so scrubbing backwards
    // through a spray counts it up again rather than replaying a wall-clock animation.
    context.globalAlpha = subject.alpha(slot) * life;
    drawDamageFigure(
      context,
      placer.x + LABEL_HALO_PX,
      placer.y + LABEL_HEIGHT_PX / 2,
      text,
      style.damageFont,
      colors.damage,
    );
    context.font = style.font;
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

      context.font = style.damageFont;
      digitWidth = context.measureText('0').width;
      context.font = style.font;
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
        place(context, slot, bounds, subject, tokenRadius);
      }

      for (let slot = 0; slot < slotCount; slot++) {
        placeDamage(context, slot, bounds, subject, tokenRadius);
      }
    },
  };
}
