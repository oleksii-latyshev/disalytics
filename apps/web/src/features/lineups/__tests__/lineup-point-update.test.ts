import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { updateLineupsAtPoint } from '../helpers/update-lineup-point';

const lineup = (id: string): Lineup => ({
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
  movementKeysSummary: 'Stand',
  command: '',
  createdAt: 1,
});

describe('updateLineupsAtPoint', () => {
  it('moves every origin in the matching shared-origin group and preserves z', () => {
    const lineups: readonly Lineup[] = [
      { ...lineup('a'), groupId: 'shared', groupTarget: 'origin' },
      {
        ...lineup('b'),
        groupId: 'shared',
        groupTarget: 'origin',
        origin: { x: -1, y: -2, z: 99 },
      },
      { ...lineup('other'), groupId: 'other-group', groupTarget: 'origin' },
      { ...lineup('landing-member'), groupId: 'shared', groupTarget: 'landing' },
    ];

    const updated = updateLineupsAtPoint({
      lineups,
      lineupId: 'a',
      target: 'origin',
      point: { x: 300, y: 400 },
    });

    expect(updated?.map(({ id, origin }) => [id, origin])).toEqual([
      ['a', { x: 300, y: 400, z: 30 }],
      ['b', { x: 300, y: 400, z: 99 }],
    ]);
  });

  it('moves every shared landing and recalculates each member callout', () => {
    const lineups: readonly Lineup[] = [
      { ...lineup('a'), groupId: 'shared', groupTarget: 'landing', targetCallout: 'Old A' },
      {
        ...lineup('b'),
        groupId: 'shared',
        groupTarget: 'landing',
        landing: { x: -1, y: -2, z: 99 },
        targetCallout: 'Old B',
      },
      { ...lineup('unrelated'), groupId: 'other-group', groupTarget: 'landing' },
    ];
    const resolveCallout = (point: { readonly x: number; readonly y: number }) =>
      `${point.x},${point.y}`;

    const updated = updateLineupsAtPoint({
      lineups,
      lineupId: 'a',
      target: 'landing',
      point: { x: 300, y: 400 },
      resolveCallout,
    });

    expect(updated?.map(({ id, landing, targetCallout }) => [id, landing, targetCallout])).toEqual([
      ['a', { x: 300, y: 400, z: 60 }, '300,400'],
      ['b', { x: 300, y: 400, z: 99 }, '300,400'],
    ]);
  });

  it('updates an independent endpoint or waypoint only on the clicked lineup', () => {
    const lineups: readonly Lineup[] = [
      {
        ...lineup('a'),
        groupId: 'shared',
        groupTarget: 'landing',
        waypoints: [{ x: 1, y: 2, z: 3 }],
      },
      { ...lineup('b'), groupId: 'shared', groupTarget: 'landing' },
    ];
    const updateIndependentOrigin = updateLineupsAtPoint({
      lineups,
      lineupId: 'a',
      target: 'origin',
      point: { x: 7, y: 8 },
    });
    const updateWaypoint = updateLineupsAtPoint({
      lineups,
      lineupId: 'a',
      target: 'waypoint',
      point: { x: 9, y: 10 },
      waypointIndex: 0,
    });

    expect(updateIndependentOrigin?.map(({ id, origin }) => [id, origin])).toEqual([
      ['a', { x: 7, y: 8, z: 30 }],
    ]);
    expect(updateWaypoint?.map(({ id, waypoints }) => [id, waypoints])).toEqual([
      ['a', [{ x: 9, y: 10, z: 3 }]],
    ]);
  });

  it('takes the altitude it is given, which is how a point reaches another floor', () => {
    const updated = updateLineupsAtPoint({
      lineups: [lineup('a')],
      lineupId: 'a',
      target: 'origin',
      point: { x: 7, y: 8, z: -600 },
    });

    expect(updated?.[0]?.origin).toEqual({ x: 7, y: 8, z: -600 });
  });
});
