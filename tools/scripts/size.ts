import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { type Binary, binaryMismatch, staleFamilies } from './size/chunks';

// Decimal kB/MB, the unit Vite's own build report and the §16 measurements are written in.
const JS_BUDGET_BYTES = 500_000;
const WASM_BUDGET_BYTES = 4_000_000;
const WASM_HARD_FAIL_BYTES = 24_000_000;

const DIST_DIR = 'apps/web/dist';
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

async function checkJsBundle(): Promise<boolean> {
  const files = await walk(DIST_DIR);
  const scripts = files.filter((path) => path.endsWith('.js'));

  if (scripts.length === 0) {
    console.error(`No .js emitted under ${DIST_DIR}. Run \`bun run build\` first.`);
    return false;
  }

  // A Turborepo cache hit restores dist/ without emptying it and never runs Vite, so `emptyOutDir`
  // never fires and the chunks of whatever was built here before are still on disk. Summing them
  // reports up to double the real bundle, which is worse than reporting nothing.
  const stale = staleFamilies(scripts.map((path) => basename(path)));
  if (stale.length > 0) {
    console.error(`${DIST_DIR} holds more than one build's output, so no total is honest:\n`);
    for (const { family, names } of stale) console.error(`  ${family}:  ${names.join('  ')}`);
    console.error(`\nRun \`rm -rf ${DIST_DIR} && bun run build\`, then measure again.`);
    return false;
  }

  const locales = await readLocales();
  const isLocaleChunk = (name: string) =>
    locales.some((locale) => new RegExp(`^${locale}-[\\w-]+\\.js$`).test(name));

  const measured = await Promise.all(scripts.map(measure));
  const shared = measured.filter((entry) => !isLocaleChunk(entry.name));
  const localeChunks = measured
    .filter((entry) => isLocaleChunk(entry.name))
    .sort((a, b) => b.gzip - a.gzip);

  // The budget is one locale: the app loads exactly one chunk, so the heaviest is the honest
  // worst case and the rest are not shipped to any single visitor.
  const heaviestLocale = localeChunks.at(0);
  const counted = heaviestLocale === undefined ? shared : [...shared, heaviestLocale];
  const total = counted.reduce((sum, entry) => sum + entry.gzip, 0);
  const withinBudget = total <= JS_BUDGET_BYTES;

  console.log('JS bundle — excluding WASM, single locale (ROADMAP.md, constraints)\n');
  for (const entry of shared.sort((a, b) => b.gzip - a.gzip)) {
    console.log(row(entry.name, `${kb(entry.gzip)} gz`, `${kb(entry.raw)} raw`));
  }
  if (heaviestLocale !== undefined) {
    const note =
      localeChunks.length === 1
        ? 'the only locale chunk'
        : `heaviest of ${localeChunks.length} locale chunks`;
    console.log(row(heaviestLocale.name, `${kb(heaviestLocale.gzip)} gz`, note));
  }
  console.log(
    `\n${row('total', `${kb(total)} gz`, `${((total / JS_BUDGET_BYTES) * 100).toFixed(1)}% of the ${kb(JS_BUDGET_BYTES)} budget`)}`,
  );

  if (!withinBudget) {
    console.error(`\nJS bundle is over budget: ${kb(total)} gzip against ${kb(JS_BUDGET_BYTES)}.`);
  }
  return withinBudget;
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
  console.log('\nWASM binary (ROADMAP.md, constraints)\n');

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
