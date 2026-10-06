import { isTactic, type Tactic } from '@disa/demo-core';
import { getMapOverview, MAP_IDS, mapSpawns, RADAR_IMAGE_SIZE, worldToRadar } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { toEditorTactic, withEditorTactic } from '../helpers/editor-tactic';
import {
  changeTacticMap,
  changeTacticSide,
  createNewTactic,
  hasEditorWork,
  spawnIndices,
  startingPlayers,
  tacticSpawns,
  toggleTacticRound,
} from '../helpers/tactic-setup';

describe('startingPlayers', () => {
  it('spreads five players across a map without spawns, far enough apart for their tokens', () => {
    for (const map of MAP_IDS.filter((id) => mapSpawns(id, 'T').length === 0)) {
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
    const overview = getMapOverview('de_overpass');
    if (overview === undefined) throw new Error('no overview');
    const t = worldToRadar(overview, startingPlayers('de_overpass', 'T')[0] ?? { x: 0, y: 0 });
    const ct = worldToRadar(overview, startingPlayers('de_overpass', 'CT')[0] ?? { x: 0, y: 0 });
    expect(t.y).toBeGreaterThan(ct.y);
  });
});

describe('spawn placement', () => {
  it('spreads five slots evenly over the spots, or takes none when there are too few', () => {
    expect(spawnIndices(5)).toEqual([0, 1, 2, 3, 4]);
    expect(spawnIndices(15)).toEqual([0, 3, 6, 9, 12]);
    expect(spawnIndices(6)).toEqual([0, 1, 2, 3, 4]);
    expect(spawnIndices(4)).toEqual([]);
  });

  it('puts the five players on distinct spawn points of their side', () => {
    for (const map of ['de_dust2', 'de_inferno']) {
      for (const side of ['CT', 'T'] as const) {
        const spawns = mapSpawns(map, side);
        const players = startingPlayers(map, side);
        expect(players).toHaveLength(5);
        const keys = players.map((player) => `${player.x},${player.y}`);
        expect(new Set(keys).size).toBe(5);
        for (const key of keys) {
          expect(spawns.some((spawn) => `${spawn.x},${spawn.y}` === key)).toBe(true);
        }
      }
    }
  });

  it('is deterministic, and follows the side while the formation is untouched', () => {
    expect(startingPlayers('de_dust2', 'T')).toEqual(startingPlayers('de_dust2', 'T'));
    const next = changeTacticSide(createNewTactic('de_dust2', 'T'), 'CT');
    expect(toEditorTactic(next).steps[0]?.players).toMatchObject(startingPlayers('de_dust2', 'CT'));
    expect(next.spawns).toEqual(tacticSpawns('de_dust2', 'CT'));
    const other = changeTacticMap(createNewTactic('de_dust2', 'T'), 'de_inferno');
    expect(toEditorTactic(other).steps[0]?.players).toMatchObject(
      startingPlayers('de_inferno', 'T'),
    );
  });

  it('falls back to the row formation for a map without spawn data', () => {
    expect(mapSpawns('de_overpass', 'T')).toEqual([]);
    const players = startingPlayers('de_overpass', 'T');
    expect(players).toHaveLength(5);
    expect(new Set(players.map((player) => player.y)).size).toBeLessThanOrEqual(5);
  });
});

describe('createNewTactic', () => {
  it('starts untitled with one root plan, one unnamed step and five players at spawn', () => {
    const tactic = createNewTactic('de_dust2', 'CT');
    expect(tactic.map).toBe('de_dust2');
    expect(tactic.side).toBe('CT');
    expect(tactic.title).toBe('');
    expect(tactic.plans).toHaveLength(1);
    expect(tactic.plans[0]?.parentId).toBeNull();
    expect(tactic.spawns).toEqual(tacticSpawns('de_dust2', 'CT'));
    const [step] = toEditorTactic(tactic).steps;
    expect(step?.name).toBe('');
    expect(step?.players).toHaveLength(5);
    expect(step?.players.every((player) => player.label === undefined)).toBe(true);
    expect(isTactic(tactic)).toBe(true);
  });
});

function withFirstPlayerMoved(tactic: Tactic, dx: number): Tactic {
  return withEditorTactic(tactic, (editor) => ({
    ...editor,
    steps: editor.steps.map((step, index) =>
      index === 0
        ? { ...step, players: step.players.map((p) => (p.slot === 0 ? { ...p, x: p.x + dx } : p)) }
        : step,
    ),
  }));
}

describe('hasEditorWork', () => {
  it('is false for a fresh tactic and true once a player moves', () => {
    const fresh = createNewTactic('de_mirage', 'T');
    expect(hasEditorWork(fresh)).toBe(false);
    expect(hasEditorWork(withFirstPlayerMoved(fresh, 40))).toBe(true);
  });
});

describe('changeTacticMap', () => {
  it('resets formation, throws and drawings to the new map', () => {
    const base = createNewTactic('de_mirage', 'T');
    const worked = withEditorTactic(base, (editor) => ({
      ...editor,
      steps: editor.steps.map((step) => ({
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
      })),
    }));
    const next = changeTacticMap(worked, 'de_inferno');
    const [step] = toEditorTactic(next).steps;
    expect(next.map).toBe('de_inferno');
    expect(step?.throws).toEqual([]);
    expect(step?.drawings).toEqual([]);
    expect(step?.players).toMatchObject(startingPlayers('de_inferno', 'T'));
    expect(next.spawns).toEqual(tacticSpawns('de_inferno', 'T'));
    expect(changeTacticMap(worked, 'de_mirage')).toBe(worked);
  });
});

describe('changeTacticSide', () => {
  it('moves an untouched formation to the new side edge', () => {
    const next = changeTacticSide(createNewTactic('de_mirage', 'T'), 'CT');
    expect(next.side).toBe('CT');
    expect(toEditorTactic(next).steps[0]?.players).toMatchObject(
      startingPlayers('de_mirage', 'CT'),
    );
  });

  it('keeps positions the user already set', () => {
    const moved = withFirstPlayerMoved(createNewTactic('de_mirage', 'T'), 5);
    const next = changeTacticSide(moved, 'CT');
    expect(next.side).toBe('CT');
    expect(next.plans).toEqual(moved.plans);
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
