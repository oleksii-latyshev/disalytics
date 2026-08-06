import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WASM_GLUE = 'demo-parser-wasm';

interface ModuleGraph {
  files: string[];
  specifiers: string[];
}

function specifiersOf(source: string): string[] {
  const quoted = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;

  return [...source.matchAll(quoted)].flatMap((match) => match.slice(1, 2));
}

/** Follows static imports only — `new URL(…, import.meta.url)` is a bundler boundary, not one. */
function graphFrom(entry: string): ModuleGraph {
  const files = new Set<string>();
  const specifiers = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);

    for (const specifier of specifiersOf(readFileSync(file, 'utf8'))) {
      specifiers.add(specifier);
      if (specifier.startsWith('.')) pending.push(`${resolve(dirname(file), specifier)}.ts`);
    }
  }

  return { files: [...files], specifiers: [...specifiers] };
}

describe('the module graph', () => {
  it('never reaches the parser from the main thread (hard rule 2)', () => {
    const graph = graphFrom(resolve(SRC, 'index.ts'));

    expect(graph.specifiers).not.toContain(WASM_GLUE);
    expect(graph.files.map((file) => basename(file))).not.toContain('worker.ts');
  });

  it('reaches the parser from the worker, so the check above is not passing vacuously', () => {
    const graph = graphFrom(resolve(SRC, 'worker.ts'));

    expect(graph.specifiers).toContain(WASM_GLUE);
  });
});
