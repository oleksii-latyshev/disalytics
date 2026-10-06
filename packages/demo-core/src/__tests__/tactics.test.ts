import { describe, expect, it } from 'vitest';
import { effectiveSteps } from '../helpers/tactic-plans';
import {
  decodeTacticFromHash,
  isTactic,
  parseTacticFile,
  readTactic,
  serializeTacticFile,
  type Tactic,
  TacticFileError,
  type TacticStep,
} from '../helpers/tactics';

function step(id: string, startsAt: number | null = null): TacticStep {
  return {
    id,
    name: id,
    startsAt,
    players: [{ slot: 0, route: { mode: 'points', points: [{ x: 1, y: 2 }] } }],
    throws: [],
  };
}

const validTactic: Tactic = {
  id: 'mirage-a-execute',
  title: 'Mirage Fast A Execute',
  map: 'de_mirage',
  side: 'T',
  author: 'disa',
  description: 'Default 3-smoke execute onto A site',
  createdAt: 1000,
  updatedAt: 1500,
  spawns: [
    { x: -1100, y: -400 },
    { x: -1120, y: -420 },
  ],
  plans: [
    {
      id: 'main',
      condition: 'Default',
      parentId: null,
      forkAfter: 0,
      deaths: {},
      steps: [
        {
          id: 'step-1',
          name: 'Ramp lineup',
          idea: 'Line up against the wall',
          startsAt: null,
          players: [
            {
              slot: 0,
              route: {
                mode: 'points',
                points: [
                  { x: -1000, y: -400 },
                  { x: -900, y: -380 },
                ],
              },
              task: 'Entry',
              delaySeconds: 1.5,
              yaw: 45,
              label: 'IGL',
            },
            { slot: 1, route: { mode: 'pen', points: [{ x: -1100, y: -420 }] } },
          ],
          throws: [
            {
              id: 'throw-stairs',
              throwerSlot: 0,
              kind: 'smoke',
              from: { x: -1100, y: -400 },
              to: { x: -350, y: -600 },
              releaseTime: 3.5,
            },
          ],
          enemies: [
            {
              id: 'e1',
              at: { x: 10, y: 20 },
              role: 'awp',
              note: 'ramp',
              killedBy: 0,
              isDead: true,
            },
          ],
          drawings: [{ id: 'stroke-1', color: 'objective', points: [{ x: 0, y: 0 }] }],
        },
        step('step-2', 15),
      ],
    },
    {
      id: 'smoke-missed',
      condition: 'If the smoke missed',
      parentId: 'main',
      forkAfter: 0,
      deaths: { 1: 1 },
      steps: [step('b-1', 20)],
    },
  ],
};

const legacyTactic = {
  id: 'legacy',
  title: 'Legacy A split',
  map: 'de_dust2',
  side: 'T',
  author: 'disa',
  createdAt: 1000,
  updatedAt: 1500,
  steps: [
    {
      id: 'step-1',
      name: 'Setup',
      timeOffsetSeconds: 0,
      notes: 'hold the wall',
      players: [
        { slot: 0, x: -1100, y: -400, yaw: 45, label: 'IGL' },
        { slot: 1, x: -1120, y: -420 },
      ],
      throws: [
        {
          id: 'throw-1',
          throwerSlot: 0,
          kind: 'smoke',
          from: { x: -1100, y: -400 },
          to: { x: -350, y: -600 },
          releaseTime: 3.5,
        },
      ],
      drawings: [{ id: 'stroke-1', color: 'objective', points: [{ x: 0, y: 0 }] }],
    },
    {
      id: 'step-2',
      name: 'Go',
      timeOffsetSeconds: 15,
      players: [
        { slot: 0, x: -600, y: -650 },
        { slot: 1, x: -550, y: -700 },
      ],
      throws: [],
    },
  ],
};

