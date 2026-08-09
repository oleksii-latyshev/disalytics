import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const DIST_DIR = 'apps/web/dist';
const HASHED_DIR = join(DIST_DIR, 'assets');
const RADAR_DIR = join(DIST_DIR, 'radar');

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// AGENTS.md §13 — cross-origin isolation is refused deliberately: it would break the app's own
// constraints, and §16's memory budget is written against a tab that is not isolated.
const ISOLATION_HEADERS = ['cross-origin-opener-policy', 'cross-origin-embedder-policy'];

// Any path the SPA never emits as a file, so a 200 here can only come from not_found_handling.
const CLIENT_ROUTE = '/round/12/kill/3';

// A freshly created workers.dev route 404s at the edge for a while after `wrangler deploy` returns
// its URL. Measured at ~60 s on the first deploy of the Worker; later deploys serve immediately.
const READY_TIMEOUT_MS = 180_000;
const READY_POLL_MS = 5_000;

type Status = 'pass' | 'fail' | 'skip';
type Check = { name: string; status: Status; detail: string };

const MARK: Record<Status, string> = { pass: ' ok ', fail: 'fail', skip: 'skip' };

function row({ name, status, detail }: Check): string {
  return `  ${MARK[status]}  ${name.padEnd(34)}${detail}`;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function toRequestPath(distPath: string): string {
  return `/${distPath.slice(DIST_DIR.length + 1)}`;
}

function normalizeCacheControl(value: string): string {
  return value
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
    .join(', ');
}

async function fetchPath(baseUrl: string, path: string): Promise<Response> {
  return fetch(new URL(path, baseUrl), { redirect: 'follow' });
}

function isolationChecks(path: string, response: Response): Check[] {
  return ISOLATION_HEADERS.map((header) => {
    const value = response.headers.get(header);
    return {
      name: `no ${header}`,
      status: value === null ? 'pass' : 'fail',
      detail: value === null ? `absent on ${path}` : `${path} returned "${value}"`,
    } satisfies Check;
  });
}

async function checkDocument(baseUrl: string): Promise<Check[]> {
  const response = await fetchPath(baseUrl, '/');
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? 'none';
  const isHtml = contentType.includes('text/html');
  const hasRoot = body.includes('<div id="root">');
  const loaded = response.status === 200 && isHtml && hasRoot;

  return [
    {
      name: 'document loads',
      status: loaded ? 'pass' : 'fail',
      detail: loaded
        ? `200, ${contentType}, #root present`
        : `${response.status}, ${contentType}, #root ${hasRoot ? 'present' : 'missing'}`,
    },
    ...isolationChecks('/', response),
  ];
}

async function checkClientRoute(baseUrl: string): Promise<Check> {
  const response = await fetchPath(baseUrl, CLIENT_ROUTE);
  const isHtml = (response.headers.get('content-type') ?? '').includes('text/html');
  const resolved = response.status === 200 && isHtml;

  return {
    name: 'client route resolves',
    status: resolved ? 'pass' : 'fail',
    detail: `${CLIENT_ROUTE} → ${response.status}${resolved ? '' : ', expected a 200 HTML shell'}`,
  };
}

async function representativeHashedAssets(): Promise<string[]> {
  if (!existsSync(HASHED_DIR)) return [];
  const byExtension = new Map<string, string>();
  for (const path of (await walk(HASHED_DIR)).sort()) {
    const extension = extname(path);
    if (!byExtension.has(extension)) byExtension.set(extension, path);
  }
  return [...byExtension.values()];
}

async function checkImmutableCaching(baseUrl: string, assets: string[]): Promise<Check[]> {
  if (assets.length === 0) {
    return [
      {
        name: 'immutable asset caching',
        status: 'fail',
        detail: `no content-hashed assets under ${HASHED_DIR} — run \`bun run build\` first`,
      },
    ];
  }

  const checks: Check[] = [];
  for (const [index, asset] of assets.entries()) {
    const path = toRequestPath(asset);
    const response = await fetchPath(baseUrl, path);
    const cacheControl = response.headers.get('cache-control');
    const immutable =
      cacheControl !== null && normalizeCacheControl(cacheControl) === IMMUTABLE_CACHE_CONTROL;

    checks.push({
      name: `immutable ${extname(asset) || 'no extension'}`,
      status: response.status === 200 && immutable ? 'pass' : 'fail',
      detail: `${path} → ${response.status}, cache-control: ${cacheControl ?? 'none'}`,
    });

    if (index === 0) checks.push(...isolationChecks(path, response));
  }
  return checks;
}

async function checkWasmMimeType(baseUrl: string): Promise<Check> {
  const binaries = existsSync(DIST_DIR)
    ? (await walk(DIST_DIR)).filter((path) => path.endsWith('.wasm')).sort()
    : [];
  const binary = binaries.at(0);

  if (binary === undefined) {
    return {
      name: 'wasm content-type',
      status: 'skip',
      detail: `no .wasm in ${DIST_DIR} — the parser ships in Phase 2; instantiateStreaming needs this assertion the day it does`,
    };
  }

  const path = toRequestPath(binary);
  const response = await fetchPath(baseUrl, path);
  const contentType = (response.headers.get('content-type') ?? 'none').split(';')[0]?.trim();
  const served = response.status === 200 && contentType === 'application/wasm';

  return {
    name: 'wasm content-type',
    status: served ? 'pass' : 'fail',
    detail: `${path} → ${response.status}, ${contentType}`,
  };
}

/**
 * `not_found_handling` answers anything the build did not write with the SPA shell, so a missing
 * radar comes back 200 `text/html` rather than 404. The content type is the only part of the
 * response that tells the two apart.
 */
async function checkRadarImage(baseUrl: string): Promise<Check> {
  const radars = existsSync(RADAR_DIR)
    ? (await walk(RADAR_DIR)).filter((path) => path.endsWith('.png')).sort()
    : [];
  const radar = radars.at(0);

  if (radar === undefined) {
    return {
      name: 'radar content-type',
      status: 'fail',
      detail: `no radar image under ${RADAR_DIR} — the renderer draws nothing without one`,
    };
  }

  const path = toRequestPath(radar);
  const response = await fetchPath(baseUrl, path);
  const contentType = (response.headers.get('content-type') ?? 'none').split(';')[0]?.trim();
  const served = response.status === 200 && contentType === 'image/png';

  return {
    name: 'radar content-type',
    status: served ? 'pass' : 'fail',
    detail: `${path} → ${response.status}, ${contentType}`,
  };
}

async function waitUntilRouted(url: string): Promise<void> {
  const startedAt = Date.now();
  const deadline = startedAt + READY_TIMEOUT_MS;
  let attempts = 0;

  while (Date.now() < deadline) {
    const response = await fetchPath(url, '/').catch(() => undefined);
    if (response?.status === 200) {
      const waitedMs = Date.now() - startedAt;
      if (attempts > 0) console.log(`  route became live after ${Math.round(waitedMs / 1000)}s\n`);
      return;
    }
    attempts += 1;
    await Bun.sleep(READY_POLL_MS);
  }

  console.error(
    `  ${url} did not return 200 within ${READY_TIMEOUT_MS / 1000}s — it is not being routed.`,
  );
  process.exit(1);
}

async function runChecks(url: string): Promise<Check[]> {
  return [
    ...(await checkDocument(url)),
    await checkClientRoute(url),
    ...(await checkImmutableCaching(url, await representativeHashedAssets())),
    await checkWasmMimeType(url),
    await checkRadarImage(url),
  ];
}

const baseUrl = process.argv[2];

if (baseUrl === undefined) {
  console.error('Usage: bun tools/scripts/smoke.ts <deployed-url>');
  process.exit(1);
}

if (!existsSync(DIST_DIR)) {
  console.error(`${DIST_DIR} does not exist. Run \`bun run build\` first.`);
  process.exit(1);
}

console.log(`Deploy smoke test — ${baseUrl} (AGENTS.md §13)\n`);

await waitUntilRouted(baseUrl);

const checks = await runChecks(baseUrl).catch((reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`  Could not reach ${baseUrl} — ${message}`);
  process.exit(1);
});

for (const check of checks) console.log(row(check));

const failed = checks.filter((check) => check.status === 'fail');
const skipped = checks.filter((check) => check.status === 'skip');

console.log(
  `\n  ${checks.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`,
);

if (failed.length > 0) process.exit(1);
