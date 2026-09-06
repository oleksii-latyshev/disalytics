/**
 * The hairline between a displaced label and the token it names. It is 1px like every other
 * hairline the plate draws, and it stays 1px at every zoom for the reason a needle and a halo do:
 * the world scales through each layer's own `scale`, and what is measured in device pixels does not.
 */
export const LEADER_WIDTH_PX = 1;

/**
 * The ink for a run of leader lines, set once for the pass rather than per line — `haloStroke`'s
 * shape, and for its reason: the label pass draws every line before any name, so the stroke it
 * leaves behind is set back once instead of ten times.
 */
export function leaderStroke(context: CanvasRenderingContext2D, color: string): void {
  context.lineWidth = LEADER_WIDTH_PX;
  context.strokeStyle = color;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  return value > max ? max : value;
}

/**
 * One line from a token to the label that belongs to it, drawn only where the placer had to reach
 * past the four boxes a reader expects — `labelPlacer`'s `isDisplaced`.
 *
 * It runs from the token's rim rather than from its centre, so it never crosses the mark it starts
 * at, and it ends at the nearest point of the label's box rather than at the box's centre or a
 * corner: for the row above a token that is a vertical line up to the box's bottom edge, which is
 * the shortest statement of "this one" the geometry allows. The end is under the label's own halo,
 * because the pass draws every line before any glyph.
 *
 * Nothing here allocates and nothing here is a function of wall time: this runs inside a draw, and
 * where the line goes is a function of where the placer put the box on this frame.
 */
export function drawLeaderLine(
  context: CanvasRenderingContext2D,
  tokenX: number,
  tokenY: number,
  tokenRadius: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
): void {
  const endX = clamp(tokenX, boxX, boxX + boxWidth);
  const endY = clamp(tokenY, boxY, boxY + boxHeight);
  const dx = endX - tokenX;
  const dy = endY - tokenY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // A box sitting against its own token needs no line to say so, and a box the token stands inside
  // would be given one pointing outwards from nothing.
  if (distance <= tokenRadius) return;

  context.beginPath();
  context.moveTo(tokenX + (dx / distance) * tokenRadius, tokenY + (dy / distance) * tokenRadius);
  context.lineTo(endX, endY);
  context.stroke();
}
