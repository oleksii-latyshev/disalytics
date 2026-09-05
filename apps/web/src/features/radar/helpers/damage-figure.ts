/**
 * The largest figure the table below holds. A hit's `healthDamage` is the raw damage the shot did
 * rather than the health it could still take — an AWP headshot reads 452 on the fixture — so this is
 * sized against one of those with room, not against a hundred. A figure past it says nothing, which
 * is the answer `countdownLabels` gives a body its own table cannot hold.
 */
const MAX_DAMAGE_FIGURE = 999;

/**
 * What the figure leads with — the typographic minus (U+2212) rather than a hyphen, because this is
 * a signed quantity and the mono face sets it on the digits' own width.
 *
 * It carries no unit and it does carry this: the owner's reading on 5 September 2026 is that a bare
 * number beside a token says *something happened* where the sentence is *this much health went*. The
 * countdown over a smoke reached the same conclusion from the other direction and took a letter.
 */
export const DAMAGE_FIGURE_PREFIX = '\u2212';

/**
 * Every figure a hit can show, composed once at module scope — `−1`, `−2`, … — because the
 * alternative is a template literal per hit per frame and `AGENTS.md` §9 keeps allocation out of a
 * draw. Index 0 is unreachable by design: a hit that took no health says nothing at all, which is
 * what an armour-only hit is, and the fixture holds those.
 */
const DAMAGE_FIGURES: readonly string[] = Array.from(
  { length: MAX_DAMAGE_FIGURE + 1 },
  (_, value) => `${DAMAGE_FIGURE_PREFIX}${value}`,
);

/** The reading for a total, or `undefined` where there is nothing to say — 0, or past the table. */
export function damageFigure(total: number): string | undefined {
  const rounded = Math.round(total);

  return rounded === 0 ? undefined : DAMAGE_FIGURES[rounded];
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
