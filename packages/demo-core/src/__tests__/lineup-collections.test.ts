import { describe, expect, it } from 'vitest';
import {
  cleanCollectionName,
  collectionsToImport,
  isCollectionNameTaken,
  isLineupCollection,
  type LineupCollection,
  newLineupCollection,
  prunedCollection,
  renamedCollection,
  withCollectionMembers,
  withoutCollectionMembers,
} from '../helpers/lineup-collections';
import { LineupFileError, parseLineupFile, serializeLineupFile } from '../helpers/lineups';

const executeB: LineupCollection = {
  id: 'c1',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a', 'b'],
  createdAt: 10,
  updatedAt: 20,
};

describe('isLineupCollection', () => {
  it('accepts a well-formed collection, with or without members', () => {
    expect(isLineupCollection(executeB)).toBe(true);
    expect(isLineupCollection({ ...executeB, lineupIds: [] })).toBe(true);
  });

  it('rejects what is not a collection', () => {
    expect(isLineupCollection(null)).toBe(false);
    expect(isLineupCollection('c1')).toBe(false);
    expect(isLineupCollection({ ...executeB, id: ' ' })).toBe(false);
    expect(isLineupCollection({ ...executeB, name: '' })).toBe(false);
    expect(isLineupCollection({ ...executeB, name: 'x'.repeat(49) })).toBe(false);
    expect(isLineupCollection({ ...executeB, map: undefined })).toBe(false);
    expect(isLineupCollection({ ...executeB, lineupIds: 'a' })).toBe(false);
    expect(isLineupCollection({ ...executeB, lineupIds: ['a', 3] })).toBe(false);
    expect(isLineupCollection({ ...executeB, lineupIds: ['a', 'a'] })).toBe(false);
    expect(isLineupCollection({ ...executeB, createdAt: Number.NaN })).toBe(false);
    expect(isLineupCollection({ ...executeB, updatedAt: '20' })).toBe(false);
  });
});

describe('collection edits', () => {
  it('cleans and builds', () => {
    expect(cleanCollectionName('  Retake B ')).toBe('Retake B');
    const made = newLineupCollection('c2', ' Retake B ', 'de_mirage', ['a', 'a', 'b'], 5);
    expect(made).toEqual({
      id: 'c2',
      name: 'Retake B',
      map: 'de_mirage',
      lineupIds: ['a', 'b'],
      createdAt: 5,
      updatedAt: 5,
    });
    expect(isLineupCollection(made)).toBe(true);
  });

  it('renames, adds without doubling, and removes', () => {
    expect(renamedCollection(executeB, ' B exec ', 30)).toMatchObject({
      name: 'B exec',
      updatedAt: 30,
    });
    expect(withCollectionMembers(executeB, ['b', 'c'], 30).lineupIds).toEqual(['a', 'b', 'c']);
    expect(withoutCollectionMembers(executeB, ['a'], 30)).toMatchObject({
      lineupIds: ['b'],
      updatedAt: 30,
    });
  });

  it('prunes ids no lineup answers to, and returns the same object when nothing goes', () => {
    expect(prunedCollection(executeB, new Set(['b'])).lineupIds).toEqual(['b']);
    expect(prunedCollection(executeB, new Set(['a', 'b', 'z']))).toBe(executeB);
  });

  it('finds a taken name regardless of case, except for the collection itself', () => {
    expect(isCollectionNameTaken([executeB], ' execute b ')).toBe(true);
    expect(isCollectionNameTaken([executeB], 'execute b', 'c1')).toBe(false);
    expect(isCollectionNameTaken([executeB], 'Retake B')).toBe(false);
  });
});

describe('collectionsToImport', () => {
  it('adds new ids and replaces only with a later edit', () => {
    const newer = { ...executeB, name: 'Newer', updatedAt: 99 };
    const older = { ...executeB, name: 'Older', updatedAt: 1 };
    const fresh = { ...executeB, id: 'c9' };

    expect(collectionsToImport([executeB], [newer, fresh]).map((c) => c.id)).toEqual(['c1', 'c9']);
    expect(collectionsToImport([executeB], [older, executeB])).toEqual([]);
  });
});

describe('collections in the lineup file', () => {
  it('round-trips and stays version 2', () => {
    const json = serializeLineupFile([], {}, [executeB]);
    expect(JSON.parse(json)).toMatchObject({ version: 2, collections: [executeB] });
    expect(parseLineupFile(json).collections).toEqual([executeB]);
  });

  it('omits the field when there is nothing to carry, and reads a file without it', () => {
    const json = serializeLineupFile([]);
    expect('collections' in JSON.parse(json)).toBe(false);
    expect(parseLineupFile(json).collections).toEqual([]);
  });

  it('rejects a malformed collections field', () => {
    const file = (collections: unknown) =>
      JSON.stringify({ version: 2, generator: 'disalytics', lineups: [], images: {}, collections });

    expect(() => parseLineupFile(file('x'))).toThrow(LineupFileError);
    expect(() => parseLineupFile(file([{ ...executeB, name: '' }]))).toThrow(LineupFileError);
  });
});
