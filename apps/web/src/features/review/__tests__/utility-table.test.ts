import type { UtilityFigures } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { bestUtilityValue, perRound, UTILITY_TABLES } from '../helpers/utility-table';

function newFigures(overrides: Partial<UtilityFigures> = {}): UtilityFigures {
  return {
    rounds: 10,
    thrown: { he: 0, flash: 0, smoke: 0, fire: 0, decoy: 0 },
    enemiesBlinded: 0,
    enemyBlindSeconds: 0,
    teamFlashes: 0,
    flashAssists: 0,
    utilityDamage: 0,
    unusedDollars: 0,
    unusedGrenades: 0,
    ...overrides,
  };
}

const columns = UTILITY_TABLES.flatMap((table) => table.columns);
const column = (id: string) => {
  const found = columns.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no column ${id}`);
  return found;
};

describe('utility columns', () => {
  it('states grenades per round played, and nothing over no rounds', () => {
    const figures = newFigures({ thrown: { he: 5, flash: 10, smoke: 0, fire: 0, decoy: 0 } });

    expect(column('he').read(figures)).toBe(0.5);
    expect(column('total').read(figures)).toBe(1.5);
    expect(perRound(3, 0)).toBeNull();
    expect(column('he').read(newFigures({ rounds: 0 }))).toBeNull();
  });

  it('marks exactly the four flash figures a recording without blinds cannot state', () => {
    const needing = columns.filter((entry) => entry.needsFlashData).map((entry) => entry.id);

    expect(needing).toEqual(['enemiesPerFlash', 'averageBlind', 'teamFlashes', 'flashAssists']);
  });

  it('reads enemies per flash and the average blind as unknown without a flash or a blind', () => {
    expect(column('enemiesPerFlash').read(newFigures())).toBeNull();
    expect(column('averageBlind').read(newFigures())).toBeNull();
    expect(
      column('enemiesPerFlash').read(
        newFigures({
          thrown: { he: 0, flash: 4, smoke: 0, fire: 0, decoy: 0 },
          enemiesBlinded: 6,
        }),
      ),
    ).toBe(1.5);
  });

  it('names no best in a column of one shared figure, and the lowest in a lower-is-better one', () => {
    const players = [newFigures({ unusedDollars: 200 }), newFigures({ unusedDollars: 600 })];

    expect(bestUtilityValue(players, column('unusedDollars'))).toBe(200);
    expect(bestUtilityValue([newFigures(), newFigures()], column('unusedDollars'))).toBeNull();
  });
});
