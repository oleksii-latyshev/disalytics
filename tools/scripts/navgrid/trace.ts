import type { NavRect } from '../../../packages/map-data/src/navgrid-overrides';

/** A pixel at least this opaque is part of the map; Nuke's ghost of the floor above is far below. */
const OPAQUE = 200;
/** Share of a cell's pixels that must survive erosion for the cell to be walkable. */
const CELL_SHARE = 0.5;

export interface TraceOptions {
  /** Radar pixels per cell. */
  readonly cell: number;
  /** Walls grow this many pixels into the floor, so a path keeps off them. */
  readonly erode: number;
}

function clear(input: Uint8Array, at: number, along: number, radius: number): boolean {
  for (let d = -radius; d <= radius; d++) if (input[at + d * along] !== 1) return false;
  return true;
}

function erodeAxis(
  input: Uint8Array,
  size: number,
  radius: number,
  horizontal: boolean,
): Uint8Array {
  const output = new Uint8Array(size * size);
  const along = horizontal ? 1 : size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const position = horizontal ? x : y;
      const inside = position >= radius && position < size - radius;
      const at = y * size + x;
      output[at] = inside && clear(input, at, along, radius) ? 1 : 0;
    }
  }

  return output;
}

function minFilter(source: Uint8Array, size: number, radius: number): Uint8Array {
  if (radius === 0) return source;
  return erodeAxis(erodeAxis(source, size, radius, true), size, radius, false);
}

function cellCount(mask: Uint8Array, size: number, cx: number, cy: number, cell: number): number {
  let count = 0;
  for (let y = cy * cell; y < (cy + 1) * cell; y++) {
    for (let x = cx * cell; x < (cx + 1) * cell; x++) count += mask[y * size + x] ?? 0;
  }
  return count;
}

/**
 * The floor of one radar image as a `size / cell` square of 0/1 cells. Floor is whatever the image
 * draws opaque; void and the ghost of another level are transparent. This is a trace of a picture,
 * not a nav mesh — boxes drawn inside the floor stay walkable unless an override closes them.
 */
export function traceLevel(
  rgba: Uint8Array,
  size: number,
  { cell, erode }: TraceOptions,
): Uint8Array {
  const floor = new Uint8Array(size * size);
  for (let i = 0; i < floor.length; i++) floor[i] = (rgba[i * 4 + 3] ?? 0) >= OPAQUE ? 1 : 0;

  const eroded = minFilter(floor, size, erode);
  const cells = size / cell;
  const grid = new Uint8Array(cells * cells);

  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const share = cellCount(eroded, size, cx, cy, cell) / (cell * cell);
      grid[cy * cells + cx] = share >= CELL_SHARE ? 1 : 0;
    }
  }

  return grid;
}

export function applyRects(
  grid: Uint8Array,
  cells: number,
  cell: number,
  rects: readonly NavRect[] | undefined,
  value: 0 | 1,
): void {
  for (const rect of rects ?? []) {
    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        const x = (cx + 0.5) * cell;
        const y = (cy + 0.5) * cell;
        if (x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height) {
          grid[cy * cells + cx] = value;
        }
      }
    }
  }
}

function neighbours(at: number, cells: number): number[] {
  const x = at % cells;
  const y = (at - x) / cells;
  return [
    x > 0 ? at - 1 : -1,
    x < cells - 1 ? at + 1 : -1,
    y > 0 ? at - cells : -1,
    y < cells - 1 ? at + cells : -1,
  ];
}

/** Flood one component from `start`, labelling it `id`; returns its size. */
function flood(
  grid: Uint8Array,
  cells: number,
  labels: Int32Array,
  stack: Int32Array,
  start: number,
  id: number,
): number {
  let top = 0;
  let count = 0;
  stack[top++] = start;
  labels[start] = id;

  while (top > 0) {
    count++;
    for (const next of neighbours(stack[--top] ?? 0, cells)) {
      if (next < 0 || grid[next] !== 1 || labels[next] !== -1) continue;
      labels[next] = id;
      stack[top++] = next;
    }
  }

  return count;
}

/** Component labels by 4-connectivity — the reachability a corner-respecting path has. */
export function labelComponents(
  grid: Uint8Array,
  cells: number,
): { labels: Int32Array; sizes: number[] } {
  const labels = new Int32Array(cells * cells).fill(-1);
  const sizes: number[] = [];
  const stack = new Int32Array(cells * cells);

  for (let start = 0; start < grid.length; start++) {
    if (grid[start] === 1 && labels[start] === -1) {
      sizes.push(flood(grid, cells, labels, stack, start, sizes.length));
    }
  }

  return { labels, sizes };
}

/**
 * Drops every component that is a speck: only the largest, any holding a seed (a spawn), and any
 * at least `minShare` of the largest survive.
 */
export function keepComponents(
  grid: Uint8Array,
  cells: number,
  seeds: readonly number[],
  minShare: number,
): Uint8Array {
  const { labels, sizes } = labelComponents(grid, cells);
  const largest = Math.max(0, ...sizes);
  const keep = new Set<number>();

  for (const [id, count] of sizes.entries()) if (count >= largest * minShare) keep.add(id);
  for (const seed of seeds) {
    const id = labels[seed] ?? -1;
    if (id >= 0) keep.add(id);
  }

  const output = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i++) output[i] = keep.has(labels[i] ?? -1) ? 1 : 0;
  return output;
}

/** Row-major, most significant bit first, zero-padded to a whole byte. */
export function packBits(grid: Uint8Array): Uint8Array {
  const packed = new Uint8Array(Math.ceil(grid.length / 8));
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1) packed[i >> 3] = (packed[i >> 3] ?? 0) | (0x80 >> (i & 7));
  }
  return packed;
}
