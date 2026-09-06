import { describe, expect, it } from 'vitest';
import { drawLeaderLine, LEADER_WIDTH_PX, leaderStroke } from '../helpers/leader-line';

interface Line {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/** Only what the line touches: where it started, where it ended, and what it was stroked with. */
function newContext(lines: Line[], state: { width: number; ink: string }) {
  let fromX = 0;
  let fromY = 0;

  return {
    beginPath: () => {},
    stroke: () => {},
    moveTo: (x: number, y: number) => {
      fromX = x;
      fromY = y;
    },
    lineTo: (x: number, y: number) => lines.push({ fromX, fromY, toX: x, toY: y }),
    set lineWidth(value: number) {
      state.width = value;
    },
    set strokeStyle(value: string) {
      state.ink = value;
    },
  } as unknown as CanvasRenderingContext2D;
}

const TOKEN_RADIUS = 8;

function drawn(
  tokenX: number,
  tokenY: number,
  box: { x: number; y: number; width: number; height: number },
): Line[] {
  const lines: Line[] = [];
  const context = newContext(lines, { width: 0, ink: '' });

  drawLeaderLine(context, tokenX, tokenY, TOKEN_RADIUS, box.x, box.y, box.width, box.height);

  return lines;
}

describe('leaderStroke', () => {
  it('sets the hairline and the ink it was given', () => {
    const state = { width: 0, ink: '' };

    leaderStroke(newContext([], state), '#leader');

    expect(state).toEqual({ width: LEADER_WIDTH_PX, ink: '#leader' });
  });
});

describe('drawLeaderLine', () => {
  it('runs from the token rim to the nearest edge of the box, not to its centre', () => {
    // A box two rows above the token: the shortest statement of "this one" is straight up.
    const lines = drawn(100, 200, { x: 60, y: 100, width: 80, height: 17 });

    expect(lines).toEqual([{ fromX: 100, fromY: 200 - TOKEN_RADIUS, toX: 100, toY: 117 }]);
  });

  it('leaves the token uncovered whichever way the box lies', () => {
    const lines = drawn(100, 100, { x: 160, y: 96, width: 80, height: 17 });

    // Straight out to the right, so the rim is one radius along that line and the end is the box's
    // left edge at the token's own height.
    expect(lines).toEqual([{ fromX: 108, fromY: 100, toX: 160, toY: 100 }]);
  });

  it('says nothing where the box is already against the token', () => {
    expect(drawn(100, 100, { x: 96, y: 104, width: 80, height: 17 })).toEqual([]);
  });

  it('says nothing where the token stands inside the box', () => {
    expect(drawn(100, 100, { x: 60, y: 92, width: 80, height: 17 })).toEqual([]);
  });
});
