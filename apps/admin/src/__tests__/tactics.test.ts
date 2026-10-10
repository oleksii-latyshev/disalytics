import type { TacticPreviewItem } from '@disa/admin-contract';
import { serializeTacticFile, type Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  choicesOf,
  decisionsOf,
  defaultChoice,
  describeDiff,
  readTacticFile,
  savingCount,
} from '../helpers/tactics';

const tactic: Tactic = {
  id: 't1',
  title: 'B split',
  map: 'de_mirage',
  side: 'T',
  spawns: [],
  plans: [
    {
      id: 'main',
      condition: 'B split',
      parentId: null,
      forkAfter: 0,
      deaths: {},
      steps: [{ id: 's', name: 'Go', startsAt: null, players: [], throws: [], drawings: [] }],
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

const item = (overrides: Partial<TacticPreviewItem>): TacticPreviewItem => ({
  id: 't1',
  title: 'B split',
  status: 'new',
  tactic,
  diff: [],
  problems: [],
  ...overrides,
});

describe('readTacticFile', () => {
  it('reads an exported file and counts its tactics', () => {
    const result = readTacticFile(
      'tactics.json',
      serializeTacticFile([tactic, { ...tactic, id: 't2' }]),
    );
    expect(result).toMatchObject({ ok: true, loaded: { name: 'tactics.json', count: 2 } });
  });

  it('names what is wrong with other text', () => {
    expect(readTacticFile('x', 'nope')).toMatchObject({ ok: false, key: 'admin.file.invalidJson' });
    expect(readTacticFile('x', '{"version":2,"generator":"other"}')).toMatchObject({
      ok: false,
      key: 'admin.tactics.fileInvalid',
    });
  });
});

describe('choices', () => {
  it('offers add for new, replace for changed, and only skip for the same or a broken one', () => {
    expect(choicesOf(item({}))).toEqual(['add', 'skip']);
    expect(choicesOf(item({ status: 'update' }))).toEqual(['replace', 'skip']);
    expect(choicesOf(item({ status: 'unchanged' }))).toEqual(['skip']);
    expect(choicesOf(item({ problems: ['title_blank'] }))).toEqual(['skip']);
    expect(defaultChoice(item({ status: 'update' }))).toBe('replace');
  });

  it('counts and sends what will be written, with the file a person chose over the default', () => {
    const items = [
      item({}),
      item({ id: 't2', status: 'update' }),
      item({ id: 't3', status: 'unchanged' }),
    ];
    expect(savingCount(items, {})).toBe(2);
    expect(savingCount(items, { t1: 'skip' })).toBe(1);
    expect(decisionsOf(items, { t2: 'skip' }).map(({ action }) => action)).toEqual([
      'add',
      'skip',
      'skip',
    ]);
  });
});

describe('describeDiff', () => {
  it('shows before and after for simple values and only the name otherwise', () => {
    expect(describeDiff({ field: 'steps', before: 3, after: 4 })).toEqual({
      field: 'steps',
      change: '3 → 4',
    });
    expect(describeDiff({ field: 'rounds', after: ['eco', 'force'] })).toEqual({
      field: 'rounds',
      change: '— → eco, force',
    });
    expect(describeDiff({ field: 'weapons', before: { 0: 'AK-47' }, after: {} }).change).toBeNull();
    expect(describeDiff({ field: 'content' }).change).toBe('— → —');
  });
});
