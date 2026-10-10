import type { Lineup } from '@disa/demo-core';
import { getMapOverview, worldToRadar } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { selectableLineups, throwFromLineup } from '../helpers/lineup-throw';
import { lineupAt } from '../helpers/tactic-hit';

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

describe('throwFromLineup', () => {
  it('throws from the lineup origin to its landing and remembers the lineup', () => {
    expect(throwFromLineup(lineup('l1', 'T', 'smoke'), 1)).toMatchObject({
      throwerSlot: 1,
      kind: 'smoke',
      lineupId: 'l1',
      from: { x: -1000, y: -200 },
      to: { x: -300, y: -900 },
    });
  });
});

describe('lineupAt', () => {
  const overview = getMapOverview('de_mirage');
  if (overview === undefined) throw new Error('no overview');

  it('picks the lineup landing under the pointer and none far away', () => {
    const near = lineup('near', 'T', 'smoke');
    const point = worldToRadar(overview, near.landing);
    expect(lineupAt([near], point, point, overview, 1)?.id).toBe('near');
    expect(lineupAt([near], { x: point.x + 200, y: point.y }, point, overview, 1)).toBeNull();
  });

  it('prefers the origin nearest the player where several land on one spot', () => {
    const far = { ...lineup('far', 'T', 'smoke'), origin: { x: -3000, y: 900, z: 0 } };
    const close = lineup('close', 'T', 'smoke');
    const landing = worldToRadar(overview, close.landing);
    const player = worldToRadar(overview, close.origin);
    expect(lineupAt([far, close], landing, player, overview, 1)?.id).toBe('close');
  });
});
