import { readdir } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

const RADAR_DIR = 'radar';

export interface RadarAssetFile {
  /** Path under the served root and under `dist`, matching `radarAssetPath()` from `@disa/map-data`. */
  readonly fileName: string;
  readonly sourcePath: string;
}

/**
 * Every radar image `@disa/map-data` ships, read off disk. The package cannot be imported here —
 * Vite externalises workspace packages while loading the config, so Node would have to resolve its
 * TypeScript sources itself. `radar-assets.test.ts` is what holds this listing and the map data to
 * each other.
 */
export async function radarAssetFiles(assetsRoot: string): Promise<readonly RadarAssetFile[]> {
  const radarRoot = join(assetsRoot, RADAR_DIR);
  const entries = await readdir(radarRoot, { withFileTypes: true, recursive: true });

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => {
      const sourcePath = join(entry.parentPath, entry.name);
      return {
        fileName: posix.join(RADAR_DIR, ...relative(radarRoot, sourcePath).split(sep)),
        sourcePath,
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  if (files.length === 0) throw new Error(`No radar images under ${radarRoot}`);

  return files;
}
