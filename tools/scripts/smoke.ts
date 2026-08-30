import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { assetPathsIn, extensionOf, isFollowable, representativesOf } from './smoke/assets';

// The radar images are the one part of the contract a local checkout can still speak for: they are
// committed, copied verbatim rather than content-hashed, and served under a path computed from the
// map data — so their names are the same on any machine, which no hashed asset's is.
const RADAR_ASSETS_DIR = join('packages', 'map-data', 'assets', 'radar');

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

// A hashed asset whose name is new in this deploy lags the document it is named from: measured at
// 38 s and again at 2.5 minutes on deploys that were correct throughout. `not_found_handling`
// answers a path the edge does not have yet with the shell, so the wait is for that to stop.
const ASSET_TIMEOUT_MS = 120_000;
const ASSET_POLL_MS = 3_000;

// Following the document's own scripts and stylesheets: index.html names the entry chunk and the
// stylesheet, the entry chunk names the parse worker, and the worker is the only thing that names
// the binary. Three hops with room to spare, and a bound so a redirect loop cannot spin here.
const DISCOVERY_FETCH_LIMIT = 24;

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

/**
 * Every asset the deployed page reaches, found by walking what it names: the document names the
 * entry chunk and the stylesheet, the entry chunk names the parse worker, and the worker is the
 * only thing that names the binary — the name is nowhere in `index.html`.
 */
async function discoverAssets(baseUrl: string): Promise<string[]> {
  const found = new Set<string>();
  const frontier = ['/'];
  let fetches = 0;

  while (frontier.length > 0 && fetches < DISCOVERY_FETCH_LIMIT) {
    const path = frontier.shift() as string;
    const response = await fetchPath(baseUrl, path);
    fetches += 1;

    for (const asset of assetPathsIn(await response.text())) {
      if (found.has(asset)) continue;
      found.add(asset);
      if (isFollowable(asset)) frontier.push(asset);
    }
  }

  return [...found].sort();
}

function contentTypeOf(response: Response): string {
  return (response.headers.get('content-type') ?? 'none').split(';')[0]?.trim() ?? 'none';
}

/** The shell answering for an asset path, which is `not_found_handling` and not a served file. */
function isShell(response: Response): boolean {
  return contentTypeOf(response) === 'text/html';
}

interface Served {
  readonly path: string;
  readonly response: Response;
  readonly waitedMs: number;
}

/**
 * One request per asset, retried only while the shell is answering. Both the caching and the
 * content-type assertions read this single response, so they can no longer disagree about the same
 * URL seconds apart — which is how #65 first showed itself.
 *
 * The deadline is shared across every asset rather than granted to each: propagation is one event
 * at the edge, so four assets each waiting their own two minutes would spend eight on it.
 */
async function fetchWhenServed(baseUrl: string, path: string, deadline: number): Promise<Served> {
  const startedAt = Date.now();
  let response = await fetchPath(baseUrl, path);

  while (isShell(response) && Date.now() < deadline) {
    await Bun.sleep(ASSET_POLL_MS);
    response = await fetchPath(baseUrl, path);
  }

  return { path, response, waitedMs: Date.now() - startedAt };
}

function checkImmutableCaching(served: readonly Served[]): Check[] {
  const checks: Check[] = [];

  for (const [index, { path, response, waitedMs }] of served.entries()) {
    const cacheControl = response.headers.get('cache-control');
    const immutable =
      cacheControl !== null && normalizeCacheControl(cacheControl) === IMMUTABLE_CACHE_CONTROL;
    const waited = waitedMs < ASSET_POLL_MS ? '' : `, after ${Math.round(waitedMs / 1000)}s`;

    checks.push({
      name: `immutable ${extensionOf(path) || 'no extension'}`,
      status: response.status === 200 && immutable && !isShell(response) ? 'pass' : 'fail',
      detail: `${path} → ${response.status}, cache-control: ${cacheControl ?? 'none'}${waited}`,
    });

    if (index === 0) checks.push(...isolationChecks(path, response));
  }

  return checks;
}

function checkWasmMimeType(served: readonly Served[]): Check {
  const binary = served.find(({ path }) => extensionOf(path) === '.wasm');

  if (binary === undefined) {
    return {
      name: 'wasm content-type',
      status: 'fail',
      detail: 'the deployed page reaches no .wasm — instantiateStreaming has nothing to load',
    };
  }

  const contentType = contentTypeOf(binary.response);
  const served200 = binary.response.status === 200 && contentType === 'application/wasm';

  return {
    name: 'wasm content-type',
    status: served200 ? 'pass' : 'fail',
    detail: `${binary.path} → ${binary.response.status}, ${contentType}`,
  };
}

/**
 * `not_found_handling` answers anything the build did not write with the SPA shell, so a missing
 * radar comes back 200 `text/html` rather than 404. The content type is the only part of the
 * response that tells the two apart.
 */
async function checkRadarImage(baseUrl: string): Promise<Check> {
  const radars = existsSync(RADAR_ASSETS_DIR)
    ? (await walk(RADAR_ASSETS_DIR)).filter((path) => path.endsWith('.png')).sort()
    : [];
  const radar = radars.at(0);

  if (radar === undefined) {
    return {
      name: 'radar content-type',
      status: 'fail',
      detail: `no radar image under ${RADAR_ASSETS_DIR} — the renderer draws nothing without one`,
    };
  }

  const path = `/radar/${relative(RADAR_ASSETS_DIR, radar).split(sep).join('/')}`;
  const response = await fetchPath(baseUrl, path);
  const contentType = contentTypeOf(response);
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
  const assets = representativesOf(await discoverAssets(url));

  if (assets.size === 0) {
    return [
      ...(await checkDocument(url)),
      await checkClientRoute(url),
      {
        name: 'hashed assets',
        status: 'fail',
        detail: `${url} references no /assets/… file — nothing was deployed, or the shell is stale`,
      },
    ];
  }

  const deadline = Date.now() + ASSET_TIMEOUT_MS;
  const served: Served[] = [];
  for (const path of assets.values()) served.push(await fetchWhenServed(url, path, deadline));

  return [
    ...(await checkDocument(url)),
    await checkClientRoute(url),
    ...checkImmutableCaching(served),
    checkWasmMimeType(served),
    await checkRadarImage(url),
  ];
}

const baseUrl = process.argv[2];

if (baseUrl === undefined) {
  console.error('Usage: bun tools/scripts/smoke.ts <deployed-url>');
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
