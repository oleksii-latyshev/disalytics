import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { movedLineups, withMove } from '../helpers/lineup-move';

const lineup = (id: string, patch: Partial<Lineup> = {}): Lineup => ({
  id,
  title: id,
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 10, y: 20, z: 30 },
  landing: { x: 40, y: 50, z: 60 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  isBuiltIn: true,
  ...patch,
});

describe('withMove', () => {
  const group = { groupId: 'g' } as const;
  const lineups = [lineup('a', group), lineup('b', group), lineup('c')];

  it('is the lineups as they are when nothing is being moved', () => {
    expect(withMove(lineups, null)).toBe(lineups);
  });

  it('moves a shared landing for every lineup in its group and leaves the others', () => {
    const shown = withMove(lineups, {
      lineupId: 'a',
      target: 'landing',
      point: { x: 1, y: 2 },
    });

    expect(shown.map((item) => item.landing)).toEqual([
      { x: 1, y: 2, z: 60 },
      { x: 1, y: 2, z: 60 },
      lineups[2]?.landing,
    ]);
    expect(shown.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('is the user own copy once it has moved', () => {
    const [moved] = movedLineups(
      lineups,
      { lineupId: 'c', target: 'origin', point: { x: 5, y: 6 } },
      null,
    );

    expect(moved).toMatchObject({ id: 'c', isBuiltIn: false, origin: { x: 5, y: 6, z: 30 } });
  });

  it('keeps the callout a landing had when it is dropped where no callout is', () => {
    const [moved] = movedLineups(
      [lineup('c', { targetCallout: 'Window' })],
      { lineupId: 'c', target: 'landing', point: { x: 1e7, y: 1e7 } },
      'de_mirage',
    );

    expect(moved?.targetCallout).toBe('Window');
  });
});
