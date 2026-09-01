/**
 * Makes the emitted declarations stand on their own, by rewriting the subpath specifiers in them to
 * relative paths.
 *
 * The registry writes its imports against `package.json`'s `imports` map — `#components/…/x.tsx`,
 * `#lib/utils.ts` — and `tsc` copies a specifier into the `.d.ts` verbatim. Those two facts together
 * are what would defeat the declaration build: a consumer resolving `#components/…` gets
 * `./src/components/…`, lands back in this package's TypeScript, and typechecks the whole vendored
 * animate-ui tree under *its own* compiler options. That is precisely what `dist` exists to prevent,
 * and it is why `apps/web` keeps `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` while
 * this package does not.
 *
 * A relative path inside `dist` has no such reach. The extension goes with it: `x.tsx` does not
 * exist there and `x.d.ts` does, and TypeScript finds the second from an extensionless specifier by
 * its own rules.
 *
 * Only `#`-prefixed specifiers are touched. A relative import between two emitted files — which
 * `tsc` already writes without an extension — is left exactly as it is.
 */

import { readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

/** Where each subpath prefix lands, relative to `dist`. Mirrors `package.json`'s `imports` map. */
const PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['#components/', 'components/'],
  ['#hooks/', 'hooks/'],
  ['#lib/', 'lib/'],
];

const SPECIFIER = /(from\s+['"])(#[^'"]+)(['"])/g;

function resolve(specifier: string, fromFile: string): string {
  const withoutExtension = specifier.replace(/\.tsx?$/, '');

  for (const [prefix, target] of PREFIXES) {
    if (!withoutExtension.startsWith(prefix)) continue;

    const absolute = join(DIST, target, withoutExtension.slice(prefix.length));
    const path = relative(dirname(fromFile), absolute);

    return path.startsWith('.') ? path : `./${path}`;
  }

  throw new Error(`No prefix in package.json's imports map matches '${specifier}'.`);
}

let rewritten = 0;

for (const entry of await readdir(DIST, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue;

  const path = join(entry.parentPath, entry.name);
  const source = await Bun.file(path).text();
  const next = source.replace(
    SPECIFIER,
    (_, open, specifier, close) => `${open}${resolve(specifier, path)}${close}`,
  );

  if (next === source) continue;

  await Bun.write(path, next);
  rewritten += 1;
}

console.log(`declaration specifiers: rewrote ${rewritten} file(s)`);
