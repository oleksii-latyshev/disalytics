/**
 * Re-derives every contrast figure `packages/ui/src/styles/tokens.css` states about itself, and
 * fails when one has drifted from the tokens it was measured over.
 *
 * The figures are a contract the product is designed against — §14's ink floor, the marks that have
 * to clear 4.5:1 on both grounds, the exception `--color-ink-faint` is granted by name — and until
 * this script they were prose: a one-digit change to a colour left every number in the file stating
 * something that was no longer true, with nothing to say so. The maths is the reference
 * implementation from #133 rather than a fifth rewrite of it.
 *
 * **The expected numbers live in the token file and nowhere else.** This script knows what a column
 * means, never what a row says, so a pairing added to a comment table is checked the moment it is
 * written.
 */

import { composite, contrast, parseColour, type Rgb, toHex } from './contrast-check/colour';
import {
  type Column,
  type Palette,
  type Row,
  readTokenLayer,
  type TokenLayer,
  tokenValue,
} from './contrast-check/tables';

const TOKENS_PATH = 'packages/ui/src/styles/tokens.css';

/** §14's floor for anything with a reading in it. */
const TEXT_FLOOR = 4.5;

/**
 * The one token the file puts *under* that floor on purpose, so the check holds it there: it is
 * ticks, separators and disabled marks, and the day it rises above 4.5 the sentence saying it never
 * carries text is the thing that is wrong.
 */
const SUB_FLOOR_TOKEN = 'ink-faint';

/** What a composite column is composited onto — the card every interaction state is measured on. */
const COMPOSITE_GROUND = '--color-surface-1';

const failures: string[] = [];

function fail(where: string, documented: string, measured: string): void {
  failures.push(`${where}: the file says ${documented}, the tokens say ${measured}`);
}

function colourOf(layer: TokenLayer, name: string, palette: Palette): Rgb {
  const value = tokenValue(layer, `--color-${name}`, palette);
  if (value === undefined)
    throw new Error(`${TOKENS_PATH} states a figure for an unknown --color-${name}`);

  const colour = parseColour(value);
  if (colour === null)
    throw new Error(`--color-${name} is ${value}, which this script cannot read`);

  return colour;
}

function ratio(value: number): string {
  return value.toFixed(2);
}

function checkCell(layer: TokenLayer, row: Row, column: Column, cell: string, ground: Rgb): void {
  const where = `${row.name} on ${column.name}${column.palette === 'default' ? '' : ` (${column.palette})`}, line ${row.line}`;

  if (column.kind === 'composite') {
    const measured = toHex(composite(colourOf(layer, row.name, column.palette), ground));
    if (measured.toLowerCase() !== cell.toLowerCase()) fail(where, cell, measured);

    return;
  }

  const against =
    column.kind === 'surface'
      ? colourOf(layer, column.name, column.palette)
      : composite(colourOf(layer, row.name, column.palette), ground);
  const subject = column.kind === 'ink' ? colourOf(layer, column.name, column.palette) : undefined;
  const measured =
    column.kind === 'ground'
      ? contrast(against, ground)
      : contrast(subject ?? colourOf(layer, row.name, column.palette), against);

  if (ratio(measured) !== cell) fail(where, cell, ratio(measured));

  // A hairline is seen rather than read, so the floor is not its to clear.
  if (column.kind === 'ground') return;

  if (row.name === SUB_FLOOR_TOKEN || column.name === SUB_FLOOR_TOKEN) {
    if (measured >= TEXT_FLOOR) {
      fail(where, `under ${TEXT_FLOOR} — the file says it never carries text`, ratio(measured));
    }

    return;
  }

  if (measured < TEXT_FLOOR) fail(where, `at least ${TEXT_FLOOR}`, ratio(measured));
}

const layer = readTokenLayer(await Bun.file(TOKENS_PATH).text());

if (layer.tables.length === 0) {
  console.error(`No contrast tables found in ${TOKENS_PATH}.`);
  console.error('A check that measures nothing passes for the wrong reason — fix it.');
  process.exit(1);
}

const groundValue = layer.values.get('default')?.get(COMPOSITE_GROUND);
const ground = groundValue === undefined ? null : parseColour(groundValue);
if (ground === null) throw new Error(`${TOKENS_PATH} has no readable ${COMPOSITE_GROUND}`);

let pairings = 0;
const lowest: number[] = [];

for (const table of layer.tables) {
  let floor = Number.POSITIVE_INFINITY;

  for (const row of table.rows) {
    if (row.cells.length !== table.columns.length) {
      failures.push(
        `line ${row.line}: ${row.name} carries ${row.cells.length} figures under ${table.columns.length} columns`,
      );
      continue;
    }

    for (const [at, column] of table.columns.entries()) {
      const cell = row.cells[at];
      if (cell === undefined) continue;

      checkCell(layer, row, column, cell, ground);
      pairings++;

      if (column.kind !== 'composite' && column.kind !== 'ground') {
        floor = Math.min(floor, Number(cell));
      }
    }
  }

  lowest.push(floor);
}

for (const claim of layer.floors) {
  const measured = lowest[claim.tableIndex];
  if (measured === undefined || ratio(measured) === claim.value) continue;

  fail(`the floor claimed on line ${claim.line}`, claim.value, ratio(measured));
}

if (failures.length > 0) {
  console.error(`${TOKENS_PATH} no longer measures what it says:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('\nRe-measure the tokens and correct the comment, or put the colour back.');
  process.exit(1);
}

console.log(
  `${pairings} contrast pairings over ${layer.tables.length} tables and ${layer.floors.length} floors, every figure reproduced.`,
);
