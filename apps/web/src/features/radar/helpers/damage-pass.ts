import { DAMAGE_FIGURE_PREFIX, damageFigure, drawDamageFigure } from './damage-figure';
import { isOnPlate, LABEL_HALO_PX, LABEL_HEIGHT_PX, type LabelStyle } from './label-box';
import type { LabelPlacer } from './label-placer';
import type { LabelSubject } from './label-subject';
import type { PlateBounds } from './view';

export interface DamagePass {
  /** Measured once per demo: a width taken against the fallback face would be wrong all match. */
  measure(context: CanvasRenderingContext2D): void;
  place(
    context: CanvasRenderingContext2D,
    slot: number,
    bounds: PlateBounds,
    subject: LabelSubject,
    tokenRadius: number,
  ): void;
}

/**
 * The figure beside a token that has just been hit. It is a box of its own rather than a third line
 * under the name, and it goes through the placer the names went through, so it can sit on whichever
 * side of the token is free — DESIGN.md §6.1 moves a label on a collision and never the token.
 *
 * **It shares the caller's placer rather than owning one**, and that is what the ordering rests on:
 * every name is placed before any figure, so a box placed later gives way to the boxes already
 * down, and the figure moves for the names rather than the other way round. That is the acceptance
 * criterion asking that a figure "must not cover the name", expressed in a placer.
 *
 * Nothing here allocates per frame — the two widths are measured once — because it runs inside a
 * draw.
 */
export function damagePass(placer: LabelPlacer, style: LabelStyle, ink: string): DamagePass {
  /* The figure's face is tabular, so a width is its character count rather than a measurement: two
     `measureText` calls in `measure` below answer for all thousand readings, where measuring each
     would have been a thousand `TextMetrics` for a number three characters long. The sign is
     measured beside the digit rather than assumed to share its width, because a face without
     U+2212 falls back to one that sets it differently. */
  let digitWidth = 0;
  let signWidth = 0;

  return {
    measure(context): void {
      const previous = context.font;
      context.font = style.damageFont;
      digitWidth = context.measureText('0').width;
      signWidth = context.measureText(DAMAGE_FIGURE_PREFIX).width;
      context.font = previous;
    },

    place(context, slot, bounds, subject, tokenRadius): void {
      if (!subject.isNamed(slot)) return;

      const life = subject.damageLife(slot);
      if (life <= 0) return;

      const text = damageFigure(subject.damage(slot));
      if (text === undefined) return;

      const tokenX = subject.x(slot);
      const tokenY = subject.y(slot);
      if (!isOnPlate(tokenX, tokenY, bounds)) return;

      const width = signWidth + (text.length - 1) * digitWidth + 2 * LABEL_HALO_PX;
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
        ink,
      );
      context.font = style.font;
    },
  };
}
