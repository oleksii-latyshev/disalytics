import { CELL_EXTENT, CELL_PX } from './pixels';

/**
 * The mascot, one character per cell: `#` is body and `.` is nothing. Its eyes are not in here —
 * they are drawn over it, because where a pupil sits is a function of where the pointer is and a
 * sprite is a constant.
 *
 * It is drawn in the way in's own grid rather than as a shape, which is the whole reason it fits
 * this screen: the ground behind it is Dust2's plate sampled once per cell of the same grid, and
 * anything smooth standing on it is a second visual language.
 */
export const MASCOT_SPRITE = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '..############..',
  '..############..',
  '...##########...',
  '....##....##....',
  '....##....##....',
] as const;

export const MASCOT_COLUMNS = 16;
export const MASCOT_ROWS = MASCOT_SPRITE.length;
export const MASCOT_WIDTH_PX = MASCOT_COLUMNS * CELL_PX;
export const MASCOT_HEIGHT_PX = MASCOT_ROWS * CELL_PX;

/** Top-left cell of each eye. They are 3×3, which is what gives a pupil nine places to sit. */
export const MASCOT_EYES = [
  { column: 3, row: 4 },
  { column: 10, row: 4 },
] as const;
export const EYE_CELLS = 3;

/** How far a pupil travels from the middle of its socket: one cell, which is all a 3×3 socket has. */
const PUPIL_REACH = 1;

/** How far the hop lifts it, in cells, while a demo is over the window. */
const HOP_CELLS = 0.8;

export interface MascotColours {
  /** The body: the chrome's own ink, because this screen has no data for a hue to mean. */
  readonly body: string;
  /** The eyes, which are holes in the body rather than marks on it — so, what is behind it. */
  readonly socket: string;
}

export interface MascotPose {
  /** Where it is looking, in radians, from the middle of the sprite. */
  readonly angle: number;
  /** A file is over the window: the eyes close happily and it hops. */
  readonly isLifted: boolean;
  /** Where the hop has got to, 0 to 1 and back, in wall time. Zero is standing still. */
  readonly hop: number;
}

function fillCell(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
  offsetY: number,
): void {
  const side = 2 * CELL_EXTENT * CELL_PX;
  const x = (column + 0.5) * CELL_PX - side / 2;
  const y = (row + 0.5) * CELL_PX - side / 2 + offsetY;

  context.fillRect(x, y, side, side);
}

/**
 * An eye that is looking: a 3×3 hole with the pupil pushed one cell towards whatever it has found.
 *
 * The pupil is the *body* colour rather than a third one — it is the part of the face the hole did
 * not take — which is what keeps this two colours deep, the way everything else on this screen is.
 */
function drawOpenEye(
  context: CanvasRenderingContext2D,
  eye: { readonly column: number; readonly row: number },
  angle: number,
  offsetY: number,
  colours: MascotColours,
): void {
  context.fillStyle = colours.socket;
  for (let row = 0; row < EYE_CELLS; row++) {
    for (let column = 0; column < EYE_CELLS; column++) {
      fillCell(context, eye.column + column, eye.row + row, offsetY);
    }
  }

  const pupilColumn = eye.column + 1 + Math.round(Math.cos(angle) * PUPIL_REACH);
  const pupilRow = eye.row + 1 + Math.round(Math.sin(angle) * PUPIL_REACH);

  context.fillStyle = colours.body;
  fillCell(context, pupilColumn, pupilRow, offsetY);
}

/** An eye that is pleased: the chevron a closed, smiling eye is in every pixel face ever drawn. */
function drawHappyEye(
  context: CanvasRenderingContext2D,
  eye: { readonly column: number; readonly row: number },
  offsetY: number,
  colours: MascotColours,
): void {
  context.fillStyle = colours.socket;
  fillCell(context, eye.column, eye.row + 1, offsetY);
  fillCell(context, eye.column + 1, eye.row, offsetY);
  fillCell(context, eye.column + 2, eye.row + 1, offsetY);
}

/**
 * The mascot, looking wherever the pointer is — and, while a demo is over the window, closing its
 * eyes and hopping.
 *
 * Nothing here allocates: two loops over a constant sprite and one `fillRect` per cell.
 */
export function drawMascot(
  context: CanvasRenderingContext2D,
  pose: MascotPose,
  colours: MascotColours,
): void {
  const offsetY = -pose.hop * HOP_CELLS * CELL_PX;

  context.fillStyle = colours.body;
  for (let row = 0; row < MASCOT_SPRITE.length; row++) {
    const line = MASCOT_SPRITE[row];
    if (line === undefined) continue;

    for (let column = 0; column < line.length; column++) {
      if (line[column] === '#') fillCell(context, column, row, offsetY);
    }
  }

  for (const eye of MASCOT_EYES) {
    if (pose.isLifted) drawHappyEye(context, eye, offsetY, colours);
    else drawOpenEye(context, eye, pose.angle, offsetY, colours);
  }
}

/** Where the sprite's own middle is in the viewport, which is what a pupil looks out from. */
export interface MascotBox {
  readonly left: number;
  readonly top: number;
}

/** The angle from the mascot to a point in the viewport. */
export function angleToPointer(box: MascotBox, clientX: number, clientY: number): number {
  return Math.atan2(
    clientY - (box.top + MASCOT_HEIGHT_PX / 2),
    clientX - (box.left + MASCOT_WIDTH_PX / 2),
  );
}
