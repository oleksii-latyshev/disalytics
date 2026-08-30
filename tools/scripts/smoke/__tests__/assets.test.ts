import { describe, expect, it } from 'vitest';
import { assetPathsIn, extensionOf, isFollowable, representativesOf } from '../assets';

describe('assetPathsIn', () => {
  it('reads a script the document names', () => {
    const html = '<script type="module" crossorigin src="/assets/index-BykiwkaK.js"></script>';
    expect(assetPathsIn(html)).toEqual(['/assets/index-BykiwkaK.js']);
  });

  it('reads a stylesheet the document names', () => {
    expect(assetPathsIn('<link rel="stylesheet" href="/assets/index-jG7wih3Q.css">')).toEqual([
      '/assets/index-jG7wih3Q.css',
    ]);
  });

  it('reads the binary a chunk names', () => {
    const chunk = 'new URL("/assets/demo_parser_wasm_bg-BG3eib1d.wasm",import.meta.url)';
    expect(assetPathsIn(chunk)).toEqual(['/assets/demo_parser_wasm_bg-BG3eib1d.wasm']);
  });

  it('leaves a source map out of the contract', () => {
    expect(assetPathsIn('"/assets/index-BykiwkaK.js.map"')).toEqual([]);
  });

  it('names each path once however often it is referenced', () => {
    const chunk = '"/assets/worker-DGDYQ7Nz.js" "/assets/worker-DGDYQ7Nz.js"';
    expect(assetPathsIn(chunk)).toEqual(['/assets/worker-DGDYQ7Nz.js']);
  });
});

describe('extensionOf', () => {
  it('reads through a content hash', () => {
    expect(extensionOf('/assets/index-BykiwkaK.js')).toBe('.js');
  });

  it('answers empty for a name with no dot', () => {
    expect(extensionOf('/assets/manifest')).toBe('');
  });
});

describe('representativesOf', () => {
  it('takes one asset per extension', () => {
    const paths = [
      '/assets/index-a.js',
      '/assets/worker-b.js',
      '/assets/index-c.css',
      '/assets/demo_parser_wasm_bg-d.wasm',
    ];
    expect([...representativesOf(paths).keys()].toSorted()).toEqual(['.css', '.js', '.wasm']);
  });

  it('picks the same representative whatever order it is handed', () => {
    const forwards = representativesOf(['/assets/a-1.js', '/assets/b-2.js']);
    const backwards = representativesOf(['/assets/b-2.js', '/assets/a-1.js']);
    expect(forwards.get('.js')).toBe(backwards.get('.js'));
  });
});

describe('isFollowable', () => {
  it('follows a chunk, because a chunk names the next one', () => {
    expect(isFollowable('/assets/index-a.js')).toBe(true);
  });

  it('follows a stylesheet, because a stylesheet names its fonts', () => {
    expect(isFollowable('/assets/index-a.css')).toBe(true);
  });

  it('does not follow a binary', () => {
    expect(isFollowable('/assets/demo_parser_wasm_bg-a.wasm')).toBe(false);
  });
});
