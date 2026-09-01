export interface Point {
  readonly x: number;
  readonly y: number;
}

interface Command {
  readonly code: string;
  readonly args: readonly number[];
}

/**
 * How many segments a cubic is sampled into before the ring is simplified. It only has to be dense
 * enough that the simplifier sees the curve rather than a chord: what survives is decided by the
 * tolerance, not by this number.
 */
const CURVE_STEPS = 16;

// Only the commands Valve's exported icons actually use. An arc or a quadratic is a hard failure
// rather than a skipped segment: a dropped segment is a hole in a silhouette nobody would see at
// the size these render.
const ARITY: Readonly<Record<string, number>> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, z: 0 };

const TOKEN = /([A-Za-z])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;

type Token = { readonly letter: string } | { readonly value: number };

function tokenize(d: string): Token[] {
  const tokens: Token[] = [];

  for (const match of d.matchAll(TOKEN)) {
    const letter = match[1];
    tokens.push(letter === undefined ? { value: Number(match[2]) } : { letter });
  }

  return tokens;
}

function readArgs(tokens: readonly Token[], from: number, count: number, code: string): number[] {
  const args: number[] = [];

  for (let index = from; index < from + count; index += 1) {
    const token = tokens[index];
    if (token === undefined || 'letter' in token)
      throw new Error(`"${code}" takes ${count} numbers`);

    args.push(token.value);
  }

  return args;
}

/** What an implicit repeat continues. A repeated moveto is a lineto, and a close cannot repeat. */
function repeatOf(code: string, arity: number): string | undefined {
  if (arity === 0) return undefined;
  if (code === 'M') return 'L';
  if (code === 'm') return 'l';

  return code;
}

export function parseCommands(d: string): Command[] {
  const tokens = tokenize(d);
  const commands: Command[] = [];
  let code: string | undefined;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token !== undefined && 'letter' in token) {
      code = token.letter;
      index += 1;
    }
    if (code === undefined) throw new Error('path data begins with a number');

    const arity = ARITY[code.toLowerCase()];
    if (arity === undefined) throw new Error(`unsupported command "${code}"`);

    commands.push({ code, args: readArgs(tokens, index, arity, code) });
    index += arity;
    code = repeatOf(code, arity);
  }

  return commands;
}

function sampleCubic(from: Point, first: Point, second: Point, to: Point, into: Point[]): void {
  for (let step = 1; step <= CURVE_STEPS; step += 1) {
    const t = step / CURVE_STEPS;
    const u = 1 - t;

    into.push({
      x: u * u * u * from.x + 3 * u * u * t * first.x + 3 * u * t * t * second.x + t * t * t * to.x,
      y: u * u * u * from.y + 3 * u * u * t * first.y + 3 * u * t * t * second.y + t * t * t * to.y,
    });
  }
}

interface Pen {
  at: Point;
  start: Point;
  /** The previous cubic's second control point, which is what `S` mirrors. */
  control: Point | undefined;
  ring: Point[];
}

function absolute(command: Command, pen: Pen): number[] {
  const { code, args } = command;
  if (code === code.toUpperCase()) return [...args];
  if (code === 'h') return args.map((value) => value + pen.at.x);
  if (code === 'v') return args.map((value) => value + pen.at.y);

  return args.map((value, index) => value + (index % 2 === 0 ? pen.at.x : pen.at.y));
}

function lineTo(pen: Pen, point: Point): void {
  pen.ring.push(point);
  pen.at = point;
  pen.control = undefined;
}

function curveTo(pen: Pen, first: Point, second: Point, to: Point): void {
  sampleCubic(pen.at, first, second, to, pen.ring);
  pen.at = to;
  pen.control = second;
}

function mirroredControl(pen: Pen): Point {
  if (pen.control === undefined) return pen.at;

  return { x: 2 * pen.at.x - pen.control.x, y: 2 * pen.at.y - pen.control.y };
}

function closeRing(pen: Pen, rings: Point[][]): void {
  if (pen.ring.length > 0) rings.push(pen.ring);
  pen.ring = [];
}

type Draw = (pen: Pen, args: readonly number[]) => void;

function pointAt(args: readonly number[], index: number): Point {
  return { x: args[index] ?? 0, y: args[index + 1] ?? 0 };
}

const DRAW: Readonly<Record<string, Draw>> = {
  L: (pen, args) => lineTo(pen, pointAt(args, 0)),
  H: (pen, args) => lineTo(pen, { x: args[0] ?? 0, y: pen.at.y }),
  V: (pen, args) => lineTo(pen, { x: pen.at.x, y: args[0] ?? 0 }),
  C: (pen, args) => curveTo(pen, pointAt(args, 0), pointAt(args, 2), pointAt(args, 4)),
  S: (pen, args) => curveTo(pen, mirroredControl(pen), pointAt(args, 0), pointAt(args, 2)),
};

function apply(pen: Pen, command: Command, rings: Point[][]): void {
  const code = command.code.toUpperCase();
  const args = absolute(command, pen);

  if (code === 'M') {
    closeRing(pen, rings);
    pen.ring = [pointAt(args, 0)];
    pen.at = pointAt(args, 0);
    pen.start = pointAt(args, 0);
    pen.control = undefined;
    return;
  }

  if (code === 'Z') {
    closeRing(pen, rings);
    pen.at = pen.start;
    pen.control = undefined;
    return;
  }

  const draw = DRAW[code];
  if (draw === undefined) throw new Error(`unsupported command "${command.code}"`);

  draw(pen, args);
}

/** Valve's outlines as closed rings of points, in the icon's own viewBox coordinates. */
export function flattenPath(d: string): Point[][] {
  const rings: Point[][] = [];
  const origin = { x: 0, y: 0 };
  const pen: Pen = { at: origin, start: origin, control: undefined, ring: [] };

  for (const command of parseCommands(d)) apply(pen, command, rings);
  if (pen.ring.length > 0) rings.push(pen.ring);

  return rings;
}
