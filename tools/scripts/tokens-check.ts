import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { classesIn, customPropertiesIn, type Sites } from './tokens-check/sources';
import { definedClasses, definedCustomProperties } from './tokens-check/stylesheet';

const SOURCE_ROOTS = ['apps/web/src', 'packages/ui/src'];
const CLASS_SOURCE = /\.tsx?$/;
// The stylesheets are sources too for the `var(--…)` half — that is where most of the references
// live — but they hold no classes, so they are not scanned for one.
const TOKEN_SOURCE = /\.(?:tsx?|css)$/;
// A class in a test is an assertion about this check, not a class the product ships.
// The vendored animate-ui tree goes with them. It is upstream's code, it is not edited here, and it
// writes classes this check cannot reason about — `group/toggle-group` is a valid Tailwind named
// group that emits no rule of its own, and reporting it is a false positive nobody can act on. The
// same boundary is drawn in `biome.json` and in `packages/ui/tsconfig.json`.
const NOT_A_SOURCE =
  /\/(?:node_modules|dist)\/|\/__tests__\/|\.test\.tsx?$|packages\/ui\/src\/components\/animate-ui\//;

const CSS_DIR = 'apps/web/dist/assets';

interface Miss {
  readonly token: string;
  readonly sites: readonly string[];
}

async function readSources(kind: RegExp): Promise<Map<string, string>> {
  const sources = new Map<string, string>();

  for (const root of SOURCE_ROOTS) {
    for (const entry of await readdir(root, { withFileTypes: true, recursive: true })) {
      const path = join(entry.parentPath, entry.name);
      if (!entry.isFile() || !kind.test(path) || NOT_A_SOURCE.test(path)) continue;
      sources.set(path, await Bun.file(path).text());
    }
  }

  return sources;
}

async function readStylesheet(): Promise<string> {
  const entries = await readdir(CSS_DIR).catch(() => []);
  const sheets = entries.filter((entry) => entry.endsWith('.css'));

  if (sheets.length !== 1) {
    console.error(`Expected one stylesheet in ${CSS_DIR}, found ${sheets.length}.`);
    console.error('Run `rm -rf apps/web/dist && bun run build` first — this check reads the');
    console.error('stylesheet the build emitted, so there is nothing to ask without one.');
    process.exit(1);
  }

  return Bun.file(`${CSS_DIR}/${sheets[0]}`).text();
}

function collect(sources: Map<string, string>, read: (source: string) => Sites): Map<string, Miss> {
  const found = new Map<string, string[]>();

  for (const [path, source] of sources) {
    for (const [token, lines] of read(source)) {
      const sites = found.get(token) ?? [];
      for (const line of lines) sites.push(`${path}:${line}`);
      found.set(token, sites);
    }
  }

  return new Map([...found].map(([token, sites]) => [token, { token, sites }]));
}

function report(misses: readonly Miss[], what: string, why: readonly string[]): boolean {
  if (misses.length === 0) return false;

  console.error(`\n${what}`);
  for (const miss of misses.toSorted((a, b) => a.token.localeCompare(b.token))) {
    console.error(`  ${miss.token}`);
    for (const site of miss.sites) console.error(`    ${site}`);
  }
  console.error('');
  for (const line of why) console.error(line);

  return true;
}

const classSources = await readSources(CLASS_SOURCE);
const tokenSources = await readSources(TOKEN_SOURCE);

if (classSources.size === 0 || tokenSources.size === classSources.size) {
  console.error(`No sources, or no stylesheets, under ${SOURCE_ROOTS.join(', ')}.`);
  console.error('A check that scans nothing passes for the wrong reason — fix it.');
  process.exit(1);
}

const css = await readStylesheet();

const classes = collect(classSources, classesIn);
const definedClass = definedClasses(css);
const unknownClasses = [...classes.values()].filter((miss) => !definedClass.has(miss.token));

const properties = collect(tokenSources, customPropertiesIn);
// A token declared under `@theme inline` is substituted rather than emitted, so the stylesheet the
// build wrote is not on its own the list of names that resolve.
const definedProperty = new Set([
  ...definedCustomProperties(css),
  ...[...tokenSources].flatMap(([path, source]) =>
    path.endsWith('.css') ? [...definedCustomProperties(source)] : [],
  ),
]);
const unknownProperties = [...properties.values()].filter(
  (miss) => !definedProperty.has(miss.token),
);

const failed =
  report(unknownClasses, 'Classes the stylesheet has no rule for:', [
    'An invalid Tailwind candidate is dropped in silence, so the class reads as correct and',
    'renders as nothing. Name a step that exists — the type and radius scales in tokens.css are',
    'closed sets —',
    'or write `duration-(--duration-micro)` where a theme name will not do.',
    'If the class is new and correct, the stylesheet is the stale half: rebuild and run again.',
  ]) ||
  report(unknownProperties, 'Custom properties the stylesheet does not define:', [
    'A `var(--token)` that resolves to nothing falls back to the initial value in silence.',
  ]);

if (failed) process.exit(1);

console.log(`${classes.size} classes and ${properties.size} custom properties, every one defined.`);
