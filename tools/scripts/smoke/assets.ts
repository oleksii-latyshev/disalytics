/**
 * Which asset a deploy actually serves is a question only the deployed page can answer. A local
 * `apps/web/dist` cannot: a macOS `wasm-pack` build and the Linux one `deploy.yml` ships are the
 * same size from the same source and not the same bytes, so Vite gives them different content
 * hashes and the two names can never agree.
 */

/** Everything Vite writes into `assets/` is content-hashed, so a path names one build's file. */
const ASSET_PATH = /\/assets\/[A-Za-z0-9_.-]+/g;

/** A source map is not part of the deploy contract, and nothing the app runs asks for one. */
const NOT_AN_ASSET = /\.map$/;

/** Every `/assets/…` path a document or a chunk references, deduplicated, in a stable order. */
export function assetPathsIn(text: string): string[] {
  const found = new Set<string>();

  for (const [path] of text.matchAll(ASSET_PATH)) {
    if (!NOT_AN_ASSET.test(path)) found.add(path);
  }

  return [...found].sort();
}

/** The extension a path ends in, lower case and with its dot, or `''` where it has none. */
export function extensionOf(path: string): string {
  const stem = path.slice(path.lastIndexOf('/') + 1);
  const dot = stem.lastIndexOf('.');
  return dot <= 0 ? '' : stem.slice(dot).toLowerCase();
}

/**
 * One asset per extension. `_headers` grants `immutable` to `/assets/*` by path, so the contract is
 * about the directory rather than about any one file, and a sample per kind is what asserts it
 * without a request per font.
 */
export function representativesOf(paths: readonly string[]): Map<string, string> {
  const byExtension = new Map<string, string>();

  for (const path of [...paths].sort()) {
    const extension = extensionOf(path);
    if (!byExtension.has(extension)) byExtension.set(extension, path);
  }

  return byExtension;
}

/** The paths worth following to find more: a chunk names the next chunk, a stylesheet its fonts. */
export function isFollowable(path: string): boolean {
  const extension = extensionOf(path);
  return extension === '.js' || extension === '.css';
}

/** Vite names a `new Worker(new URL(…))` chunk `worker-<hash>.js`; the parse worker is one. */
const WORKER_CHUNK = /\/worker-[A-Za-z0-9_-]+\.js$/;

/**
 * Where a path joins the queue of chunks still to read: a worker goes ahead of everything waiting,
 * because the worker is the only file that names the binary, and behind the lazy chunks of every
 * screen and every map it would be read after the walk's bound — #598.
 */
export function enqueue(frontier: string[], path: string): void {
  if (!WORKER_CHUNK.test(path)) {
    frontier.push(path);
    return;
  }

  const firstOther = frontier.findIndex((queued) => !WORKER_CHUNK.test(queued));
  frontier.splice(firstOther === -1 ? frontier.length : firstOther, 0, path);
}

/**
 * Whether two reads of the deployed document name the same assets. `representativesOf` sorts, so an
 * ordered comparison is a set comparison here — and the caller needs to know that the *set* moved
 * rather than that some member of it did, because one changed hash means the whole version changed.
 */
export function sameAssets(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}