describe('isTactic validator', () => {
  it('accepts a complete tactic with a branch', () => {
    expect(isTactic(validTactic)).toBe(true);
  });

  it('rejects the shapes of file version 1', () => {
    expect(isTactic(legacyTactic)).toBe(false);
  });

  it('rejects null, primitives and missing or malformed fields', () => {
    expect(isTactic(null)).toBe(false);
    expect(isTactic('not an object')).toBe(false);
    expect(isTactic({})).toBe(false);
    expect(isTactic({ ...validTactic, side: 'INVALID' })).toBe(false);
    expect(isTactic({ ...validTactic, title: 123 })).toBe(false);
    expect(isTactic({ ...validTactic, plans: 'not-array' })).toBe(false);
    expect(isTactic({ ...validTactic, spawns: [{ x: 'a', y: 1 }] })).toBe(false);
  });

  it('validates routes, players, throws and enemies inside steps', () => {
    const [main, ...rest] = validTactic.plans;
    const first = main?.steps[0];
    if (main === undefined || first === undefined) throw new Error('fixture');
    const withStep = (patch: Record<string, unknown>): unknown => ({
      ...validTactic,
      plans: [{ ...main, steps: [{ ...first, ...patch }, ...main.steps.slice(1)] }, ...rest],
    });
    expect(
      isTactic(withStep({ players: [{ slot: 0, route: { mode: 'walk', points: [] } }] })),
    ).toBe(false);
    expect(
      isTactic(withStep({ players: [{ slot: 'x', route: { mode: 'pen', points: [] } }] })),
    ).toBe(false);
    expect(isTactic(withStep({ startsAt: 'soon' }))).toBe(false);
    expect(isTactic(withStep({ enemies: [{ id: 'e', at: { x: 0, y: 0 }, role: 'boss' }] }))).toBe(
      false,
    );
    expect(isTactic(withStep({ throws: [{ id: 't', kind: 'nope' }] }))).toBe(false);
  });

  it('requires exactly one root and a fork the parent really has', () => {
    const [main, branch] = validTactic.plans;
    if (main === undefined || branch === undefined) throw new Error('fixture');
    expect(isTactic({ ...validTactic, plans: [] })).toBe(false);
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, parentId: null }] })).toBe(false);
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, forkAfter: 2 }] })).toBe(false);
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, parentId: 'ghost' }] })).toBe(
      false,
    );
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, id: 'main' }] })).toBe(false);
    expect(
      isTactic({
        ...validTactic,
        plans: [main, { ...branch, id: 'a', parentId: 'b' }, { ...branch, id: 'b', parentId: 'a' }],
      }),
    ).toBe(false);
  });

  it('accepts a branch of a branch, forking inside the inherited steps', () => {
    const [main, branch] = validTactic.plans;
    if (main === undefined || branch === undefined) throw new Error('fixture');
    const nested = { ...branch, id: 'nested', parentId: 'smoke-missed', forkAfter: 1, steps: [] };
    expect(isTactic({ ...validTactic, plans: [main, branch, nested] })).toBe(true);
    expect(isTactic({ ...validTactic, plans: [main, branch, { ...nested, forkAfter: 2 }] })).toBe(
      false,
    );
  });

  it('rejects malformed deaths', () => {
    const [main, branch] = validTactic.plans;
    if (main === undefined || branch === undefined) throw new Error('fixture');
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, deaths: { 1: -1 } }] })).toBe(
      false,
    );
    expect(isTactic({ ...validTactic, plans: [main, { ...branch, deaths: { 1: 1.5 } }] })).toBe(
      false,
    );
  });

  it('validates rounds and accepts empty titles', () => {
    expect(isTactic({ ...validTactic, rounds: ['pistol', 'eco'] })).toBe(true);
    expect(isTactic({ ...validTactic, rounds: [] })).toBe(true);
    expect(isTactic({ ...validTactic, rounds: ['half'] })).toBe(false);
    expect(isTactic({ ...validTactic, title: '' })).toBe(true);
  });
});

describe('serializeTacticFile and parseTacticFile', () => {
  it('writes file version 2 and parses a single tactic back unchanged', () => {
    const json = serializeTacticFile(validTactic);
    expect(JSON.parse(json).version).toBe(2);
    expect(parseTacticFile(json)).toEqual([validTactic]);
  });

  it('round-trips a library in order', () => {
    const second: Tactic = { ...validTactic, id: 'tactic-2', title: 'Second' };
    const parsed = parseTacticFile(serializeTacticFile([validTactic, second]));
    expect(parsed.map((tactic) => tactic.id)).toEqual(['mirage-a-execute', 'tactic-2']);
    expect(parsed[1]).toEqual(second);
  });

  it('rejects invalid JSON syntax with INVALID_JSON', () => {
    expect(() => parseTacticFile('invalid { json')).toThrowError(TacticFileError);
    try {
      parseTacticFile('invalid');
    } catch (e) {
      expect(e).toBeInstanceOf(TacticFileError);
      expect(e instanceof TacticFileError && e.code).toBe('INVALID_JSON');
    }
  });

  it.each([
    [99, 'UNSUPPORTED_VERSION'],
    [3, 'UNSUPPORTED_VERSION'],
  ])('rejects file version %s', (version, code) => {
    const json = JSON.stringify({ version, generator: 'disalytics', tactics: [validTactic] });
    expect(() => parseTacticFile(json)).toThrowError(
      expect.objectContaining({ code }) as unknown as Error,
    );
  });

  it('rejects a foreign generator and a malformed tactic with INVALID_SCHEMA', () => {
    const foreign = JSON.stringify({ version: 2, generator: 'other', tactics: [validTactic] });
    const broken = JSON.stringify({ version: 2, generator: 'disalytics', tactics: [{ id: 1 }] });
    for (const json of [foreign, broken]) {
      expect(() => parseTacticFile(json)).toThrowError(
        expect.objectContaining({ code: 'INVALID_SCHEMA' }) as unknown as Error,
      );
    }
  });
});

