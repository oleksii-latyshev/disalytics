import { CELL_EXTENT, CELL_PX } from './pixels';

/**
 * The watcher on the upload card: a T in a balaclava from the chest up, one character per cell —
 * `#` is body, `o` is a hole (the eye slit) and `.` is nothing. #380 replaced the round mascot with it;
 * a CT was drawn too and dropped, because no helmet at this size read as special forces.
 *
 * It is drawn in the way in's own grid rather than as a shape, which is the whole reason it fits this
 * screen: the ground behind it is Dust2's plate sampled once per cell of the same grid, and anything
 * smooth standing on it is a second visual language. Holes are left unpainted rather than filled
 * with a background colour, so the card's hover shows through them like it does around the figure.
 */
/** The head is its own sprite because it is the part that turns; the shoulders stay put. */
export const HEAD = [
  '...######...',
  '..########..',
  '.##########.',
  '.##########.',
  '.#oooooooo#.',
  '.#oooooooo#.',
  '.##########.',
  '.##########.',
  '..########..',
  '...######...',
];

export const SHOULDERS = [
  '......####......',
  '..############..',
  '.##############.',
  '################',
];

export const MASCOT_COLUMNS = 16;
export const HEAD_COLUMNS = 12;
const HEAD_ROWS = 10;
/** Where the head's left edge sits when it faces forward, so a turn of one cell stays in the grid. */
const HEAD_COLUMN = (MASCOT_COLUMNS - HEAD_COLUMNS) / 2;

export const MASCOT_ROWS = HEAD_ROWS + SHOULDERS.length;
export const MASCOT_WIDTH_PX = MASCOT_COLUMNS * CELL_PX;
export const MASCOT_HEIGHT_PX = MASCOT_ROWS * CELL_PX;

/**
 * Each eye's resting cell in head coordinates, looking straight ahead. A look moves it one cell
 * along each axis, and the slit leaves exactly that much hole around it.
 */
const EYES = [
  { column: 4, row: 4 },
  { column: 7, row: 4 },
] as const;

/** How far the hop lifts it, in cells, while a demo is over the window. */
const HOP_CELLS = 0.8;

/** A step along one axis: towards the pointer, away from it, or straight ahead. */
export type Step = -1 | 0 | 1;

export interface MascotPose {
  /** Where it is looking, one step along each axis. `{0, 0}` is facing the reader. */
  readonly lookX: Step;
  readonly lookY: Step;
  /** Where the hop has got to, 0 to 1 and back, in wall time. Zero is standing still. */
  readonly hop: number;
}

/**
 * Which cell an eye sits in. The slit is wide enough for an eye to slide a cell across it, and two
 * rows tall, so it takes the bottom row looking down and the top row otherwise.
 */
export function eyeCells(pose: Pick<MascotPose, 'lookX' | 'lookY'>) {
  return EYES.map((eye) => ({
    column: eye.column + pose.lookX,
    row: eye.row + Math.max(pose.lookY, 0),
  }));
}

function fillCell(context: CanvasRenderingContext2D, column: number, row: number, offsetY: number) {
  const side = 2 * CELL_EXTENT * CELL_PX;
  const x = (column + 0.5) * CELL_PX - side / 2;
  const y = (row + 0.5) * CELL_PX - side / 2 + offsetY;

  context.fillRect(x, y, side, side);
}

function fillSprite(
  context: CanvasRenderingContext2D,
  sprite: readonly string[],
  column: number,
  row: number,
  offsetY: number,
) {
  for (let y = 0; y < sprite.length; y++) {
    const line = sprite[y];
    if (line === undefined) continue;

    for (let x = 0; x < line.length; x++) {
      if (line[x] === '#') fillCell(context, column + x, row + y, offsetY);
    }
  }
}

/**
 * The T, head turned a cell towards wherever it is looking. Nothing here allocates beyond the
 * two eye cells: loops over constant sprites and one `fillRect` per cell.
 */
export function drawMascot(context: CanvasRenderingContext2D, pose: MascotPose, ink: string) {
  const offsetY = -pose.hop * HOP_CELLS * CELL_PX;
  const headColumn = HEAD_COLUMN + pose.lookX;

  context.fillStyle = ink;
  fillSprite(context, SHOULDERS, 0, HEAD_ROWS, offsetY);
  fillSprite(context, HEAD, headColumn, 0, offsetY);

  for (const eye of eyeCells(pose)) fillCell(context, headColumn + eye.column, eye.row, offsetY);
}

/** The sprite's box in the viewport. */
export interface MascotBox {
  readonly left: number;
  readonly top: number;
}

/** How far from the figure's middle, in CSS pixels, a pointer has to be before it turns that way. */
const LOOK_DEAD_ZONE_PX = 40;

function stepToward(distance: number): Step {
  if (distance > LOOK_DEAD_ZONE_PX) return 1;

  return distance < -LOOK_DEAD_ZONE_PX ? -1 : 0;
}

/** Which way to look for a pointer at a point in the viewport. */
export function lookToward(box: MascotBox, clientX: number, clientY: number) {
  return {
    lookX: stepToward(clientX - (box.left + MASCOT_WIDTH_PX / 2)),
    lookY: stepToward(clientY - (box.top + MASCOT_HEIGHT_PX / 2)),
  };
}
