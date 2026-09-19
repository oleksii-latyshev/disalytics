import { describe, expect, it } from 'vitest';
import {
  decodeTacticFromHash,
  encodeTacticToHash,
  isTactic,
  parseTacticFile,
  serializeTacticFile,
  type Tactic,
  TacticFileError,
} from '../helpers/tactics';

const validTactic: Tactic = {
  id: 'mirage-a-execute',
  title: 'Mirage Fast A Execute',
  map: 'de_mirage',
  side: 'T',
  author: 'disa',
  description: 'Default 3-smoke execute onto A site with jungle and stairs coverage',
  createdAt: 1000,
  updatedAt: 1500,
  steps: [
    {
      id: 'step-1',
      name: 'Spawn setup & ramp lineup',
      timeOffsetSeconds: 0,
      notes: 'Line up against the wall at T roof',
      players: [
        { slot: 0, x: -1100, y: -400, yaw: 45, label: 'IGL' },
        { slot: 1, x: -1120, y: -420, yaw: 45, label: 'Support' },
        { slot: 2, x: -1150, y: -450, yaw: 30, label: 'Lurker' },
        { slot: 3, x: -1200, y: -380, yaw: 90, label: 'Entry' },
        { slot: 4, x: -1250, y: -400, yaw: 60, label: 'AWP' },
      ],
      throws: [
        {
          id: 'throw-stairs',
          throwerSlot: 0,
          kind: 'smoke',
          from: { x: -1100, y: -400 },
          to: { x: -350, y: -600 },
          releaseTime: 3.5,
          notes: 'Jump throw stairs smoke',
        },
        {
          id: 'throw-jungle',
          throwerSlot: 1,
          kind: 'smoke',
          from: { x: -1120, y: -420 },
          to: { x: -300, y: -800 },
          releaseTime: 4.0,
          notes: 'Stand throw jungle smoke',
        },
      ],
      drawings: [
        {
          id: 'stroke-1',
          color: 'objective',
          points: [
            { x: -1100, y: -400 },
            { x: -800, y: -500 },
          ],
        },
      ],
    },
    {
      id: 'step-2',
      name: 'Site entry and plant',
      timeOffsetSeconds: 15,
      notes: 'Flash over A main and enter site',
      players: [
        { slot: 0, x: -600, y: -650, yaw: 90 },
        { slot: 1, x: -550, y: -700, yaw: 110 },
        { slot: 2, x: -1000, y: 200, yaw: 0, label: 'Lurker' },
        { slot: 3, x: -450, y: -600, yaw: 45, label: 'Entry' },
        { slot: 4, x: -800, y: -500, yaw: 80, label: 'AWP' },
      ],
      throws: [
        {
          id: 'throw-flash',
          throwerSlot: 0,
          kind: 'flash',
          from: { x: -600, y: -650 },
          to: { x: -400, y: -500 },
          releaseTime: 16.0,
        },
      ],
    },
  ],
};

describe('isTactic validator', () => {
  it('returns true for a valid complete tactic', () => {
    expect(isTactic(validTactic)).toBe(true);
  });

  it('returns true for a minimal valid tactic without optional fields', () => {
    const minimal: Tactic = {
      id: 'simple-tactic',
      title: 'Simple',
      map: 'de_dust2',
      side: 'CT',
      createdAt: 10,
      updatedAt: 20,
      steps: [
        {
          id: 's1',
          name: 'Start',
          timeOffsetSeconds: 0,
          players: [],
          throws: [],
        },
      ],
    };
    expect(isTactic(minimal)).toBe(true);
  });

  it('returns false for null, primitives, or missing required fields', () => {
    expect(isTactic(null)).toBe(false);
    expect(isTactic('not an object')).toBe(false);
    expect(isTactic({})).toBe(false);
    expect(isTactic({ ...validTactic, side: 'INVALID' })).toBe(false);
    expect(isTactic({ ...validTactic, title: 123 })).toBe(false);
    expect(isTactic({ ...validTactic, steps: 'not-array' })).toBe(false);
  });

  it('validates player positions and throws within steps', () => {
    const badPlayer = {
      ...validTactic,
      steps: [
        {
          ...validTactic.steps[0],
          players: [{ slot: 'not-a-number', x: 0, y: 0 }],
        },
      ],
    };
    expect(isTactic(badPlayer)).toBe(false);

    const badThrow = {
      ...validTactic,
      steps: [
        {
          ...validTactic.steps[0],
          throws: [
            {
              id: 't1',
              throwerSlot: 0,
              kind: 'invalid-kind',
              from: { x: 0, y: 0 },
              to: { x: 0, y: 0 },
              releaseTime: 0,
            },
          ],
        },
      ],
    };
    expect(isTactic(badThrow)).toBe(false);
  });
});

