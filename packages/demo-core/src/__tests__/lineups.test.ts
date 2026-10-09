import { describe, expect, it } from 'vitest';
import {
  isBuiltInCopy,
  isLineup,
  type Lineup,
  LineupFileError,
  localImageHash,
  normalizeLineup,
  parseLineupFile,
  serializeLineupFile,
  toggledLineupTag,
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
  mouseButtons: ['left', 'right'],
  imageUrls: [
    'https://example.com/lineups/dust2-xbox-stand.png',
    'https://example.com/lineups/dust2-xbox-aim.png',
  ],
  imageCaptions: ['Stand here', 'Aim here'],
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

  it('accepts valid lineup with targetCallout', () => {
    expect(isLineup({ ...sampleLineup, targetCallout: 'Xbox' })).toBe(true);
  });

  it('rejects lineup with non-string targetCallout', () => {
    expect(isLineup({ ...sampleLineup, targetCallout: 123 as unknown as string })).toBe(false);
  });

  it('rejects misaligned captions and unknown or repeated mouse buttons', () => {
    expect(isLineup({ ...sampleLineupWithExtras, imageCaptions: ['Only one'] })).toBe(false);
    expect(isLineup({ ...sampleLineupWithExtras, mouseButtons: ['left', 'middle'] })).toBe(false);
    expect(isLineup({ ...sampleLineupWithExtras, mouseButtons: ['left', 'left'] })).toBe(false);
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

  it('accepts valid lineup with waypoints, groupId, and groupTarget', () => {
    expect(
      isLineup({
        ...sampleLineup,
        waypoints: [
          { x: -500, y: -200, z: 50 },
          { x: -400, y: -100, z: 40 },
        ],
        groupId: 'grp-1',
        groupTarget: 'landing',
      }),
    ).toBe(true);
  });

  it('accepts an originGroupId and rejects a blank one', () => {
    expect(isLineup({ ...sampleLineup, groupId: 'g', originGroupId: 'o' })).toBe(true);
    expect(isLineup({ ...sampleLineup, originGroupId: ' ' })).toBe(false);
  });

  it('rejects lineup with invalid waypoints', () => {
    expect(
      isLineup({
        ...sampleLineup,
        waypoints: 'not-an-array' as unknown as readonly { x: number; y: number; z: number }[],
      }),
    ).toBe(false);
    expect(
      isLineup({
        ...sampleLineup,
        waypoints: [{ x: 'bad', y: 0, z: 0 }] as unknown as readonly {
          x: number;
          y: number;
          z: number;
        }[],
      }),
    ).toBe(false);
  });

  it('rejects lineup with invalid groupTarget', () => {
    expect(
      isLineup({
        ...sampleLineup,
        groupId: 'grp-1',
        groupTarget: 'invalid' as unknown as 'landing',
      }),
    ).toBe(false);
  });
});

describe('serializeLineupFile & parseLineupFile', () => {
  it('round-trips lineups through JSON serialization and parsing', () => {
    const json = serializeLineupFile([sampleLineup]);
    const parsed = parseLineupFile(json).lineups;

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
    const parsed = parseLineupFile(legacyJson).lineups;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineup);
    const item = parsed[0];
    expect(item?.movementInstructions).toBeUndefined();
    expect(item?.imageUrls).toBeUndefined();
  });

  it('round-trips lineups with movementInstructions and multiple imageUrls', () => {
    const json = serializeLineupFile([sampleLineupWithExtras]);
    const parsed = parseLineupFile(json).lineups;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(sampleLineupWithExtras);
    const item = parsed[0];
    expect(item?.movementInstructions).toBe('Run forward 2 steps and jump throw.');
    expect(item?.imageUrls).toEqual([
      'https://example.com/lineups/dust2-xbox-stand.png',
      'https://example.com/lineups/dust2-xbox-aim.png',
    ]);
    expect(item?.imageCaptions).toEqual(['Stand here', 'Aim here']);
    expect(item?.mouseButtons).toEqual(['left', 'right']);
    expect(item?.mediaUrl).toBe('https://example.com/lineup.mp4');
  });

  it('round-trips lineups with waypoints, groupId, and originGroupId', () => {
    const lineupWithWaypoints: Lineup = {
      ...sampleLineup,
      waypoints: [
        { x: -700, y: -400, z: 100 },
        { x: -500, y: -200, z: 80 },
      ],
      groupId: 'grp-test',
      originGroupId: 'org-test',
    };
    const json = serializeLineupFile([lineupWithWaypoints]);
    const parsed = parseLineupFile(json).lineups;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(lineupWithWaypoints);
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
      version: 3,
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

describe('local photos in lineup files', () => {
  const hash = 'a'.repeat(64);
  const other = 'b'.repeat(64);
  const dataUrl = 'data:image/webp;base64,UklGRg==';
  const withPhoto: Lineup = {
    ...sampleLineup,
    imageUrls: [`local:${hash}`, 'https://example.com/a.png'],
    imageCaptions: ['a', 'b'],
  };

  it('round-trips a version-2 file with only referenced images', () => {
    const json = serializeLineupFile([withPhoto], { [hash]: dataUrl, [other]: dataUrl });
    const parsed = parseLineupFile(json);

    expect(parsed.lineups).toEqual([withPhoto]);
    expect(parsed.images).toEqual({ [hash]: dataUrl });
    expect(JSON.parse(json).version).toBe(2);
  });

  it('still parses a version-1 file with no images', () => {
    const json = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      exportedAt: '2026-09-18T12:00:00Z',
      lineups: [sampleLineup],
    });
    expect(parseLineupFile(json).images).toEqual({});
  });

  it('rejects a lineup whose local photo is absent from images', () => {
    const json = serializeLineupFile([withPhoto], {});
    expect(() => parseLineupFile(json)).toThrow(LineupFileError);
  });

  it('rejects malformed image keys and data URLs', () => {
    const file = (images: unknown) =>
      JSON.stringify({
        version: 2,
        generator: 'disalytics',
        exportedAt: '2026-09-18T12:00:00Z',
        lineups: [withPhoto],
        images,
      });
    expect(() => parseLineupFile(file({ short: dataUrl }))).toThrow(LineupFileError);
    expect(() => parseLineupFile(file({ [hash]: 'data:text/html;base64,AAAA' }))).toThrow(
      LineupFileError,
    );
    expect(() => parseLineupFile(file({ [hash]: 'https://example.com/a.png' }))).toThrow(
      LineupFileError,
    );
    expect(() => parseLineupFile(file({ [hash]: 5 }))).toThrow(LineupFileError);
  });

  it('accepts local refs in isLineup and rejects malformed ones', () => {
    expect(isLineup(withPhoto)).toBe(true);
    expect(isLineup({ ...sampleLineup, imageUrls: ['local:xyz'], imageCaptions: [''] })).toBe(
      false,
    );
    expect(localImageHash(`local:${hash}`)).toBe(hash);
    expect(localImageHash('https://example.com/a.png')).toBeNull();
  });
});

describe('lineup tags and author', () => {
  const tagged = (extra: Record<string, unknown>) => ({ ...sampleLineup, ...extra });

  it('accepts known tags and an author', () => {
    expect(isLineup(tagged({ tags: ['meta'] }))).toBe(true);
    expect(isLineup(tagged({ tags: ['old'] }))).toBe(true);
    expect(isLineup(tagged({ tags: [] }))).toBe(true);
    expect(isLineup(tagged({ author: { name: 'Ann' } }))).toBe(true);
    expect(
      isLineup(tagged({ author: { name: 'Ann', url: 'https://steamcommunity.com/id/ann' } })),
    ).toBe(true);
  });

  it('rejects unknown, duplicate and exclusive tags', () => {
    expect(isLineup(tagged({ tags: ['fun'] }))).toBe(false);
    expect(isLineup(tagged({ tags: ['meta', 'meta'] }))).toBe(false);
    expect(isLineup(tagged({ tags: ['meta', 'old'] }))).toBe(false);
    expect(isLineup(tagged({ tags: 'meta' }))).toBe(false);
  });

  it('rejects a bad author', () => {
    expect(isLineup(tagged({ author: { name: '  ' } }))).toBe(false);
    expect(isLineup(tagged({ author: 'Ann' }))).toBe(false);
    expect(isLineup(tagged({ author: { name: 'Ann', url: 'http://example.com' } }))).toBe(false);
    expect(isLineup(tagged({ author: { name: 'Ann', url: 'javascript:alert(1)' } }))).toBe(false);
    expect(isLineup(tagged({ author: { name: 'Ann', url: 'https://' } }))).toBe(false);
    expect(isLineup(tagged({ author: { name: 'Ann', url: 42 } }))).toBe(false);
  });

  it('round-trips through a file and still reads files without them', () => {
    const lineup: Lineup = {
      ...sampleLineup,
      tags: ['meta'],
      author: { name: 'Ann', url: 'https://steamcommunity.com/id/ann' },
    };
    const parsed = parseLineupFile(serializeLineupFile([lineup, sampleLineup]));
    expect(parsed.lineups).toEqual([lineup, sampleLineup]);
  });

  it('refuses a file whose lineup carries both exclusive tags', () => {
    const json = serializeLineupFile([{ ...sampleLineup, tags: ['meta', 'old'] }]);
    expect(() => parseLineupFile(json)).toThrow(LineupFileError);
  });

  it('keeps a built-in copy comparison working with the new fields', () => {
    const builtIn: Lineup = { ...sampleLineup, tags: ['meta'], isBuiltIn: true };
    expect(isBuiltInCopy({ ...builtIn, isBuiltIn: false }, [builtIn])).toBe(true);
    expect(isBuiltInCopy({ ...builtIn, tags: ['old'] }, [builtIn])).toBe(false);
  });

  it('toggles a tag and drops the one it excludes', () => {
    expect(toggledLineupTag([], 'meta')).toEqual(['meta']);
    expect(toggledLineupTag(['meta'], 'meta')).toEqual([]);
    expect(toggledLineupTag(['meta'], 'old')).toEqual(['old']);
  });
});

describe('normalizeLineup', () => {
  it('reads a legacy origin group as an origin group with no landing group', () => {
    const result = normalizeLineup({ ...sampleLineup, groupId: 'g', groupTarget: 'origin' });

    expect(result.originGroupId).toBe('g');
    expect(result.groupId).toBeUndefined();
    expect('groupTarget' in result).toBe(false);
  });

  it('drops a legacy landing target and keeps the landing group', () => {
    const result = normalizeLineup({ ...sampleLineup, groupId: 'g', groupTarget: 'landing' });

    expect(result.groupId).toBe('g');
    expect(result.originGroupId).toBeUndefined();
    expect('groupTarget' in result).toBe(false);
  });

  it('leaves a lineup in both groups as it is', () => {
    const both: Lineup = { ...sampleLineup, groupId: 'g', originGroupId: 'o' };

    expect(normalizeLineup(both)).toBe(both);
  });

  it('keeps an origin group already set next to a legacy landing target', () => {
    const result = normalizeLineup({
      ...sampleLineup,
      groupId: 'g',
      groupTarget: 'landing',
      originGroupId: 'o',
    });

    expect(result).toMatchObject({ groupId: 'g', originGroupId: 'o' });
  });

  it('normalises the lineups of an imported file', () => {
    const json = serializeLineupFile([{ ...sampleLineup, groupId: 'g', groupTarget: 'origin' }]);
    const [imported] = parseLineupFile(json).lineups;

    expect(imported?.originGroupId).toBe('g');
    expect(imported?.groupId).toBeUndefined();
  });
});
