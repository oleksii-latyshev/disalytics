import { isWidgetId, WIDGETS, type WidgetId, type WidgetSize, widgetSpec } from './home-widgets';

export interface Placement {
  readonly id: WidgetId;
  readonly size: WidgetSize;
  readonly isShown: boolean;
}

/** Every widget once, in reading order. A hidden widget keeps its slot so adding it back is where it was. */
export type HomeLayout = readonly Placement[];

const DEFAULT_ORDER: readonly (readonly [WidgetId, WidgetSize, boolean])[] = [
  ['hero', 'XL', true],
  ['stats', 'M', true],
  ['tactics', 'M', true],
  ['open', 'M', true],
  ['recent', 'M', true],
  ['lineup', 'M', true],
  ['economy', 'S', true],
  ['refs', 'S', true],
  ['soon', 'S', true],
  ['coach', 'M', false],
  ['keys', 'S', false],
  ['storage', 'S', false],
];

export const DEFAULT_LAYOUT: HomeLayout = DEFAULT_ORDER.map(([id, size, isShown]) => ({
  id,
  size,
  isShown,
}));

function isSize(value: unknown): value is WidgetSize {
  return value === 'S' || value === 'M' || value === 'L' || value === 'XL';
}

function placementOf(value: unknown): Placement | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, size, isShown } = value as Record<string, unknown>;
  if (!isWidgetId(id)) return null;

  const spec = widgetSpec(id);
  const fallback = spec.sizes[0] ?? 'S';

  return {
    id,
    size: isSize(size) && spec.sizes.includes(size) ? size : fallback,
    isShown: isShown !== false,
  };
}

/**
 * The layout a stored string describes. Anything unreadable is the default, a widget this build has
 * dropped is ignored, and one it has added since the string was written joins at the end, hidden —
 * a release never rearranges a reader's home for them.
 */
export function parseLayout(raw: string): HomeLayout {
  if (raw === '') return DEFAULT_LAYOUT;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return DEFAULT_LAYOUT;
  }
  if (!Array.isArray(decoded)) return DEFAULT_LAYOUT;

  const seen = new Set<WidgetId>();
  const placements: Placement[] = [];
  for (const entry of decoded) {
    const placement = placementOf(entry);
    if (placement === null || seen.has(placement.id)) continue;
    seen.add(placement.id);
    placements.push(placement);
  }
  if (placements.length === 0) return DEFAULT_LAYOUT;

  for (const spec of WIDGETS) {
    if (!seen.has(spec.id)) {
      placements.push({ id: spec.id, size: spec.sizes[0] ?? 'S', isShown: false });
    }
  }

  return placements;
}

export function formatLayout(layout: HomeLayout): string {
  return JSON.stringify(layout);
}

export function isDefaultLayout(layout: HomeLayout): boolean {
  return formatLayout(layout) === formatLayout(DEFAULT_LAYOUT);
}

/** What the grid draws: shown, and usable — a widget that needs a match waits for one. */
export function visiblePlacements(layout: HomeLayout, hasMatches: boolean): readonly Placement[] {
  return layout.filter(
    (placement) => placement.isShown && (hasMatches || !widgetSpec(placement.id).needsMatch),
  );
}

/** Moves `from` to where `to` stands, which is what dragging one tile over another means. */
export function reorder(layout: HomeLayout, from: WidgetId, to: WidgetId): HomeLayout {
  const source = layout.findIndex((placement) => placement.id === from);
  const target = layout.findIndex((placement) => placement.id === to);
  const moved = layout[source];
  if (moved === undefined || target < 0 || source === target) return layout;

  const next = [...layout];
  next.splice(source, 1);
  next.splice(target, 0, moved);

  return next;
}

/**
 * One step along the *drawn* order, which is the one a reader sees: the neighbour it swaps with is
 * the previous or next tile on screen, not the previous or next entry in the stored list.
 */
export function moveAmong(
  layout: HomeLayout,
  id: WidgetId,
  delta: -1 | 1,
  drawn: readonly Placement[],
): HomeLayout {
  const at = drawn.findIndex((placement) => placement.id === id);
  const neighbour = drawn[at + delta];
  if (at < 0 || neighbour === undefined) return layout;

  const first = layout.findIndex((placement) => placement.id === id);
  const second = layout.findIndex((placement) => placement.id === neighbour.id);
  const a = layout[first];
  const b = layout[second];
  if (a === undefined || b === undefined) return layout;

  const next = [...layout];
  next[first] = b;
  next[second] = a;

  return next;
}

export function resize(layout: HomeLayout, id: WidgetId, size: WidgetSize): HomeLayout {
  if (!widgetSpec(id).sizes.includes(size)) return layout;

  return layout.map((placement) => (placement.id === id ? { ...placement, size } : placement));
}

export function setShown(layout: HomeLayout, id: WidgetId, isShown: boolean): HomeLayout {
  return layout.map((placement) => (placement.id === id ? { ...placement, isShown } : placement));
}

/** The grid cells a tile takes, on the three-column grid. The phone's two columns are CSS. */
export function spanOf(size: WidgetSize): { columns: number; rows: number } {
  switch (size) {
    case 'S':
      return { columns: 1, rows: 1 };
    case 'M':
      return { columns: 1, rows: 2 };
    case 'L':
      return { columns: 2, rows: 2 };
    case 'XL':
      return { columns: 2, rows: 4 };
  }
}