describe('serializeTacticFile and parseTacticFile', () => {
  it('serializes and parses back a single tactic', () => {
    const json = serializeTacticFile(validTactic);
    const parsed = parseTacticFile(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(validTactic);
  });

  it('serializes and parses back multiple tactics', () => {
    const tactic2: Tactic = {
      ...validTactic,
      id: 'tactic-2',
      title: 'Second Tactic',
    };
    const json = serializeTacticFile([validTactic, tactic2]);
    const parsed = parseTacticFile(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBe('mirage-a-execute');
    expect(parsed[1]?.id).toBe('tactic-2');
  });

  it('rejects invalid JSON syntax with INVALID_JSON error', () => {
    expect(() => parseTacticFile('invalid { json')).toThrowError(TacticFileError);
    try {
      parseTacticFile('invalid');
    } catch (e) {
      expect((e as TacticFileError).code).toBe('INVALID_JSON');
    }
  });

  it('rejects unsupported schema version with UNSUPPORTED_VERSION error', () => {
    const wrongVersion = JSON.stringify({
      version: 99,
      generator: 'disalytics',
      exportedAt: '2026-09-19',
      tactics: [validTactic],
    });

    try {
      parseTacticFile(wrongVersion);
      expect.unreachable();
    } catch (e) {
      expect((e as TacticFileError).code).toBe('UNSUPPORTED_VERSION');
    }
  });

  it('rejects invalid generator or missing tactics with INVALID_SCHEMA error', () => {
    const wrongGenerator = JSON.stringify({
      version: 1,
      generator: 'unknown-app',
      exportedAt: '2026-09-19',
      tactics: [validTactic],
    });

    try {
      parseTacticFile(wrongGenerator);
      expect.unreachable();
    } catch (e) {
      expect((e as TacticFileError).code).toBe('INVALID_SCHEMA');
    }
  });
});

describe('encodeTacticToHash and decodeTacticFromHash', () => {
  it('encodes and decodes a tactic roundtrip through URL fragment', () => {
    const hash = encodeTacticToHash(validTactic);
    expect(hash.startsWith('#tactic=')).toBe(true);

    const decoded = decodeTacticFromHash(hash);
    expect(decoded).toEqual(validTactic);
  });

  it('decodes from a full browser URL', () => {
    const hash = encodeTacticToHash(validTactic);
    const fullUrl = `https://disalytics.disa-67b.workers.dev/open${hash}`;

    const decoded = decodeTacticFromHash(fullUrl);
    expect(decoded).toEqual(validTactic);
  });

  it('handles Cyrillic / Unicode characters correctly', () => {
    const unicodeTactic: Tactic = {
      ...validTactic,
      title: 'Быстрый выход на плент А',
      description: 'Раскидка дымов на лестницу и джунгли с базы атаки',
    };

    const hash = encodeTacticToHash(unicodeTactic);
    const decoded = decodeTacticFromHash(hash);

    expect(decoded).toEqual(unicodeTactic);
    expect(decoded?.title).toBe('Быстрый выход на плент А');
  });

  it('returns null on malformed, corrupted, or non-tactic hash strings', () => {
    expect(decodeTacticFromHash('')).toBeNull();
    expect(decodeTacticFromHash('#tactic=bad-base64-content')).toBeNull();
    expect(decodeTacticFromHash('#other-hash=123')).toBeNull();
  });
});
