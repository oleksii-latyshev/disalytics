import type { TacticStep } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  interpolateAngleDeg,
  interpolateTacticStep,
  quadraticBezierPoint,
  UTILITY_ACTIVE_DURATIONS,
} from '../helpers/tactic-interpolation';

describe('interpolateAngleDeg', () => {
  it('interpolates linearly when within 180 degrees', () => {
    expect(interpolateAngleDeg(10, 50, 0)).toBe(10);
    expect(interpolateAngleDeg(10, 50, 1)).toBe(50);
    expect(interpolateAngleDeg(10, 50, 0.5)).toBe(30);
  });

  it('takes the shortest path across 0/360 boundary', () => {
    // 350 to 10 is a +20 deg change across 0
    const mid1 = interpolateAngleDeg(350, 10, 0.5);
    expect((mid1 + 360) % 360).toBeCloseTo(0);

    // 10 to 350 is a -20 deg change across 0
    const mid2 = interpolateAngleDeg(10, 350, 0.5);
    expect((mid2 + 360) % 360).toBeCloseTo(0);
  });

  it('handles negative angles correctly', () => {
    expect(interpolateAngleDeg(-90, 90, 0.5)).toBe(0);
  });
});

describe('quadraticBezierPoint', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 50, y: 100 };
  const p2 = { x: 100, y: 0 };

  it('returns start point at t = 0', () => {
    const pt = quadraticBezierPoint(p0, p1, p2, 0);
    expect(pt.x).toBe(0);
    expect(pt.y).toBe(0);
  });

  it('returns end point at t = 1', () => {
    const pt = quadraticBezierPoint(p0, p1, p2, 1);
    expect(pt.x).toBe(100);
    expect(pt.y).toBe(0);
  });

  it('returns curve midpoint at t = 0.5', () => {
    const pt = quadraticBezierPoint(p0, p1, p2, 0.5);
    expect(pt.x).toBe(50);
    expect(pt.y).toBe(50);
  });
});

describe('interpolateTacticStep', () => {
  const sampleSteps: readonly TacticStep[] = [
    {
      id: 'step-1',
      name: 'Spawn Setup',
      timeOffsetSeconds: 0,
      players: [
        { slot: 0, x: 100, y: 200, yaw: 0, label: '1' },
        { slot: 1, x: 300, y: 400, yaw: 90, label: '2' },
      ],
      throws: [
        {
          id: 'throw-smoke-a',
          throwerSlot: 0,
          kind: 'smoke',
          from: { x: 100, y: 200 },
          to: { x: 500, y: 600 },
          releaseTime: 1.0,
        },
      ],
      drawings: [
        {
          id: 'stroke-1',
          color: '#ff0000',
          points: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
          ],
        },
      ],
    },
    {
      id: 'step-2',
      name: 'Execute A',
      timeOffsetSeconds: 10,
      players: [
        { slot: 0, x: 200, y: 400, yaw: 180, label: '1' },
        { slot: 1, x: 500, y: 600, yaw: 90, label: '2' },
        { slot: 2, x: 700, y: 800, yaw: 270, label: '3' },
      ],
      throws: [],
      drawings: [],
    },
  ];

  it('handles empty steps', () => {
    const state = interpolateTacticStep([], 0);
    expect(state.players).toHaveLength(0);
    expect(state.flyingGrenades).toHaveLength(0);
    expect(state.activeUtilities).toHaveLength(0);
  });

  it('returns first step values when currentTime <= first step timestamp', () => {
    const state = interpolateTacticStep(sampleSteps, -1);
    expect(state.activeStepIndex).toBe(0);
    expect(state.players).toHaveLength(2);
    expect(state.players[0]?.x).toBe(100);
    expect(state.players[0]?.y).toBe(200);
    expect(state.drawings).toHaveLength(1);
  });

  it('interpolates player positions and view angles at midpoint', () => {
    const state = interpolateTacticStep(sampleSteps, 5);
    expect(state.activeStepIndex).toBe(0);

    const player0 = state.players.find((p) => p.slot === 0);
    expect(player0).toBeDefined();
    expect(player0?.x).toBe(150); // midpoint of 100 and 200
    expect(player0?.y).toBe(300); // midpoint of 200 and 400
    expect(player0?.yaw).toBe(90); // midpoint of 0 and 180

    const player1 = state.players.find((p) => p.slot === 1);
    expect(player1).toBeDefined();
    expect(player1?.x).toBe(400); // midpoint of 300 and 500
    expect(player1?.y).toBe(500); // midpoint of 400 and 600
  });

  it('detects in-flight grenades during playback', () => {
    // Throw released at step 0 (t=0) + releaseTime (1.0) = t=1.0s
    // Flight duration is 2.0s, so flying from t=1.0 to t=3.0s
    const state = interpolateTacticStep(sampleSteps, 2.0);
    expect(state.flyingGrenades).toHaveLength(1);

    const flight = state.flyingGrenades[0];
    expect(flight?.throwId).toBe('throw-smoke-a');
    expect(flight?.progress).toBeCloseTo(0.5);
    expect(flight?.currentPos.x).toBeGreaterThan(100);
    expect(flight?.currentPos.x).toBeLessThan(500);
  });

  it('detects active landed utility after flight completes', () => {
    // Released at t=1.0s, lands at t=3.0s.
    // Smoke duration is 18s, so active from t=3.0s to t=21.0s.
    const state = interpolateTacticStep(sampleSteps, 4.0);
    expect(state.flyingGrenades).toHaveLength(0);
    expect(state.activeUtilities).toHaveLength(1);

    const active = state.activeUtilities[0];
    expect(active?.throwId).toBe('throw-smoke-a');
    expect(active?.kind).toBe('smoke');
    expect(active?.elapsedSinceLanding).toBeCloseTo(1.0);
    expect(active?.totalDuration).toBe(UTILITY_ACTIVE_DURATIONS.smoke);
  });

  it('returns last step values when currentTime >= last step timestamp', () => {
    const state = interpolateTacticStep(sampleSteps, 15);
    expect(state.activeStepIndex).toBe(1);

    const player0 = state.players.find((p) => p.slot === 0);
    expect(player0?.x).toBe(200);
    expect(player0?.y).toBe(400);
    expect(player0?.yaw).toBe(180);

    const player2 = state.players.find((p) => p.slot === 2);
    expect(player2).toBeDefined();
    expect(player2?.x).toBe(700);
  });
});
