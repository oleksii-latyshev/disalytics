import type { Lineup, TacticStep } from '@disa/demo-core';
import { getMapOverview, worldToRadar } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { addLineupThrowToStep, selectableLineups } from '../helpers/lineup-throw';
import { findNearestTacticLineup } from '../helpers/tactic-plot';

function lineup(id: string, side: Lineup['side'], kind: Lineup['kind']): Lineup {
  return {
    id,
    title: id,
    map: 'de_mirage',
    side,
    kind,
    origin: { x: -1000, y: -200, z: 0 },
    landing: { x: -300, y: -900, z: 0 },
    pitch: 0,
    yaw: 0,
    throwType: 'stand',
    movementKeys: [],
    movementKeysSummary: '',
    command: '',
    createdAt: 1,
  };
}

const step: TacticStep = {
  id: 's',
  name: '',
  timeOffsetSeconds: 0,
  players: [
    { slot: 0, x: 0, y: 0 },
    { slot: 1, x: 10, y: 10 },
  ],
  throws: [],
};

describe('selectableLineups', () => {
  it('keeps the side and both-sides lineups of the chosen kind', () => {
    const all = [
      lineup('t-smoke', 'T', 'smoke'),
      lineup('ct-smoke', 'CT', 'smoke'),
      lineup('both-smoke', 'BOTH', 'smoke'),
      lineup('t-flash', 'T', 'flash'),
    ];
    expect(selectableLineups(all, 'T', 'smoke').map((entry) => entry.id)).toEqual([
      't-smoke',
      'both-smoke',
    ]);
  });
});

describe('addLineupThrowToStep', () => {
  it('moves the thrower to the origin and adds a throw that remembers the lineup', () => {
    const next = addLineupThrowToStep(step, lineup('l1', 'T', 'smoke'), 1);
    expect(next.players.find((player) => player.slot === 1)).toMatchObject({ x: -1000, y: -200 });
    expect(next.players.find((player) => player.slot === 0)).toMatchObject({ x: 0, y: 0 });
    expect(next.throws).toHaveLength(1);
    expect(next.throws[0]).toMatchObject({
      throwerSlot: 1,
      kind: 'smoke',
      lineupId: 'l1',
      from: { x: -1000, y: -200 },
      to: { x: -300, y: -900 },
    });
  });
});

describe('findNearestTacticLineup', () => {
  it('picks the lineup landing under the pointer and none far away', () => {
    const overview = getMapOverview('de_mirage');
    if (overview === undefined) throw new Error('no overview');
    const near = lineup('near', 'T', 'smoke');
    const point = worldToRadar(overview, near.landing);
    expect(findNearestTacticLineup(point, [near], overview, 1)?.id).toBe('near');
    expect(
      findNearestTacticLineup({ x: point.x + 200, y: point.y }, [near], overview, 1),
    ).toBeNull();
  });
});
