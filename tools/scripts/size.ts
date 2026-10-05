import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  type Binary,
  binaryMismatch,
  precachedUrls,
  staleFamilies,
  strayScripts,
} from './size/chunks';
import { type Manifest, SCREENS, screenFiles } from './size/screens';

// Decimal kB/MB, the unit Vite's own build report and the §16 measurements are written in.
const JS_BUDGET_BYTES = 500_000;
const WASM_BUDGET_BYTES = 4_000_000;
const WASM_HARD_FAIL_BYTES = 24_000_000;

const DIST_DIR = 'apps/web/dist';
const MANIFEST_PATH = join(DIST_DIR, '.vite', 'manifest.json');
const LOCALES_DIR = 'packages/i18n/src/locales';
const CRATES_DIR = 'crates';

// zlib's default, and what a CDN serves at. Pinned so two machines measure the same bytes.
const GZIP_LEVEL = 6;

type Measurement = {
  name: string;
  raw: number;
  gzip: number;
};

function kb(bytes: number): string {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function mb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

async function measure(path: string): Promise<Measurement> {
  const bytes = await Bun.file(path).bytes();
  return {
    name: basename(path),
    raw: bytes.length,
    gzip: Bun.gzipSync(bytes, { level: GZIP_LEVEL }).length,
  };
}

async function readLocales(): Promise<string[]> {
  if (!existsSync(LOCALES_DIR)) return [];
  const entries = await readdir(LOCALES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function row(label: string, right: string, note: string): string {
  return `  ${label.padEnd(38)}${right.padStart(14)}   ${note}`;
}

/**
 * A Turborepo cache hit restores dist/ without emptying it and never runs Vite, so `emptyOutDir`
 * never fires and the chunks of whatever was built here before are still on disk. Summing them
 * reports up to double the real bundle, which is worse than reporting nothing. The manifest names
 * exactly the chunks of the build that wrote it, so a script it does not name is left over.
 */
function reportLeftovers(scripts: readonly string[], listed: ReadonlySet<string>): boolean {
  const relative = (path: string) => path.slice(DIST_DIR.length + 1);
  const stray = strayScripts(scripts.map(relative), listed);
  const doubled = staleFamilies(
    scripts.filter((path) => !listed.has(relative(path))).map((path) => basename(path)),
  );
  if (stray.length === 0 && doubled.length === 0) return false;

  console.error(`${DIST_DIR} holds more than one build's output, so no total is honest:\n`);
  for (const name of stray) console.error(`  not in the manifest:  ${name}`);
  for (const { family, names } of doubled) console.error(`  ${family}:  ${names.join('  ')}`);
  console.error(`\nRun \`rm -rf ${DIST_DIR} && bun run build\`, then measure again.`);
  return true;
}

/**
 * Every chunk a screen can ask for has to be in the service worker's precache, or the screen that
 * lazy-loads it fails offline (AGENTS.md §12).
 */
async function unprecachedChunks(listed: ReadonlySet<string>): Promise<readonly string[]> {
  const serviceWorker = Bun.file(join(DIST_DIR, 'sw.js'));
  const precached = (await serviceWorker.exists())
    ? precachedUrls(await serviceWorker.text())
    : new Set<string>();

  return [...listed].filter((file) => file.endsWith('.js') && !precached.has(file));
}

async function checkJsBundle(): Promise<boolean> {
  const scripts = (await walk(DIST_DIR)).filter((path) => path.endsWith('.js'));

  if (scripts.length === 0) {
    console.error(`No .js emitted under ${DIST_DIR}. Run \`bun run build\` first.`);
    return false;
  }
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`${MANIFEST_PATH} is missing: set build.manifest in apps/web/vite.config.ts.`);
    return false;
  }
  const manifest = (await Bun.file(MANIFEST_PATH).json()) as Manifest;
  const listed = new Set(Object.values(manifest).map((chunk) => chunk.file));
  if (reportLeftovers(scripts, listed)) return false;

  const locales = await readLocales();
  const isLocaleChunk = (name: string) =>
    locales.some((locale) => new RegExp(`^${locale}-[\\w-]+\\.js$`).test(name));

  const measured = await Promise.all(scripts.map(measure));
  const shared = measured.filter((entry) => !isLocaleChunk(entry.name));
  const localeChunks = measured
    .filter((entry) => isLocaleChunk(entry.name))
    .sort((a, b) => b.gzip - a.gzip);

  // The app loads exactly one locale chunk, so the heaviest is the honest worst case.
  const heaviestLocale = localeChunks.at(0);
  const localeGzip = heaviestLocale?.gzip ?? 0;
  const allChunks = shared.reduce((sum, entry) => sum + entry.gzip, localeGzip);

  // The service worker and the parse worker are not manifest chunks, and every screen can ask for
  // both: the first registers on any visit, the second starts on the first drop.
  const byFile = new Map(shared.map((entry) => [`assets/${entry.name}`, entry.gzip]));
  const unlistedGzip = shared
    .filter((entry) => !listed.has(`assets/${entry.name}`))
    .reduce((sum, entry) => sum + entry.gzip, 0);

  const screens = SCREENS.map((screen) => {
    const files = screenFiles(manifest, screen);
    const js = [...files].reduce((sum, file) => sum + (byFile.get(file) ?? 0), 0);
    return { name: screen.name, files: files.size, gzip: js + localeGzip + unlistedGzip };
  });

  console.log('JS a screen loads — excluding WASM, single locale (AGENTS.md §16)\n');
  for (const screen of screens) {
    const share = ((screen.gzip / JS_BUDGET_BYTES) * 100).toFixed(1);
    console.log(
      row(screen.name, `${kb(screen.gzip)} gz`, `${screen.files} chunks, ${share}% of the budget`),
    );
  }
  const noteLocale =
    heaviestLocale === undefined
      ? ''
      : `${heaviestLocale.name} (heaviest of ${localeChunks.length}) `;
  console.log(
    `\n  each screen counts ${noteLocale}${kb(localeGzip)} and the service and parse workers ${kb(unlistedGzip)}`,
  );
  console.log(row('all chunks, for information', `${kb(allChunks)} gz`, `${shared.length} chunks`));

  const unprecached = await unprecachedChunks(listed);
  if (unprecached.length > 0) {
    console.error(`\nChunks missing from the service worker's precache, so offline breaks:`);
    for (const file of unprecached) console.error(`  ${file}`);
  }

  const over = screens.filter((screen) => screen.gzip > JS_BUDGET_BYTES);
  for (const screen of over) {
    console.error(
      `\n"${screen.name}" is over budget: ${kb(screen.gzip)} gzip against ${kb(JS_BUDGET_BYTES)}.`,
    );
  }
  return over.length === 0 && unprecached.length === 0;
}

async function binaries(dir: string): Promise<Binary[]> {
  const paths = (await walk(dir)).filter((path) => path.endsWith('.wasm')).sort();

  return Promise.all(
    paths.map(async (path) => {
      const bytes = await Bun.file(path).bytes();
      return { path, size: bytes.length, digest: Bun.SHA256.hash(bytes, 'hex') };
    }),
  );
}

function reportMismatch(mismatch: NonNullable<ReturnType<typeof binaryMismatch>>): void {
  console.error(
    `\n  The .wasm in ${DIST_DIR} is not the one ${CRATES_DIR} holds — ${mismatch.reason}:\n`,
  );
  for (const binary of mismatch.binaries) {
    console.error(`    ${binary.path}  ${binary.size.toLocaleString('en-US')} B`);
  }
  console.error(
    `\n  \`rm -rf ${DIST_DIR} && bun run build\` does not settle this on its own: turbo restores`,
  );
  console.error('  its own cached dist without running Vite. Run `bun run build --force`.');
}

async function checkWasm(wasmOnly: boolean): Promise<boolean> {
  console.log('\nWASM binary (AGENTS.md §16)\n');

  if (!existsSync(CRATES_DIR)) {
    console.log(`  ${CRATES_DIR}/ does not exist — nothing to weigh, budget inert.`);
    return true;
  }

  const built = (await binaries(CRATES_DIR)).at(0);
  // `--wasm` reads the parser build and nothing else by definition, so a dist that happens to be
  // lying around on that arm is not this measurement's business.
  const shipped = wasmOnly ? [] : await binaries(DIST_DIR);

  const mismatch = binaryMismatch(shipped, built);
  if (mismatch !== undefined) {
    reportMismatch(mismatch);
    return false;
  }

  // The shipped copy is the one the budget is about; `pkg/` speaks for it on the `--wasm` arm,
  // where there is no dist for the two to have diverged from.
  const binary = shipped.at(0) ?? built;
  if (binary === undefined) {
    console.log(`  No .wasm built — run \`bun run wasm:build\` to weigh it. Budget inert.`);
    return true;
  }

  const entry = await measure(binary.path);
  const heaviest = entry.raw;
  const label = shipped.length > 0 ? 'shipped binary' : 'built binary';
  console.log(row(entry.name, mb(entry.raw), `${mb(entry.gzip)} gz`));
  console.log(
    `\n${row(label, mb(heaviest), `${((heaviest / WASM_BUDGET_BYTES) * 100).toFixed(1)}% of the ${mb(WASM_BUDGET_BYTES)} budget`)}`,
  );

  if (heaviest > WASM_HARD_FAIL_BYTES) {
    console.error(
      `\nWASM binary is past the hard limit: ${mb(heaviest)} against ${mb(WASM_HARD_FAIL_BYTES)}.`,
    );
    return false;
  }
  if (heaviest > WASM_BUDGET_BYTES) {
    console.error(
      `\nWASM binary is over budget: ${mb(heaviest)} against ${mb(WASM_BUDGET_BYTES)}.`,
    );
    return false;
  }
  return true;
}

// ci.yml skips crate-only changes, so wasm.yml is the only place the §16 binary budget is asserted
// on a Rust pull request — and it has no reason to build the SPA to get there.
const wasmOnly = Bun.argv.includes('--wasm');

if (!wasmOnly && !existsSync(DIST_DIR)) {
  console.error(`${DIST_DIR} does not exist. Run \`bun run build\` first.`);
  process.exit(1);
}

const jsOk = wasmOnly || (await checkJsBundle());
const wasmOk = await checkWasm(wasmOnly);

if (!(jsOk && wasmOk)) process.exit(1);
