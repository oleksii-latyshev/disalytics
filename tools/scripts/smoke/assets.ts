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
