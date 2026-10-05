import { describe, expect, it } from 'vitest';
import { type Manifest, screenFiles, staticClosure } from '../screens';

const MANIFEST: Manifest = {
  'index.html': { file: 'assets/index.js', imports: ['_shared.js'], dynamicImports: ['page.tsx'] },
  '_shared.js': { file: 'assets/shared.js', imports: ['_runtime.js'] },
  '_runtime.js': { file: 'assets/runtime.js' },
  '_heavy.js': { file: 'assets/heavy.js', imports: ['_runtime.js'] },
  'page.tsx': { file: 'assets/page.js', imports: ['_heavy.js', '_shared.js'] },
  'other.tsx': { file: 'assets/other.js', imports: ['_heavy.js'] },
};

describe('staticClosure', () => {
  it('follows static imports and counts a shared one once', () => {
    expect([...staticClosure(MANIFEST, 'page.tsx')].sort()).toEqual([
      'assets/heavy.js',
      'assets/page.js',
      'assets/runtime.js',
      'assets/shared.js',
    ]);
  });

  it('stops at a lazy import', () => {
    expect([...staticClosure(MANIFEST, 'index.html')]).not.toContain('assets/page.js');
  });

  it('refuses a key the build does not hold', () => {
    expect(() => staticClosure(MANIFEST, 'gone.tsx')).toThrow('not in the build manifest');
  });
});

describe('screenFiles', () => {
  it('is the entry plus what the screen asks for', () => {
    const files = screenFiles(MANIFEST, { name: 'page', lazy: ['page.tsx'] });

    expect([...files].sort()).toEqual([
      'assets/heavy.js',
      'assets/index.js',
      'assets/page.js',
      'assets/runtime.js',
      'assets/shared.js',
    ]);
  });

  it('leaves out a chunk no lazy key of the screen reaches', () => {
    const files = screenFiles(MANIFEST, { name: 'other', lazy: ['other.tsx'] });

    expect(files.has('assets/page.js')).toBe(false);
  });
});
