import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Plugin } from 'vite';

/** Only ever used to split a request path off its query string. */
const DEV_BASE = 'http://localhost';

/** What `samples-generate.ts` writes and `decodeDemo` reads: a gzip stream, not a gzipped file. */
const CONTAINER_SUFFIX = '.disa.gz';

export interface SampleContainersOptions {
  /** Absolute path to `apps/web/assets/samples`. */
  readonly assetsRoot: string;
}

/**
 * Serves the sample containers in dev the way the Worker serves them in production: as
 * `application/gzip` **with no `Content-Encoding`**.
 *
 * Vite's static middleware treats a `.gz` file as a pre-compressed copy of something else and names
 * `Content-Encoding: gzip` on it, so the browser un-gzips the body before the page sees it and
 * `decodeDemo` is handed the container's raw bytes where it expects a gzip stream. A sample then
 * downloads with a clean `200` and fails to open, under `bun run dev` only. #330 chose that split
 * deliberately — naming the encoding would leave the browser to do it, and a proxy that
 * re-compresses the response, which Cloudflare may, would hand the page bytes through gzip twice
 * and out of it once — so the fix is to make the dev server agree with the Worker rather than to
 * make the page tolerate both.
 *
 * **It serves the bytes rather than patching the headers a later handler will write.** A patch has
 * to guess which of `setHeader` and `writeHead` the static handler reaches for, and the header it
 * misses is the one that reintroduces the bug in silence; nothing here can serve a container with
 * an encoding on it, because nothing here names one.
 *
 * The build is untouched — this is `configureServer` and nothing else, so `dist` is byte-identical
 * either side of it.
 */
export function sampleContainers({ assetsRoot }: SampleContainersOptions): Plugin {
  return {
    name: 'disalytics:sample-containers',

    // The hook body runs before Vite's own middlewares are installed, which is what puts this ahead
    // of the static handler that would otherwise answer first.
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', DEV_BASE);
        // A query is Vite asking about the file rather than for it: `?url` is answered with a
        // *module* exporting the path, and serving the container's bytes to that request breaks the
        // import — the browser refuses `application/gzip` as a module script and the app never
        // starts. Only the bare path is the file itself.
        if (url.search !== '' || !url.pathname.endsWith(CONTAINER_SUFFIX)) {
          next();
          return;
        }

        const path = url.pathname;

        // `basename` is the whole of the path handling: a container is a flat file in one directory,
        // so nothing a request says can reach out of it.
        const sourcePath = join(assetsRoot, basename(path));
        const source = await stat(sourcePath).catch(() => null);
        if (source === null || !source.isFile()) {
          next();
          return;
        }

        response.setHeader('Content-Type', 'application/gzip');
        response.setHeader('Content-Length', source.size);
        response.setHeader('Cache-Control', 'no-cache');
        createReadStream(sourcePath).pipe(response);
      });
    },
  };
}
