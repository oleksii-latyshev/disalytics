import { describe, expect, it } from 'vitest';
import {
  isLineup,
  type Lineup,
  LineupFileError,
  parseLineupFile,
  serializeLineupFile,
} from '../helpers/lineups';

const sampleLineup: Lineup = {
  id: 'dust2-xbox-smoke',
  title: 'Xbox Smoke from T Spawn',
  map: 'de_dust2',
  side: 'T',
  kind: 'smoke',
  origin: { x: -1200.5, y: -850.25, z: 128.0 },
  landing: { x: -300.0, y: 150.0, z: 64.0 },
  pitch: -24.5,
  yaw: 42.15,
  throwType: 'jump',
  movementKeys: ['Jump'],
  movementKeysSummary: 'Jump',
  command: 'setpos -1200.50 -850.25 128.00; setang -24.50 42.15 0 // Jump',
  notes: 'Stand in the corner against the wall, aim at the antenna tip.',
  mediaUrl: 'https://example.com/lineup.mp4',
  isBuiltIn: false,
  createdAt: 1726650000000,
};

describe('isLineup', () => {
  it('accepts valid lineup object', () => {
    expect(isLineup(sampleLineup)).toBe(true);
  });

  it('rejects non-object or null', () => {
    expect(isLineup(null)).toBe(false);
    expect(isLineup('lineup')).toBe(false);
    expect(isLineup(undefined)).toBe(false);
  });

  it('rejects invalid side', () => {
    expect(isLineup({ ...sampleLineup, side: 'INVALID' })).toBe(false);
  });

  it('rejects invalid kind', () => {
    expect(isLineup({ ...sampleLineup, kind: 'ak47' })).toBe(false);
  });

  it('rejects invalid origin or landing points', () => {
    expect(isLineup({ ...sampleLineup, origin: { x: 'bad', y: 0, z: 0 } })).toBe(false);
    expect(isLineup({ ...sampleLineup, landing: null })).toBe(false);
  });

  it('rejects invalid throwType', () => {
    expect(isLineup({ ...sampleLineup, throwType: 'superjump' })).toBe(false);
  });

  it('rejects missing or empty required string fields', () => {
    expect(isLineup({ ...sampleLineup, id: '' })).toBe(false);
    expect(isLineup({ ...sampleLineup, title: '   ' })).toBe(false);
    expect(isLineup({ ...sampleLineup, map: '' })).toBe(false);
  });
});

describe('serializeLineupFile & parseLineupFile', () => {
  it('round-trips lineups through JSON serialization and parsing', () => {
    const json = serializeLineupFile([sampleLineup]);
    const parsed = parseLineupFile(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineup);
  });

  it('throws INVALID_JSON on malformed JSON string', () => {
    expect(() => parseLineupFile('not json')).toThrowError(LineupFileError);
    try {
      parseLineupFile('{ bad json');
    } catch (error) {
      expect((error as LineupFileError).code).toBe('INVALID_JSON');
    }
  });

  it('throws UNSUPPORTED_VERSION on incompatible generator or version', () => {
    const badVersion = JSON.stringify({
      version: 2,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [],
    });
    expect(() => parseLineupFile(badVersion)).toThrow(LineupFileError);

    const badGenerator = JSON.stringify({
      version: 1,
      generator: 'unknown-app',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [],
    });
    expect(() => parseLineupFile(badGenerator)).toThrow(LineupFileError);
  });

  it('throws INVALID_SCHEMA when lineups array contains invalid item', () => {
    const badItem = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ title: 'missing required fields' }],
    });

    expect(() => parseLineupFile(badItem)).toThrow(LineupFileError);
    try {
      parseLineupFile(badItem);
    } catch (error) {
      expect((error as LineupFileError).code).toBe('INVALID_SCHEMA');
    }
  });
});
