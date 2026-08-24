import { asPlayerSlot, type PlayerInfo, type WeaponClass } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { labelPlacer } from '../helpers/label-placer';
import { LABEL_HEIGHT_PX, labelPass, labelsBySlot } from '../helpers/labels';
import type { PlateBounds } from '../helpers/view';
import { stubPath2D } from './canvas-globals';

stubPath2D();

const PLATE: PlateBounds = { left: 0, top: 0, width: 640, height: 640 };
const LABEL_WIDTH = 60;
const TOKEN_RADIUS = 8;

function newPlayer(slot: number, name: string): PlayerInfo {
  return { slot: asPlayerSlot(slot), steamId: String(slot), name, team: 'CT' };
}

interface Label {
  x: number;
  y: number;
}

function overlaps(a: Label, b: Label): boolean {
  return (
    a.x < b.x + LABEL_WIDTH &&
    a.x + LABEL_WIDTH > b.x &&
    a.y < b.y + LABEL_HEIGHT_PX &&
    a.y + LABEL_HEIGHT_PX > b.y
  );
}

describe('labelsBySlot', () => {
  it('indexes by slot and leaves an unnamed slot empty', () => {
    const labels = labelsBySlot([newPlayer(2, 'ropz')], 4);

    expect(labels).toEqual(['', '', 'ropz', '']);
  });

  it('truncates a name too long to sit beside a token', () => {
    const labels = labelsBySlot([newPlayer(0, 'a-very-long-nickname')], 1);

    expect(labels[0]).toBe('a-very-long-n…');
  });

  it('ignores a player whose slot the track has no column for', () => {
    expect(labelsBySlot([newPlayer(9, 'ropz')], 2)).toEqual(['', '']);
  });
});

describe('labelPlacer', () => {
  it('moves the second label rather than letting the two overlap', () => {
    const placer = labelPlacer(2, LABEL_HEIGHT_PX);

    placer.place(320, 320, TOKEN_RADIUS, LABEL_WIDTH, PLATE);
    const first = { x: placer.x, y: placer.y };

    placer.place(320, 320, TOKEN_RADIUS, LABEL_WIDTH, PLATE);
    const second = { x: placer.x, y: placer.y };

    expect(overlaps(first, second)).toBe(false);
  });

  it('keeps a label inside the plate at either edge', () => {
    const placer = labelPlacer(1, LABEL_HEIGHT_PX);

    placer.place(PLATE.width, PLATE.height, TOKEN_RADIUS, LABEL_WIDTH, PLATE);

    expect(placer.x).toBe(PLATE.width - LABEL_WIDTH);
    expect(placer.y).toBe(PLATE.height - LABEL_HEIGHT_PX);
  });

  it('forgets the previous frame on reset, so a label may return to its first choice', () => {
    const placer = labelPlacer(2, LABEL_HEIGHT_PX);

    placer.place(320, 320, TOKEN_RADIUS, LABEL_WIDTH, PLATE);
    const alone = { x: placer.x, y: placer.y };

    placer.place(320, 320, TOKEN_RADIUS, LABEL_WIDTH, PLATE);
    placer.reset();
    placer.place(320, 320, TOKEN_RADIUS, LABEL_WIDTH, PLATE);

    expect({ x: placer.x, y: placer.y }).toEqual(alone);
  });
});

/** Where a label put its text, and how much geometry the weapon mark traced before it. */
interface Drawn {
  readonly text: string[];
  readonly textX: number[];
  /** Where each weapon mark was translated to, which is the only placement it has. */
  readonly markX: number[];
  /** One entry per weapon mark drawn — a `fill` taking a path, which nothing else in the pass does. */
  readonly marks: number[];
}

function newDrawn(): Drawn {
  return { text: [], textX: [], markX: [], marks: [] };
}

