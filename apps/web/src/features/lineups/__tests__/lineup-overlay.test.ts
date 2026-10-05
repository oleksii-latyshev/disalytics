import type { Lineup } from '@disa/demo-core';
import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { arcPath, draftOverlay, targetOverlay } from '../helpers/lineup-overlay';
import { lineupTargets } from '../helpers/lineup-targets';
import { platePointOf } from '../helpers/plate-point';

const overview = getMapOverview('de_mirage');
if (overview === undefined) throw new Error('mirage has an overview');

const lineup = (id: string, patch: Partial<Lineup> = {}): Lineup => ({
  id,
  title: id,
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 0, y: 0, z: 0 },
  landing: { x: -1000, y: -1000, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'jump',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  ...patch,
});

describe('arcPath', () => {
  it('is empty with no points and a bare move with one', () => {
    expect(arcPath([])).toBe('');
    expect(arcPath([{ x: 1, y: 2 }])).toBe('M1.0 2.0');
  });

  it('bows one leg to one side of the straight line', () => {
    expect(
      arcPath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
    ).toBe('M0.0 0.0 Q50.0 18.0 100.0 0.0');
  });

  it('gives each leg of a bounced throw its own curve', () => {
    const path = arcPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);

    expect(path.match(/Q/g)).toHaveLength(2);
    expect(path.endsWith('100.0 100.0')).toBe(true);
  });
});

describe('targetOverlay', () => {
  it('draws an arc per position with the active one lit, ending at its own landing', () => {
    const [target] = lineupTargets('de_mirage', [
      lineup('a', { origin: { x: 10, y: 10, z: 0 } }),
      lineup('b', { origin: { x: 500, y: 500, z: 0 }, createdAt: 2 }),
    ]);
    if (target === undefined) throw new Error('one target');

    const plot = targetOverlay(overview, target, 'b');

    expect(plot.arcs.map(({ id, isActive }) => [id, isActive])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(plot.landing).toEqual(platePointOf(overview, target.landing));
    expect(plot.radiusPlatePx).toBeGreaterThan(14);
  });

  it('routes an arc through the lineup bounces', () => {
    const [target] = lineupTargets('de_mirage', [
      lineup('a', { waypoints: [{ x: -300, y: -300, z: 0 }] }),
    ]);
    if (target === undefined) throw new Error('one target');

    expect(targetOverlay(overview, target, 'a').arcs[0]?.path.match(/Q/g)).toHaveLength(2);
  });
});

describe('draftOverlay', () => {
  it('has no arc until both points are placed, and keeps a ring for a decoy', () => {
    const landing = { x: 100, y: 100 };

    expect(draftOverlay(overview, { kind: 'decoy', landing, origin: null }).arcs).toEqual([]);
    expect(draftOverlay(overview, { kind: 'decoy', landing, origin: null }).radiusPlatePx).toBe(14);
    expect(
      draftOverlay(overview, { kind: 'smoke', landing, origin: { x: 5, y: 5 } }).arcs,
    ).toHaveLength(1);
  });
});
