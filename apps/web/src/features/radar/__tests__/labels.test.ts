import { asPlayerSlot, type PlayerInfo } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import type { CanvasSize } from '@/core/renderer';
import { LABEL_CHIP_HEIGHT_PX, labelPlacer, labelsBySlot } from '../helpers/labels';

const PLATE: CanvasSize = { width: 640, height: 640 };
const CHIP_WIDTH = 60;
const TOKEN_RADIUS = 5;

function newPlayer(slot: number, name: string): PlayerInfo {
  return { slot: asPlayerSlot(slot), steamId: String(slot), name, team: 'CT' };
}

interface Chip {
  x: number;
  y: number;
}

function overlaps(a: Chip, b: Chip): boolean {
  return (
    a.x < b.x + CHIP_WIDTH &&
    a.x + CHIP_WIDTH > b.x &&
    a.y < b.y + LABEL_CHIP_HEIGHT_PX &&
    a.y + LABEL_CHIP_HEIGHT_PX > b.y
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
    const placer = labelPlacer(2);

    placer.place(320, 320, TOKEN_RADIUS, CHIP_WIDTH, PLATE);
    const first = { x: placer.x, y: placer.y };

    placer.place(320, 320, TOKEN_RADIUS, CHIP_WIDTH, PLATE);
    const second = { x: placer.x, y: placer.y };

    expect(overlaps(first, second)).toBe(false);
  });

  it('keeps a chip inside the plate at either edge', () => {
    const placer = labelPlacer(1);

    placer.place(PLATE.width, PLATE.height, TOKEN_RADIUS, CHIP_WIDTH, PLATE);

    expect(placer.x).toBe(PLATE.width - CHIP_WIDTH);
    expect(placer.y).toBe(PLATE.height - LABEL_CHIP_HEIGHT_PX);
  });

  it('forgets the previous frame on reset, so a label may return to its first choice', () => {
    const placer = labelPlacer(2);

    placer.place(320, 320, TOKEN_RADIUS, CHIP_WIDTH, PLATE);
    const alone = { x: placer.x, y: placer.y };

    placer.place(320, 320, TOKEN_RADIUS, CHIP_WIDTH, PLATE);
    placer.reset();
    placer.place(320, 320, TOKEN_RADIUS, CHIP_WIDTH, PLATE);

    expect({ x: placer.x, y: placer.y }).toEqual(alone);
  });
});