/** Only what the pass touches. What it draws is recorded; the rest is a sink. */
function newContext(drawn: Drawn): CanvasRenderingContext2D {
  const ignore = () => {};

  return {
    font: '',
    textAlign: 'left',
    textBaseline: 'middle',
    lineWidth: 0,
    lineJoin: 'round',
    strokeStyle: '',
    fillStyle: '',
    globalAlpha: 1,
    measureText: (text: string) => ({ width: text.length * 6 }),
    strokeText: ignore,
    fillText: (text: string, x: number) => {
      drawn.text.push(text);
      drawn.textX.push(x);
    },
    save: ignore,
    restore: ignore,
    translate: (x: number) => drawn.markX.push(x),
    beginPath: ignore,
    stroke: ignore,
    fill: (path?: unknown) => {
      if (path !== undefined) drawn.marks.push(drawn.marks.length);
    },
  } as unknown as CanvasRenderingContext2D;
}

const STYLE = { font: `10px sans-serif` };
const COLORS = { halo: '#halo', ink: '#ink' };

/** Two players, the second of them wherever the caller puts it. */
function subjectAt(x: number, y: number, weapon: WeaponClass | null = 'rifle') {
  return {
    isNamed: () => true,
    x: (slot: number) => (slot === 0 ? 320 : x),
    y: (slot: number) => (slot === 0 ? 320 : y),
    alpha: () => 1,
    weapon: () => weapon,
  };
}

describe('labelPass', () => {
  const pass = () => {
    const built = labelPass(['s1mple', 'ropz'], 2, STYLE, COLORS);
    built.measure(newContext(newDrawn()));

    return built;
  };

  it('names both players while both tokens are on the plate', () => {
    const drawn = newDrawn();

    pass().draw(newContext(drawn), PLATE, subjectAt(400, 400), TOKEN_RADIUS);

    expect(drawn.text).toEqual(['s1mple', 'ropz']);
  });

  it('drops the name of a token the zoom has left off the plate', () => {
    const drawn = newDrawn();

    // Panned so that the second player is past the right edge of what the reader can see. Clamping
    // its label to that edge instead is what put a row of names along a panned plate.
    pass().draw(newContext(drawn), PLATE, subjectAt(PLATE.width + 40, 400), TOKEN_RADIUS);

    expect(drawn.text).toEqual(['s1mple']);
  });

  it('reads the bounds rather than the canvas, so a pan moves what counts as on the plate', () => {
    const drawn = newDrawn();
    const panned = { left: 300, top: 300, width: PLATE.width, height: PLATE.height };

    // At rest this token is on the plate; under this pan the plate starts at 300 and it is behind
    // the reader.
    pass().draw(newContext(drawn), panned, subjectAt(120, 400), TOKEN_RADIUS);

    expect(drawn.text).toEqual(['s1mple']);
  });

  it('draws a weapon mark beside each name', () => {
    const drawn = newDrawn();

    pass().draw(newContext(drawn), PLATE, subjectAt(400, 400), TOKEN_RADIUS);

    expect(drawn.marks.length).toBeGreaterThan(0);
  });

  it('leaves the name where it is when the weapon draws nothing', () => {
    const withRifle = newDrawn();
    const withBomb = newDrawn();
    const withNothing = newDrawn();

    pass().draw(newContext(withRifle), PLATE, subjectAt(400, 400), TOKEN_RADIUS);
    pass().draw(newContext(withBomb), PLATE, subjectAt(400, 400, 'bomb'), TOKEN_RADIUS);
    pass().draw(newContext(withNothing), PLATE, subjectAt(400, 400, null), TOKEN_RADIUS);

    // §6.4's bomb and a slot no sample saw holding anything both draw nothing, and the box stays
    // reserved for both: a width that followed the weapon would twitch the name on every switch.
    expect(withBomb.marks).toEqual([]);
    expect(withNothing.marks).toEqual([]);
    expect(withBomb.textX).toEqual(withRifle.textX);
    expect(withNothing.textX).toEqual(withRifle.textX);
  });
});
