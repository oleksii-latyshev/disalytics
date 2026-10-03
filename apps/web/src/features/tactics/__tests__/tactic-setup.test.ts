import { getMapOverview, MAP_IDS, RADAR_IMAGE_SIZE, worldToRadar } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import {
  changeTacticMap,
  changeTacticSide,
  createNewTactic,
  hasEditorWork,
  startingPlayers,
  toggleTacticRound,
} from '../helpers/tactic-setup';

describe('startingPlayers', () => {
  it('spreads five players across the plate, far enough apart for their tokens', () => {
    for (const map of MAP_IDS) {
      const overview = getMapOverview(map);
      if (overview === undefined) throw new Error(`no overview for ${map}`);
      const points = startingPlayers(map, 'T').map((player) => worldToRadar(overview, player));
      expect(points).toHaveLength(5);
      for (const point of points) {
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(RADAR_IMAGE_SIZE);
        expect(point.y).toBeGreaterThan(0);
        expect(point.y).toBeLessThan(RADAR_IMAGE_SIZE);
      }
      for (let i = 1; i < points.length; i++) {
        const [a, b] = [points[i - 1], points[i]];
        expect(Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0))).toBeGreaterThan(
          60,
        );
      }
    }
  });

  it('puts T and CT on opposite edges', () => {
    const overview = getMapOverview('de_mirage');
    if (overview === undefined) throw new Error('no overview');
    const t = worldToRadar(overview, startingPlayers('de_mirage', 'T')[0] ?? { x: 0, y: 0 });
    const ct = worldToRadar(overview, startingPlayers('de_mirage', 'CT')[0] ?? { x: 0, y: 0 });
    expect(t.y).toBeGreaterThan(ct.y);
  });
});

describe('createNewTactic', () => {
  it('starts untitled with one unnamed step and five players', () => {
    const tactic = createNewTactic('de_dust2', 'CT');
    expect(tactic.map).toBe('de_dust2');
    expect(tactic.side).toBe('CT');
    expect(tactic.title).toBe('');
    expect(tactic.steps).toHaveLength(1);
    expect(tactic.steps[0]?.name).toBe('');
    expect(tactic.steps[0]?.players).toHaveLength(5);
    expect(tactic.steps[0]?.players.every((player) => player.label === undefined)).toBe(true);
  });
});

describe('hasEditorWork', () => {
  it('is false for a fresh tactic and true once a player moves', () => {
    const fresh = createNewTactic('de_mirage', 'T');
    expect(hasEditorWork(fresh)).toBe(false);
    const [step] = fresh.steps;
    if (step === undefined) throw new Error('no step');
    const [first, ...rest] = step.players;
    if (first === undefined) throw new Error('no player');
    const moved = {
      ...fresh,
      steps: [{ ...step, players: [{ ...first, x: first.x + 40 }, ...rest] }],
    };
    expect(hasEditorWork(moved)).toBe(true);
  });
});

describe('changeTacticMap', () => {
  it('resets formation, throws and drawings to the new map', () => {
    const base = createNewTactic('de_mirage', 'T');
    const [step] = base.steps;
    if (step === undefined) throw new Error('no step');
    const worked = {
      ...base,
      steps: [
        {
          ...step,
          throws: [
            {
              id: 'a',
              throwerSlot: 0,
              kind: 'smoke' as const,
              from: { x: 0, y: 0 },
              to: { x: 1, y: 1 },
              releaseTime: 0,
            },
          ],
          drawings: [{ id: 'd', color: 'red', points: [{ x: 0, y: 0 }] }],
        },
      ],
    };
    const next = changeTacticMap(worked, 'de_inferno');
    expect(next.map).toBe('de_inferno');
    expect(next.steps[0]?.throws).toEqual([]);
    expect(next.steps[0]?.drawings).toEqual([]);
    expect(next.steps[0]?.players).toEqual(startingPlayers('de_inferno', 'T'));
    expect(changeTacticMap(worked, 'de_mirage')).toBe(worked);
  });
});

describe('changeTacticSide', () => {
  it('moves an untouched formation to the new side edge', () => {
    const next = changeTacticSide(createNewTactic('de_mirage', 'T'), 'CT');
    expect(next.side).toBe('CT');
    expect(next.steps[0]?.players).toEqual(startingPlayers('de_mirage', 'CT'));
  });

  it('keeps positions the user already set', () => {
    const base = createNewTactic('de_mirage', 'T');
    const [step] = base.steps;
    if (step === undefined) throw new Error('no step');
    const [first, ...rest] = step.players;
    if (first === undefined) throw new Error('no player');
    const moved = { ...base, steps: [{ ...step, players: [{ ...first, x: 5 }, ...rest] }] };
    expect(changeTacticSide(moved, 'CT').steps).toEqual(moved.steps);
  });
});

describe('toggleTacticRound', () => {
  it('adds and removes a round, keeping the canonical order', () => {
    const base = createNewTactic('de_mirage', 'T');
    const withFull = toggleTacticRound(base, 'full');
    const withEco = toggleTacticRound(withFull, 'eco');
    expect(withEco.rounds).toEqual(['eco', 'full']);
    expect(toggleTacticRound(withEco, 'eco').rounds).toEqual(['full']);
  });
});
