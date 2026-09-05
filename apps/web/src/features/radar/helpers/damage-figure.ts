/**
 * The largest figure the table below holds. A hit's `healthDamage` is the raw damage the shot did
 * rather than the health it could still take — an AWP headshot reads 452 on the fixture — so this is
 * sized against one of those with room, not against a hundred. A figure past it says nothing, which
 * is the answer `countdownLabels` gives a body its own table cannot hold.
 */
const MAX_DAMAGE_FIGURE = 999;

/**
 * Every figure a hit can show, composed once at module scope — `0`, `1`, … — because the alternative
 * is a template literal per hit per frame and `AGENTS.md` §9 keeps allocation out of a draw.
 *
 * It carries no unit. The countdown over a smoke needed one because a bare number over a cloud does
 * not say what it counts; this one is beside the token it belongs to, in the colour that token is
 * flashing, and §10.6's legend draws it.
 */
const DAMAGE_FIGURES: readonly string[] = Array.from(
  { length: MAX_DAMAGE_FIGURE + 1 },
  (_, value) => String(value),
);

/** The reading for a total, or `undefined` where there is nothing to say — 0, or past the table. */
export function damageFigure(total: number): string | undefined {
  const text = DAMAGE_FIGURES[Math.round(total)];

  return text === '0' ? undefined : text;
}

/**
 * What a hit took, written where the caller placed it. Both the plate and §10.6's legend draw it
 * through here, so a swatch cannot show a figure the plate sets differently — the halo, the
 * alignment and the alpha are the caller's, because on the plate they belong to the whole label
 * pass.
 */
export function drawDamageFigure(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  font: string,
  ink: string,
): void {
  context.font = font;
  context.strokeText(text, x, y);
  context.fillStyle = ink;
  context.fillText(text, x, y);
}
