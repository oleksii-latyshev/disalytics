import { UTILITY_NAMES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import type { RadarColors } from '../helpers/colors';
import { PLATE_MARKS, type PlateMarkId } from '../helpers/plate-legend';

/**
 * Sentinels rather than the real palette: a mark that paints anything outside this table painted a
 * literal, which is the one defect DESIGN.md §10.6's legend exists to prevent.
 */
const COLORS: RadarColors = {
  team: { CT: '#ct0000', T: '#t00000' },
  dead: '#dead00',
  selectionRing: '#ring00',
  selectionEdge: '#edge00',
  label: { halo: '#halo00', ink: '#ink000' },
  damage: '#damage',
  blind: '#blind0',
  objective: '#objective',
  nadeHe: '#nadehe',
  nadeSmoke: '#smoke0',
  nadeMolotov: '#molotov',
  nadeDecoy: '#decoy0',
  trajectory: '#trajectory',
  killLine: '#killline',
};

const PALETTE = new Set<string>([
  COLORS.team.CT,
  COLORS.team.T,
  COLORS.dead,
  COLORS.selectionRing,
  COLORS.selectionEdge,
  COLORS.label.halo,
  COLORS.label.ink,
  COLORS.damage,
  COLORS.blind,
  COLORS.objective,
  COLORS.nadeHe,
  COLORS.nadeSmoke,
  COLORS.nadeMolotov,
  COLORS.nadeDecoy,
  COLORS.trajectory,
  COLORS.killLine,
]);

/**
 * Only what the marks themselves touch, in the shape `inBand`'s own test uses. Everything a draw
 * does with geometry is the renderer's business and already covered where it lives; what this
 * records is the ink.
 */
function newContext(painted: string[]): CanvasRenderingContext2D {
  const ignore = () => {};

  return {
    save: ignore,
    restore: ignore,
    beginPath: ignore,
    closePath: ignore,
    arc: ignore,
    moveTo: ignore,
    lineTo: ignore,
    quadraticCurveTo: ignore,
    fill: ignore,
    stroke: ignore,
    set fillStyle(value: string) {
      painted.push(value);
    },
    set strokeStyle(value: string) {
      painted.push(value);
    },
  } as unknown as CanvasRenderingContext2D;
}

function paint(id: PlateMarkId): readonly string[] {
  const mark = PLATE_MARKS.find((candidate) => candidate.id === id);
  if (mark === undefined) throw new Error(`No plate mark called ${id}.`);

  const painted: string[] = [];
  mark.draw(newContext(painted), COLORS);

  return painted;
}

describe('PLATE_MARKS', () => {
  it('names each mark once', () => {
    const ids = PLATE_MARKS.map((mark) => mark.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws every mark with a colour the renderer was given', () => {
    for (const mark of PLATE_MARKS) {
      const painted = paint(mark.id);

      expect(painted.length, `${mark.id} paints nothing`).toBeGreaterThan(0);

      for (const colour of painted) {
        expect(PALETTE, `${mark.id} paints ${colour}`).toContain(colour);
      }
    }
  });

  it('draws a mark for every piece of utility §6.2 puts on the plate', () => {
    const ids = new Set(PLATE_MARKS.map((mark) => mark.id));

    for (const id of ['he', 'flash', 'smoke', 'fire', 'decoy'] as const) {
      expect(ids).toContain(id);
    }
  });

  it('names utility in game vocabulary rather than in a string of its own', () => {
    const vocabulary = new Set(Object.values(UTILITY_NAMES));

    for (const mark of PLATE_MARKS) {
      if (mark.vocabulary === undefined) continue;

      expect(vocabulary, `${mark.id} is called ${mark.vocabulary}`).toContain(mark.vocabulary);
    }
  });

  it('gives each side its own colour where a mark carries a side', () => {
    expect(paint('player')).toEqual([COLORS.team.CT, COLORS.team.CT, COLORS.team.T, COLORS.team.T]);

    expect(paint('kill')).toEqual([COLORS.killLine, COLORS.team.CT, COLORS.team.T]);
  });
});
