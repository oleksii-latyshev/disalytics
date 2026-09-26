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

const sampleLineupWithExtras: Lineup = {
  ...sampleLineup,
  id: 'dust2-xbox-smoke-guided',
  movementInstructions: 'Run forward 2 steps and jump throw.',
  imageUrls: [
    'https://example.com/lineups/dust2-xbox-stand.png',
    'https://example.com/lineups/dust2-xbox-aim.png',
  ],
};

describe('isLineup', () => {
  it('accepts valid lineup object', () => {
    expect(isLineup(sampleLineup)).toBe(true);
  });

  it('accepts valid lineup with movementInstructions and multiple imageUrls', () => {
    expect(isLineup(sampleLineupWithExtras)).toBe(true);
  });

  it('accepts valid lineup with empty imageUrls array', () => {
    expect(isLineup({ ...sampleLineup, imageUrls: [] })).toBe(true);
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

  it('rejects invalid movementInstructions', () => {
    expect(isLineup({ ...sampleLineup, movementInstructions: 123 })).toBe(false);
    expect(isLineup({ ...sampleLineup, movementInstructions: ['Run'] })).toBe(false);
    expect(isLineup({ ...sampleLineup, movementInstructions: true })).toBe(false);
  });

  it('rejects invalid imageUrls', () => {
    expect(isLineup({ ...sampleLineup, imageUrls: 'https://example.com/img.png' })).toBe(false);
    expect(isLineup({ ...sampleLineup, imageUrls: [123] })).toBe(false);
    expect(isLineup({ ...sampleLineup, imageUrls: [''] })).toBe(false);
    expect(isLineup({ ...sampleLineup, imageUrls: ['   '] })).toBe(false);
    expect(isLineup({ ...sampleLineup, imageUrls: ['javascript:alert(1)'] })).toBe(false);
    expect(
      isLineup({
        ...sampleLineup,
        imageUrls: ['https://example.com/lineup.png', ''],
      }),
    ).toBe(false);
  });
});

describe('serializeLineupFile & parseLineupFile', () => {
  it('round-trips lineups through JSON serialization and parsing', () => {
    const json = serializeLineupFile([sampleLineup]);
    const parsed = parseLineupFile(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineup);
  });

  it('parses legacy version-1 JSON without movementInstructions or imageUrls', () => {
    const legacyJson = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [sampleLineup],
    });
    const parsed = parseLineupFile(legacyJson);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineup);
    const item = parsed[0];
    expect(item?.movementInstructions).toBeUndefined();
    expect(item?.imageUrls).toBeUndefined();
  });

  it('round-trips lineups with movementInstructions and multiple imageUrls', () => {
    const json = serializeLineupFile([sampleLineupWithExtras]);
    const parsed = parseLineupFile(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineupWithExtras);
    const item = parsed[0];
    expect(item?.movementInstructions).toBe('Run forward 2 steps and jump throw.');
    expect(item?.imageUrls).toEqual([
      'https://example.com/lineups/dust2-xbox-stand.png',
      'https://example.com/lineups/dust2-xbox-aim.png',
    ]);
    expect(item?.mediaUrl).toBe('https://example.com/lineup.mp4');
  });

  it('throws INVALID_JSON on malformed JSON string', () => {
    expect(() => parseLineupFile('not json')).toThrowError(LineupFileError);
    try {
      parseLineupFile('{ bad json');
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_JSON').toBe(true);
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
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }
  });

  it('throws INVALID_SCHEMA on malformed movementInstructions', () => {
    const badInstructionsNumber = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ ...sampleLineup, movementInstructions: 42 }],
    });
    expect(() => parseLineupFile(badInstructionsNumber)).toThrow(LineupFileError);
    try {
      parseLineupFile(badInstructionsNumber);
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }

    const badInstructionsArray = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ ...sampleLineup, movementInstructions: ['run'] }],
    });
    expect(() => parseLineupFile(badInstructionsArray)).toThrow(LineupFileError);
    try {
      parseLineupFile(badInstructionsArray);
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }
  });

  it('throws INVALID_SCHEMA on malformed imageUrls', () => {
    const badUrlsNotArray = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ ...sampleLineup, imageUrls: 'https://example.com/not-array.png' }],
    });
    expect(() => parseLineupFile(badUrlsNotArray)).toThrow(LineupFileError);
    try {
      parseLineupFile(badUrlsNotArray);
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }

    const badUrlsEmptyString = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ ...sampleLineup, imageUrls: ['https://example.com/ok.png', ''] }],
    });
    expect(() => parseLineupFile(badUrlsEmptyString)).toThrow(LineupFileError);
    try {
      parseLineupFile(badUrlsEmptyString);
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }

    const badUrlsNonString = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [{ ...sampleLineup, imageUrls: [123] }],
    });
    expect(() => parseLineupFile(badUrlsNonString)).toThrow(LineupFileError);
    try {
      parseLineupFile(badUrlsNonString);
    } catch (error) {
      expect(error instanceof LineupFileError && error.code === 'INVALID_SCHEMA').toBe(true);
    }
  });
});
