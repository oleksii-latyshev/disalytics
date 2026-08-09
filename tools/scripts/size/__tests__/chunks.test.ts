import { describe, expect, it } from 'vitest';
import { chunkFamily, staleFamilies } from '../chunks';

const CLEAN_BUILD = [
  'index-DWy4kbDR.js',
  'worker-EJ08cHP3.js',
  'en-7X1hTHed.js',
  'ru-BrY2gkR7.js',
  'sw.js',
];

describe('chunkFamily', () => {
  it('drops the content hash', () => {
    expect(chunkFamily('index-DWy4kbDR.js')).toBe('index');
  });

  it('keeps a name that carries no hash', () => {
    expect(chunkFamily('sw.js')).toBe('sw');
  });

  it('drops only the last segment of a hyphenated name', () => {
    expect(chunkFamily('demo-parser-EJ08cHP3.js')).toBe('demo-parser');
  });

  it('leaves a trailing segment that is not hash-shaped alone', () => {
    expect(chunkFamily('index-STALE.js')).toBe('index-STALE');
  });
});

describe('staleFamilies', () => {
  it('finds nothing in the output of a single build', () => {
    expect(staleFamilies(CLEAN_BUILD)).toEqual([]);
  });

  it('does not read two locales as one stale chunk', () => {
    expect(staleFamilies(['en-7X1hTHed.js', 'ru-BrY2gkR7.js'])).toEqual([]);
  });

  it('finds nothing in an empty directory', () => {
    expect(staleFamilies([])).toEqual([]);
  });

  // #93: a Turborepo cache hit restored dist/ over the previous branch's build and `bun run size`
  // summed both entry chunks, reporting 206.31 kB against a real 108.87 kB.
  it('catches an entry chunk left behind by an earlier build', () => {
    expect(staleFamilies([...CLEAN_BUILD, 'index-STALE000.js'])).toEqual([
      { family: 'index', names: ['index-DWy4kbDR.js', 'index-STALE000.js'] },
    ]);
  });

  it('catches every family a branch switch left doubled', () => {
    const stale = staleFamilies([
      ...CLEAN_BUILD,
      'index-BTUKRLSK.js',
      'en-CV5qMo6a.js',
      'ru-CR7GQFML.js',
    ]);

    expect(stale.map((entry) => entry.family)).toEqual(['en', 'index', 'ru']);
  });
});
