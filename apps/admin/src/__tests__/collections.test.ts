import type { CollectionPreviewItem } from '@disa/admin-contract';
import type { LineupCollection } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  choicesOf,
  decisionsOf,
  defaultChoice,
  rowsOf,
  savingCount,
  titlesOf,
} from '../helpers/collections';
import { readLineupFile } from '../helpers/lineup-file';
import { planParts } from '../helpers/parts';
import { reviewActionOf } from '../helpers/summary';
import { lineup } from './support';

const executeB: LineupCollection = {
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a', 'b'],
  createdAt: 1,
  updatedAt: 1,
};

function item(overrides: Partial<CollectionPreviewItem> = {}): CollectionPreviewItem {
  return {
    id: 'exec-b',
    name: 'Execute B',
    status: 'new',
    collection: executeB,
    added: ['a', 'b'],
    removed: [],
    dropped: 0,
    problems: [],
    ...overrides,
  };
}

describe('choices', () => {
  it('offers add for a new collection and replace for a changed one, always with skip', () => {
    const [added] = rowsOf([item()]);
    const [replaced] = rowsOf([item({ status: 'update', stored: executeB })]);
    expect(added && choicesOf(added)).toEqual(['add', 'skip']);
    expect(replaced && choicesOf(replaced)).toEqual(['replace', 'skip']);
    expect(added && defaultChoice(added)).toBe('add');
  });

  it('offers only skip for an unchanged collection and for one with a problem', () => {
    const [same] = rowsOf([item({ status: 'unchanged', stored: executeB })]);
    const [clash] = rowsOf([item({ problems: ['name_taken'] })]);
    expect(same && choicesOf(same)).toEqual(['skip']);
    expect(clash && choicesOf(clash)).toEqual(['skip']);
    expect(clash && defaultChoice(clash)).toBe('skip');
  });

  it('leaves out a row whose collection is not one', () => {
    expect(rowsOf([item({ collection: { id: 'x' } })])).toEqual([]);
  });
});

describe('decisionsOf', () => {
  it('sends the file collection for each row that is not skipped, by default or by choice', () => {
    const other = { ...executeB, id: 'retake', name: 'Retake B' };
    const rows = rowsOf([
      item(),
      item({ id: 'retake', name: 'Retake B', collection: other }),
      item({
        id: 'same',
        name: 'Same',
        status: 'unchanged',
        collection: { ...executeB, id: 'same' },
      }),
    ]);
    const file = [executeB, other];

    expect(decisionsOf(rows, {}, file).map(({ action }) => action)).toEqual(['add', 'add']);
    expect(decisionsOf(rows, { retake: 'skip' }, file)).toEqual([
      { action: 'add', collection: executeB },
    ]);
    expect(savingCount(rows, { retake: 'skip' })).toBe(1);
  });
});

describe('titlesOf', () => {
  it('names a lineup by its title and keeps an id nobody answers to', () => {
    expect(titlesOf(['a', 'z'], [lineup({ id: 'a', title: 'Window' })])).toBe('Window, z');
  });
});

describe('readLineupFile', () => {
  it('carries the collections of the file', () => {
    const text = JSON.stringify({
      version: 2,
      generator: 'disalytics',
      lineups: [lineup()],
      images: {},
      collections: [executeB],
    });
    const result = readLineupFile('x.json', text);
    expect(result.ok && result.file.collections).toEqual([executeB]);
  });
});

describe('reaching the collections with no lineup changes', () => {
  const totals = (overrides: Partial<Parameters<typeof reviewActionOf>[0]> = {}) => ({
    add: 0,
    update: 0,
    remove: 0,
    same: 3,
    blocked: 0,
    ...overrides,
  });

  it('goes on to the collections when nothing is to be written but the file has some', () => {
    expect(reviewActionOf(totals(), true)).toBe('collections');
    expect(reviewActionOf(totals(), false)).toBe('nothing');
    expect(reviewActionOf(totals({ add: 1 }), true)).toBe('apply');
    expect(reviewActionOf(totals({ remove: 1 }), false)).toBe('apply');
  });

  it('stays blocked while a lineup needs fixing', () => {
    expect(reviewActionOf(totals({ blocked: 1 }), true)).toBe('fix');
  });

  it('plans no request for nothing to write, which the apply ends as done at once', () => {
    expect(planParts([], {}, 'https://api.example/photos')).toEqual([]);
  });
});
