import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { type RadarAssetFile, radarAssetFiles } from './radar-asset-files.ts';

export interface RadarAssetsOptions {
  /** Absolute path to `packages/map-data/assets`. */
  readonly assetsRoot: string;
}

async function readAsset(file: RadarAssetFile): Promise<{ fileName: string; source: Uint8Array }> {
  return { fileName: file.fileName, source: await readFile(file.sourcePath) };
}

/**
 * Serves the radar images `@disa/map-data` ships, under the same `/`-rooted path
 * `radarAssetPath()` returns. They are copied verbatim rather than content-hashed, because that
 * path is computed from the map data at runtime and cannot know a hash. AGENTS.md §9 keeps the
 * images out of the JS graph, which is why this is a plugin and not an `import`.
 */
export function radarAssets({ assetsRoot }: RadarAssetsOptions): Plugin {
  let isBuild = false;

  return {
    name: 'disalytics:radar-assets',

    configResolved(config) {
      isBuild = config.command === 'build';
    },

    async buildStart() {
      const files = await radarAssetFiles(assetsRoot);
      if (!isBuild) return;

      for (const { fileName, source } of await Promise.all(files.map(readAsset))) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },

    configureServer(server) {
      const sourceByUrl = radarAssetFiles(assetsRoot).then(
        (files) => new Map(files.map((file) => [`/${file.fileName}`, file.sourcePath])),
      );

      server.middlewares.use((request, response, next) => {
        const requestPath = new URL(request.url ?? '/', 'file:').pathname;

        sourceByUrl.then((sources) => {
          const sourcePath = sources.get(requestPath);
          if (sourcePath === undefined) {
            next();
            return;
          }

          response.setHeader('Content-Type', 'image/png');
          const stream = createReadStream(sourcePath);
          stream.on('error', next);
          stream.pipe(response);
        }, next);
      });
    },
  };
}
