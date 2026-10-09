import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { lineupTargets } from '../helpers/lineup-targets';

function lineup(id: string, patch: Partial<Lineup> = {}): Lineup {
  return {
    id,
    title: `Lineup ${id}`,
    map: 'de_mirage',
    side: 'T',
    kind: 'smoke',
    origin: { x: 1000, y: 1000, z: 0 },
    landing: { x: -2500, y: -2500, z: 0 },
    pitch: 0,
    yaw: 0,
    throwType: 'jump',
    movementKeys: [],
    movementKeysSummary: '',
    command: '',
    createdAt: Number(id.replace(/\D/g, '')) || 1,
    ...patch,
  };
}

describe('lineupTargets', () => {
  it('groups lineups of one kind that land together and keeps the others apart', () => {
    const targets = lineupTargets('de_mirage', [
      lineup('a1'),
      lineup('a2', { landing: { x: -2400, y: -2500, z: 0 } }),
      lineup('a3', { kind: 'flash' }),
      lineup('a4', { landing: { x: 900, y: 900, z: 0 } }),
    ]);

    expect(targets.map((target) => target.variants.map((variant) => variant.id))).toEqual([
      ['a1', 'a2'],
      ['a3'],
      ['a4'],
    ]);
    expect(targets[0]?.throwCount).toBe(2);
  });

  it('does not join two floors', () => {
    const targets = lineupTargets('de_mirage', [
      lineup('a1'),
      lineup('a2', { landing: { x: -2500, y: -2500, z: 900 } }),
    ]);

    expect(targets).toHaveLength(2);
  });

  it('joins a landing group however far a member has been moved', () => {
    const grouped = { groupId: 'g' } as const;
    const targets = lineupTargets('de_mirage', [
      lineup('a1', grouped),
      lineup('a2', { ...grouped, landing: { x: 3000, y: 3000, z: 0 } }),
    ]);

    expect(targets).toHaveLength(1);
  });

  it('does not join an origin group, even next to a landing group, whose members share a throw spot and not a landing', () => {
    const grouped = { originGroupId: 'g' } as const;
    const targets = lineupTargets('de_mirage', [
      lineup('a1', grouped),
      lineup('a2', { ...grouped, landing: { x: 3000, y: 3000, z: 0 } }),
    ]);

    expect(targets).toHaveLength(2);
  });

  it('keeps an origin group out of the target a landing group makes', () => {
    const targets = lineupTargets('de_mirage', [
      lineup('a1', { groupId: 'g', originGroupId: 'o' }),
      lineup('a2', { groupId: 'g', originGroupId: 'o' }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.throwCount).toBe(2);
  });

  it('takes the target id from the oldest lineup, so adding a position does not change it', () => {
    const before = lineupTargets('de_mirage', [lineup('a5')]);
    const after = lineupTargets('de_mirage', [lineup('a9'), lineup('a5')]);

    expect(before[0]?.id).toBe('a5');
    expect(after[0]?.id).toBe('a5');
    expect(after[0]?.variants.map((variant) => variant.id)).toEqual(['a5', 'a9']);
  });

  it('orders targets by positions, most first', () => {
    const targets = lineupTargets('de_mirage', [
      lineup('a1', { landing: { x: 900, y: 900, z: 0 } }),
      lineup('a2'),
      lineup('a3'),
    ]);

    expect(targets.map((target) => target.id)).toEqual(['a2', 'a1']);
  });

  it('says both sides when the lineups are for both', () => {
    const [target] = lineupTargets('de_mirage', [lineup('a1'), lineup('a2', { side: 'CT' })]);

    expect(target?.side).toBe('BOTH');
    expect(lineupTargets('de_mirage', [lineup('a1', { side: 'CT' })])[0]?.side).toBe('CT');
  });

  it('names a target by the callout its lineup carries, then by where it lands, then by its title', () => {
    const [carried] = lineupTargets('de_mirage', [lineup('a1', { targetCallout: 'Window' })]);
    const [titled] = lineupTargets('de_mirage', [
      lineup('a1', { landing: { x: 9e6, y: 9e6, z: 0 }, title: 'My smoke' }),
    ]);

    expect(carried?.name).toBe('Window');
    expect(titled?.name).toBe('My smoke');
  });

  it('reads where a target came from', () => {
    const builtIn = lineupTargets('de_mirage', [lineup('a1', { isBuiltIn: true })])[0];
    const fromMatch = lineupTargets('de_mirage', [lineup('a1', { fromDemo: true })])[0];
    const mixed = lineupTargets('de_mirage', [lineup('a1', { isBuiltIn: true }), lineup('a2')])[0];

    expect(builtIn?.source).toBe('builtIn');
    expect(fromMatch?.source).toBe('match');
    expect(mixed?.source).toBe('mine');
  });
});
