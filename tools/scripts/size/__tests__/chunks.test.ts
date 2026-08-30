import { describe, expect, it } from 'vitest';
import { binaryMismatch, chunkFamily, staleFamilies } from '../chunks';

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

describe('binaryMismatch', () => {
  const dist = { path: 'apps/web/dist/assets/x-A.wasm', size: 10, digest: 'a' };
  const pkg = { path: 'crates/demo-parser-wasm/pkg/x.wasm', size: 10, digest: 'a' };

  it('is silent when the shipped binary is the built one', () => {
    expect(binaryMismatch([dist], pkg)).toBeUndefined();
  });

  it('is silent when nothing was built, so there is nothing to compare against', () => {
    expect(binaryMismatch([dist], undefined)).toBeUndefined();
  });

  it('is silent when nothing shipped, which is the --wasm arm', () => {
    expect(binaryMismatch([], pkg)).toBeUndefined();
  });

  it('reports a shipped binary that is not the built one', () => {
    const stale = { ...dist, size: 9, digest: 'b' };
    expect(binaryMismatch([stale], pkg)).toEqual({
      reason: 'differs from the built parser',
      binaries: [stale, pkg],
    });
  });

  it('reports two binaries in dist without needing to say which is stale', () => {
    const other = { path: 'apps/web/dist/assets/x-B.wasm', size: 9, digest: 'b' };
    expect(binaryMismatch([dist, other], pkg)?.reason).toBe('more than one');
  });

  it('goes by content rather than by size, since two builds can weigh the same', () => {
    expect(binaryMismatch([{ ...dist, digest: 'b' }], pkg)?.reason).toBe(
      'differs from the built parser',
    );
  });
});