describe('migration from version 1', () => {
  const v1File = JSON.stringify({
    version: 1,
    generator: 'disalytics',
    exportedAt: '2026-09-19',
    tactics: [legacyTactic],
  });

  it('reads a version 1 file as one root plan', () => {
    const [tactic] = parseTacticFile(v1File);
    if (tactic === undefined) throw new Error('no tactic');
    expect(isTactic(tactic)).toBe(true);
    expect(tactic.plans).toHaveLength(1);
    expect(tactic.plans[0]).toMatchObject({
      parentId: null,
      condition: 'Legacy A split',
      deaths: {},
    });
  });

  it('turns each player position into a one-point route and keeps yaw and label', () => {
    const [tactic] = parseTacticFile(v1File);
    const steps = tactic === undefined ? [] : effectiveSteps(tactic, 'main');
    expect(steps).toHaveLength(2);
    expect(steps[0]?.players[0]).toEqual({
      slot: 0,
      route: { mode: 'points', points: [{ x: -1100, y: -400 }] },
      yaw: 45,
      label: 'IGL',
    });
    expect(steps[1]?.players[1]?.route.points).toEqual([{ x: -550, y: -700 }]);
  });

  it('maps offsets to startsAt, leaving an opening step at zero unpinned, and notes to idea', () => {
    const [tactic] = parseTacticFile(v1File);
    const steps = tactic === undefined ? [] : effectiveSteps(tactic, 'main');
    expect(steps.map((entry) => entry.startsAt)).toEqual([null, 15]);
    expect(steps[0]?.idea).toBe('hold the wall');
    expect(steps[1]?.idea).toBeUndefined();
  });

  it('keeps throws and drawings', () => {
    const [tactic] = parseTacticFile(v1File);
    const first = tactic === undefined ? undefined : effectiveSteps(tactic, 'main')[0];
    expect(first?.throws).toEqual(legacyTactic.steps[0]?.throws);
    expect(first?.drawings).toEqual(legacyTactic.steps[0]?.drawings);
  });

  it('takes spawns from the resolver, else from the first step', () => {
    const fallback = readTactic(legacyTactic);
    expect(fallback?.spawns).toEqual([
      { x: -1100, y: -400 },
      { x: -1120, y: -420 },
    ]);

    const resolved = readTactic(legacyTactic, {
      spawnsFor: (map, side) => (map === 'de_dust2' && side === 'T' ? [{ x: 5, y: 6 }] : null),
    });
    expect(resolved?.spawns).toEqual([
      { x: 5, y: 6 },
      { x: -1120, y: -420 },
    ]);
  });

  it('writes the migrated tactic as version 2 and reads that back identically', () => {
    const [tactic] = parseTacticFile(v1File);
    if (tactic === undefined) throw new Error('no tactic');
    const json = serializeTacticFile(tactic);
    expect(JSON.parse(json).version).toBe(2);
    expect(parseTacticFile(json)).toEqual([tactic]);
  });

  it('rejects a version 1 file whose tactic is malformed', () => {
    const json = JSON.stringify({
      version: 1,
      generator: 'disalytics',
      tactics: [{ ...legacyTactic, steps: [{ id: 's' }] }],
    });
    expect(() => parseTacticFile(json)).toThrowError(TacticFileError);
  });

  it('readTactic passes a current tactic through and refuses junk', () => {
    expect(readTactic(validTactic)).toBe(validTactic);
    expect(readTactic({ id: 'x' })).toBeNull();
    expect(readTactic(null)).toBeNull();
  });
});

function encodeHash(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `#tactic=${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

describe('decodeTacticFromHash', () => {
  it('opens an old link of a version 1 tactic, migrated', () => {
    const decoded = decodeTacticFromHash(encodeHash(legacyTactic));
    expect(decoded?.id).toBe('legacy');
    expect(decoded && effectiveSteps(decoded, 'main')).toHaveLength(2);
  });

  it('reads a current tactic and a full browser URL', () => {
    const hash = encodeHash(validTactic);
    expect(decodeTacticFromHash(hash)).toEqual(validTactic);
    expect(decodeTacticFromHash(`https://disalytics.example/tactics${hash}`)).toEqual(validTactic);
  });

  it('handles Cyrillic characters', () => {
    const unicode: Tactic = { ...validTactic, title: 'Быстрый выход на плент А' };
    expect(decodeTacticFromHash(encodeHash(unicode))?.title).toBe('Быстрый выход на плент А');
  });

  it('returns null on malformed, corrupted or non-tactic hashes', () => {
    expect(decodeTacticFromHash('')).toBeNull();
    expect(decodeTacticFromHash('#tactic=bad-base64-content')).toBeNull();
    expect(decodeTacticFromHash('#other-hash=123')).toBeNull();
    expect(decodeTacticFromHash(encodeHash({ nothing: true }))).toBeNull();
  });
});
