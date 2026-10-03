import type { TacticDrawingStroke, TacticPlayerPosition, TacticThrow } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import {
  findNearestTacticDrawing,
  findNearestTacticPlayer,
  findNearestTacticThrow,
  tacticRadarToWorld,
  tacticWorldToRadar,
} from '../helpers/tactic-plot';

const OVERVIEW: MapOverview = {
  id: 'de_mirage',
  posX: -3230,
  posY: 1713,
  scale: 5,
  rotate: 0,
  zoom: 1,
  levels: [
    {
      image: 'de_mirage',
      altitudeMax: 10000,
      altitudeMin: -10000,
    },
  ],
};

describe('tactic coordinates', () => {
  it('converts world to radar and back accurately', () => {
    const worldPoint = { x: -1200, y: 500 };
    const radarPoint = tacticWorldToRadar(OVERVIEW, worldPoint);
    const roundTrip = tacticRadarToWorld(OVERVIEW, radarPoint);

    expect(roundTrip.x).toBeCloseTo(worldPoint.x);
    expect(roundTrip.y).toBeCloseTo(worldPoint.y);
  });
});

describe('findNearestTacticPlayer', () => {
  const players: readonly TacticPlayerPosition[] = [
    { slot: 0, x: -1000, y: 500, label: '1' },
    { slot: 1, x: 0, y: 0, label: '2' },
  ];

  it('finds player within threshold', () => {
    const player0 = players[0];
    expect(player0).toBeDefined();
    if (player0 === undefined) return;

    const player0Radar = tacticWorldToRadar(OVERVIEW, player0);
    // Click within 5 pixels of player 0
    const clickRadar = { x: player0Radar.x + 2, y: player0Radar.y + 2 };

    const hit = findNearestTacticPlayer(clickRadar, players, OVERVIEW, 1.0, 20);
    expect(hit).not.toBeNull();
    expect(hit?.slot).toBe(0);
    expect(hit?.index).toBe(0);
  });

  it('returns null when click is too far', () => {
    const farClick = { x: 999, y: 999 };
    const hit = findNearestTacticPlayer(farClick, players, OVERVIEW, 1.0, 20);
    expect(hit).toBeNull();
  });
});

describe('findNearestTacticThrow', () => {
  const throws: readonly TacticThrow[] = [
    {
      id: 'throw-smoke-mid',
      throwerSlot: 0,
      kind: 'smoke',
      from: { x: -1000, y: 500 },
      to: { x: -200, y: 100 },
      releaseTime: 0,
    },
  ];

  it('hits origin (from) within threshold', () => {
    const throw0 = throws[0];
    expect(throw0).toBeDefined();
    if (throw0 === undefined) return;

    const fromRadar = tacticWorldToRadar(OVERVIEW, throw0.from);
    const clickRadar = { x: fromRadar.x + 3, y: fromRadar.y - 2 };

    const hit = findNearestTacticThrow(clickRadar, throws, OVERVIEW, 1.0, 18);
    expect(hit).not.toBeNull();
    expect(hit?.throwId).toBe('throw-smoke-mid');
    expect(hit?.end).toBe('from');
  });

  it('hits destination (to) within threshold', () => {
    const throw0 = throws[0];
    expect(throw0).toBeDefined();
    if (throw0 === undefined) return;

    const toRadar = tacticWorldToRadar(OVERVIEW, throw0.to);
    const clickRadar = { x: toRadar.x - 1, y: toRadar.y + 2 };

    const hit = findNearestTacticThrow(clickRadar, throws, OVERVIEW, 1.0, 18);
    expect(hit).not.toBeNull();
    expect(hit?.throwId).toBe('throw-smoke-mid');
    expect(hit?.end).toBe('to');
  });

  it('returns null when outside threshold', () => {
    const farClick = { x: 500, y: 500 };
    const hit = findNearestTacticThrow(farClick, throws, OVERVIEW, 1.0, 18);
    expect(hit).toBeNull();
  });
});

describe('findNearestTacticDrawing', () => {
  const drawings: readonly TacticDrawingStroke[] = [
    {
      id: 'stroke-1',
      color: '#ffffff',
      points: [
        { x: -1000, y: 500 },
        { x: -500, y: 500 },
      ],
    },
  ];

  it('hits along the stroke line segment', () => {
    // Midpoint of the line
    const midWorld = { x: -750, y: 500 };
    const midRadar = tacticWorldToRadar(OVERVIEW, midWorld);
    const clickRadar = { x: midRadar.x, y: midRadar.y + 2 };

    const hitIndex = findNearestTacticDrawing(clickRadar, drawings, OVERVIEW, 1.0, 14);
    expect(hitIndex).toBe(0);
  });

  it('returns null when far from stroke', () => {
    const farClick = { x: 800, y: 800 };
    const hitIndex = findNearestTacticDrawing(farClick, drawings, OVERVIEW, 1.0, 14);
    expect(hitIndex).toBeNull();
  });
});
