/**
 * Reads the token layer: its colour values, and the figures its own comment tables claim for them.
 *
 * The tables are parsed by shape rather than by a list this script keeps, so a row added to the
 * token file is checked the moment it is written. What the script knows is what a *column* means —
 * a surface to set the row against, the composite a translucent row makes, or an ink to read on
 * that composite — and nothing about which rows exist.
 */

const PALETTE_NAMES = ['default', 'colour-blind', 'cyber'] as const;

export type Palette = (typeof PALETTE_NAMES)[number];

const BLOCKS: readonly (readonly [Palette, string])[] = [
  ['default', '@theme static {'],
  ['colour-blind', ':root[data-palette="colour-blind"] {'],
  ['cyber', ':root[data-palette="cyber"] {'],
];

const DECLARATION = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm;
const SURFACE = /^surface-\d$/;
const ROW = /^ {2,}([a-z][a-z0-9-]*)((?:\s+(?:#[0-9a-fA-F]{6}|\d+\.\d+))+)\s*$/;
const FLOOR = /The floor across .*? is \*\*(\d+\.\d+)\*\*/;

export type ColumnKind = 'surface' | 'composite' | 'ground' | 'ink';

export interface Column {
  readonly kind: ColumnKind;
  /** The token the column names, without its `--color-` prefix: `surface-1`, `ink-dim`. */
  readonly name: string;
  readonly palette: Palette;
}

export interface Row {
  readonly name: string;
  readonly cells: readonly string[];
  readonly line: number;
}

export interface Table {
  readonly columns: readonly Column[];
  readonly rows: readonly Row[];
}

/** A `**5.03**` claim, and the table it follows. */
export interface FloorClaim {
  readonly value: string;
  readonly tableIndex: number;
  readonly line: number;
}

export interface TokenLayer {
  readonly values: ReadonlyMap<Palette, ReadonlyMap<string, string>>;
  readonly tables: readonly Table[];
  readonly floors: readonly FloorClaim[];
}

function blockAt(source: string, header: string): string {
  const start = source.indexOf(header);
  if (start === -1) return '';

  const end = source.indexOf('\n}', start);

  return source.slice(start, end === -1 ? undefined : end);
}

function declarationsIn(block: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const [, name, value] of block.matchAll(DECLARATION)) {
    if (name !== undefined && value !== undefined) values.set(name, value.trim());
  }

  return values;
}

function isPaletteLine(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => PALETTE_NAMES.includes(cell as Palette));
}

function cellsOf(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function columnKind(name: string): ColumnKind {
  if (SURFACE.test(name)) return 'surface';
  if (name === 'composite') return 'composite';

  return name === 'ground' ? 'ground' : 'ink';
}

/** The palette each column belongs to: the groups above it, spread evenly across its width. */
function palettesFor(count: number, groups: readonly string[]): Palette[] {
  if (groups.length === 0) return Array.from({ length: count }, () => 'default' as Palette);

  const width = Math.max(1, Math.round(count / groups.length));

  return Array.from(
    { length: count },
    (_, index) => (groups[Math.floor(index / width)] ?? 'default') as Palette,
  );
}

function headerAt(lines: readonly string[], index: number): Column[] | null {
  const cells = cellsOf(lines[index] ?? '');
  const isHeader =
    cells.length > 1 && (cells.every((cell) => SURFACE.test(cell)) || cells[0] === 'composite');
  if (!isHeader) return null;

  const above = cellsOf(lines[index - 1] ?? '');
  const groups = isPaletteLine(above) ? above : [];
  const palettes = palettesFor(cells.length, groups);

  return cells.map((name, at) => ({
    kind: columnKind(name),
    name,
    palette: palettes[at] ?? 'default',
  }));
}

/** The rows under a header: every line that is a name followed by figures, and nothing after. */
function rowsFrom(lines: readonly string[], from: number): Row[] {
  const rows: Row[] = [];

  for (let at = from; at < lines.length; at++) {
    const row = ROW.exec(lines[at] ?? '');
    if (row?.[1] === undefined || row[2] === undefined) break;

    rows.push({ name: row[1], cells: row[2].trim().split(/\s+/), line: at + 1 });
  }

  return rows;
}

export function readTokenLayer(source: string): TokenLayer {
  const values = new Map<Palette, ReadonlyMap<string, string>>();
  for (const [palette, header] of BLOCKS) {
    values.set(palette, declarationsIn(blockAt(source, header)));
  }

  const lines = source.split('\n');
  const tables: Table[] = [];
  const floors: FloorClaim[] = [];

  for (let index = 0; index < lines.length; index++) {
    const floor = FLOOR.exec(lines[index] ?? '');
    if (floor?.[1] !== undefined && tables.length > 0) {
      floors.push({ value: floor[1], tableIndex: tables.length - 1, line: index + 1 });
      continue;
    }

    const columns = headerAt(lines, index);
    if (columns === null) continue;

    const rows = rowsFrom(lines, index + 1);
    if (rows.length === 0) continue;

    tables.push({ columns, rows });
    index += rows.length;
  }

  return { values, tables, floors };
}

/** A token's value in one palette, falling back to the default the palettes are a swap over. */
export function tokenValue(layer: TokenLayer, name: string, palette: Palette): string | undefined {
  return layer.values.get(palette)?.get(name) ?? layer.values.get('default')?.get(name);
}
