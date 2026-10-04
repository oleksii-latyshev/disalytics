import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  formatLayout,
  type HomeLayout,
  isDefaultLayout,
  moveAmong,
  parseLayout,
  reorder,
  resize,
  setShown,
  sizeDimensions,
  spanOf,
  visiblePlacements,
} from '../helpers/home-layout';
import { WIDGETS, type WidgetSize } from '../helpers/home-widgets';

const ids = (layout: HomeLayout) => layout.map((placement) => placement.id);

describe('parseLayout', () => {
  it('is the default for nothing, for garbage and for the wrong shape', () => {
    expect(parseLayout('')).toBe(DEFAULT_LAYOUT);
    expect(parseLayout('{not json')).toBe(DEFAULT_LAYOUT);
    expect(parseLayout('{"id":"hero"}')).toBe(DEFAULT_LAYOUT);
    expect(parseLayout('[1,"x",null]')).toBe(DEFAULT_LAYOUT);
  });

  it('round-trips a layout', () => {
    const moved = reorder(DEFAULT_LAYOUT, 'lineup', 'hero');
    expect(parseLayout(formatLayout(moved))).toEqual(moved);
  });

  it('drops unknown and repeated widgets and keeps the first of a repeat', () => {
    const parsed = parseLayout(
      JSON.stringify([
        { id: 'stats', size: 'L', isShown: true },
        { id: 'gone', size: 'S', isShown: true },
        { id: 'stats', size: 'M', isShown: false },
      ]),
    );

    expect(parsed.filter((placement) => placement.id === 'stats')).toEqual([
      { id: 'stats', size: 'L', isShown: true },
    ]);
    expect(ids(parsed)).not.toContain('gone');
  });

  it('puts widgets added since the string was written at the end, hidden', () => {
    const parsed = parseLayout(JSON.stringify([{ id: 'hero', size: 'L', isShown: true }]));

    expect(parsed).toHaveLength(WIDGETS.length);
    expect(parsed[0]).toEqual({ id: 'hero', size: 'L', isShown: true });
    expect(parsed.slice(1).every((placement) => !placement.isShown)).toBe(true);
  });

  it('falls to the smallest size a widget offers when the stored one is not offered', () => {
    const parsed = parseLayout(JSON.stringify([{ id: 'hero', size: 'S', isShown: true }]));

    expect(parsed[0]?.size).toBe('L');
  });
});

describe('reorder', () => {
  it('moves a widget to where another stands', () => {
    const next = reorder(DEFAULT_LAYOUT, 'hero', 'tactics');

    expect(ids(next).indexOf('hero')).toBe(ids(DEFAULT_LAYOUT).indexOf('tactics'));
    expect(next).toHaveLength(DEFAULT_LAYOUT.length);
  });

  it('is the same layout for itself and for a widget that is not there', () => {
    expect(reorder(DEFAULT_LAYOUT, 'hero', 'hero')).toBe(DEFAULT_LAYOUT);
    expect(reorder(DEFAULT_LAYOUT, 'hero', 'nope' as never)).toBe(DEFAULT_LAYOUT);
  });
});

describe('moveAmong', () => {
  it('swaps with the neighbour on screen, skipping hidden widgets between them', () => {
    const drawn = visiblePlacements(DEFAULT_LAYOUT, true);
    const hidden = setShown(DEFAULT_LAYOUT, 'tactics', false);
    const shown = visiblePlacements(hidden, true);
    const next = moveAmong(hidden, 'stats', 1, shown);

    expect(drawn.length).toBeGreaterThan(shown.length);
    expect(ids(next).indexOf('stats')).toBeGreaterThan(ids(next).indexOf('open'));
    expect(ids(next).indexOf('open')).toBeLessThan(ids(next).indexOf('stats'));
  });

  it('stops at either end', () => {
    const drawn = visiblePlacements(DEFAULT_LAYOUT, true);

    expect(moveAmong(DEFAULT_LAYOUT, 'hero', -1, drawn)).toBe(DEFAULT_LAYOUT);
    const last = drawn.at(-1);
    expect(last).toBeDefined();
    expect(moveAmong(DEFAULT_LAYOUT, last?.id ?? 'hero', 1, drawn)).toBe(DEFAULT_LAYOUT);
  });
});

describe('resize and setShown', () => {
  it('resizes within the sizes a widget offers and ignores the rest', () => {
    expect(resize(DEFAULT_LAYOUT, 'hero', 'L').find((p) => p.id === 'hero')?.size).toBe('L');
    expect(resize(DEFAULT_LAYOUT, 'hero', 'S')).toBe(DEFAULT_LAYOUT);
  });

  it('hides and shows without moving anything', () => {
    const hidden = setShown(DEFAULT_LAYOUT, 'recent', false);

    expect(ids(hidden)).toEqual(ids(DEFAULT_LAYOUT));
    expect(hidden.find((p) => p.id === 'recent')?.isShown).toBe(false);
    expect(isDefaultLayout(setShown(hidden, 'recent', true))).toBe(true);
  });
});

describe('visiblePlacements', () => {
  it('leaves out what is hidden', () => {
    expect(ids(visiblePlacements(DEFAULT_LAYOUT, true))).not.toContain('coach');
  });

  it('leaves out what needs a match until there is one', () => {
    const first = ids(visiblePlacements(DEFAULT_LAYOUT, false));

    expect(first).toContain('hero');
    expect(first).not.toContain('stats');
    expect(first).not.toContain('open');
  });
});

describe('spanOf', () => {
  it('names the four sizes in grid cells', () => {
    expect(spanOf('S')).toEqual({ columns: 1, rows: 1 });
    expect(spanOf('M')).toEqual({ columns: 1, rows: 2 });
    expect(spanOf('L')).toEqual({ columns: 2, rows: 2 });
    expect(spanOf('XL')).toEqual({ columns: 2, rows: 4 });
  });
});

describe('sizeDimensions', () => {
  it('writes columns by rows for every size', () => {
    const sizes: readonly WidgetSize[] = ['S', 'M', 'L', 'XL'];
    expect(sizes.map(sizeDimensions)).toEqual(['1×1', '1×2', '2×2', '2×4']);
  });
});
