import { describe, expect, it } from 'vitest';
import { grenadePrice, tacticLoadout } from '../helpers/tactic-loadout';
import type { Tactic, TacticSide, TacticThrow } from '../helpers/tactics';
import type { UtilityKind } from '../helpers/utility';

function thrown(id: string, throwerSlot: number, kind: UtilityKind): TacticThrow {
  return {
    id,
    throwerSlot,
    kind,
    from: { x: 0, y: 0 },
    to: { x: 100, y: 100 },
    releaseTime: 0,
  };
}

function tacticWith(side: TacticSide, ...stepThrows: readonly (readonly TacticThrow[])[]): Tactic {
  return {
    id: 't',
    title: '',
    map: 'de_mirage',
    side,
    createdAt: 0,
    updatedAt: 0,
    steps: stepThrows.map((throws, index) => ({
      id: `s${index}`,
      name: '',
      timeOffsetSeconds: index * 5,
      players: [0, 1, 2, 3, 4].map((slot) => ({ slot, x: 0, y: 0 })),
      throws,
    })),
  };
}

describe('grenadePrice', () => {
  it('reads fire as the Molotov for T and the Incendiary for CT', () => {
    expect(grenadePrice('fire', 'T')).toBe(400);
    expect(grenadePrice('fire', 'CT')).toBe(500);
    expect(grenadePrice('smoke', 'T')).toBe(300);
    expect(grenadePrice('flash', 'CT')).toBe(200);
  });
});

describe('tacticLoadout', () => {
  it('is empty for a tactic without throws but still lists the players', () => {
    const loadout = tacticLoadout(tacticWith('T', []));
    expect(loadout.players).toHaveLength(5);
    expect(loadout.teamTotal).toBe(0);
    expect(loadout.teamCost).toBe(0);
    expect(loadout.warnings).toEqual([]);
  });

  it('counts a throw against its thrower across every step', () => {
    const loadout = tacticLoadout(
      tacticWith(
        'T',
        [thrown('a', 0, 'smoke'), thrown('b', 1, 'flash')],
        [thrown('c', 1, 'flash'), thrown('d', 2, 'fire')],
      ),
    );
    const byslot = new Map(loadout.players.map((player) => [player.slot, player]));
    expect(byslot.get(1)?.counts.flash).toBe(2);
    expect(byslot.get(1)?.cost).toBe(400);
    expect(byslot.get(2)?.cost).toBe(400);
    expect(loadout.teamCounts).toEqual({ he: 0, flash: 2, smoke: 1, fire: 1, decoy: 0 });
    expect(loadout.teamTotal).toBe(4);
    expect(loadout.teamCost).toBe(300 + 400 + 400);
  });

  it('prices fire by side', () => {
    expect(tacticLoadout(tacticWith('CT', [thrown('a', 0, 'fire')])).teamCost).toBe(500);
  });

  it('ignores kinds that are not thrown', () => {
    const loadout = tacticLoadout(tacticWith('CT', [thrown('a', 0, 'kit')]));
    expect(loadout.teamTotal).toBe(0);
  });

  it('includes a thrower that is not in the roster', () => {
    const loadout = tacticLoadout(tacticWith('T', [thrown('a', 7, 'he')]));
    expect(loadout.players.map((player) => player.slot)).toContain(7);
  });

  it('warns about carrying more than the game allows', () => {
    const loadout = tacticLoadout(
      tacticWith('T', [
        thrown('a', 0, 'flash'),
        thrown('b', 0, 'flash'),
        thrown('c', 0, 'flash'),
        thrown('d', 0, 'smoke'),
        thrown('e', 0, 'smoke'),
      ]),
    );
    expect(loadout.warnings).toEqual([
      { code: 'flashLimit', slot: 0, count: 3 },
      { code: 'kindLimit', slot: 0, kind: 'smoke', count: 2 },
      { code: 'totalLimit', slot: 0, count: 5 },
    ]);
  });

  it('does not warn at exactly the limits', () => {
    const loadout = tacticLoadout(
      tacticWith('T', [
        thrown('a', 0, 'flash'),
        thrown('b', 0, 'flash'),
        thrown('c', 0, 'smoke'),
        thrown('d', 0, 'he'),
      ]),
    );
    expect(loadout.warnings).toEqual([]);
  });
});
