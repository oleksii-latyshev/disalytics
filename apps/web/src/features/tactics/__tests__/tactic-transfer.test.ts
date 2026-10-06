import { serializeTacticFile } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { createNewTactic } from '../helpers/tactic-setup';
import {
  libraryDownload,
  planImport,
  readTacticsFile,
  tacticDownload,
  tacticsToWrite,
} from '../helpers/tactic-transfer';

const a = { ...createNewTactic('de_mirage', 'T'), id: 'a', title: 'A' };
const b = { ...createNewTactic('de_dust2', 'CT'), id: 'b', title: 'B' };

const legacy = {
  id: 'old',
  title: 'Old',
  map: 'de_dust2',
  side: 'T',
  createdAt: 1,
  updatedAt: 2,
  steps: [
    {
      id: 's',
      name: 'Go',
      timeOffsetSeconds: 0,
      players: [{ slot: 0, x: 1, y: 2 }],
      throws: [],
    },
  ],
};

describe('readTacticsFile', () => {
  it('reads a file of the current version, one tactic or a library', () => {
    expect(readTacticsFile(serializeTacticFile(a))).toEqual([a]);
    expect(readTacticsFile(serializeTacticFile([a, b]))).toEqual([a, b]);
  });

  it('migrates a version 1 file', () => {
    const json = JSON.stringify({ version: 1, generator: 'disalytics', tactics: [legacy] });
    const [tactic] = readTacticsFile(json);
    expect(tactic?.plans).toHaveLength(1);
    expect(tactic?.plans[0]?.steps[0]?.players[0]?.route.points).toEqual([{ x: 1, y: 2 }]);
  });

  it('reads the headerless library files the list page used to write, keeping what reads', () => {
    const json = JSON.stringify({ version: 1, exportedAt: 5, tactics: [legacy, { junk: true }] });
    expect(readTacticsFile(json).map((tactic) => tactic.id)).toEqual(['old']);
    expect(readTacticsFile(JSON.stringify([a])).map((tactic) => tactic.id)).toEqual(['a']);
  });

  it('refuses text that holds no tactic', () => {
    expect(() => readTacticsFile('nope')).toThrow();
    expect(() => readTacticsFile(JSON.stringify({ tactics: [{ junk: 1 }] }))).toThrow();
  });
});

describe('planImport', () => {
  it('splits new tactics, clashes by id and what is already here', () => {
    const changed = { ...a, title: 'A edited' };
    const plan = planImport([a, b], [changed, b, { ...createNewTactic('de_nuke', 'T'), id: 'c' }]);
    expect(plan.fresh.map((tactic) => tactic.id)).toEqual(['c']);
    expect(plan.conflicts).toEqual([{ yours: a, incoming: changed }]);
    expect(plan.unchanged).toBe(1);
  });

  it('counts one tactic once when a file repeats an id', () => {
    const plan = planImport([], [a, { ...a, title: 'later' }]);
    expect(plan.fresh).toHaveLength(1);
    expect(plan.fresh[0]?.title).toBe('later');
  });
});

describe('tacticsToWrite', () => {
  const incoming = { ...a, title: 'A edited' };
  const plan = planImport([a], [incoming, b]);

  it('keeps yours by default and writes only what is new', () => {
    expect(tacticsToWrite(plan, new Map()).map((tactic) => tactic.id)).toEqual(['b']);
  });

  it('takes the incoming version of the clashes the reader chose it for', () => {
    const written = tacticsToWrite(plan, new Map([['a', 'incoming' as const]]));
    expect(written.map((tactic) => tactic.title)).toEqual(['B', 'A edited']);
  });
});

describe('downloads', () => {
  it('names a tactic file by map and title and a library file by day', () => {
    expect(tacticDownload({ ...a, title: 'Mid Rush!' }).filename).toBe(
      'disalytics-tactic-de_mirage-mid-rush.json',
    );
    expect(libraryDownload([a], new Date('2026-10-06T12:00:00Z')).filename).toBe(
      'disalytics-tactics-2026-10-06.json',
    );
    expect(JSON.parse(tacticDownload(a).content).version).toBe(2);
  });
});
