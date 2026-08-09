import { fileURLToPath } from 'node:url';
import { MAP_OVERVIEWS, RADAR_THEMES, radarAssetPath } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { radarAssetFiles } from '../radar-asset-files';

const ASSETS_ROOT = fileURLToPath(new URL('../../../../packages/map-data/assets', import.meta.url));

function pathsTheMapDataNames(): string[] {
  const fileNames = RADAR_THEMES.flatMap((theme) =>
    Object.values(MAP_OVERVIEWS).flatMap((overview) =>
      overview.levels.map((level) => radarAssetPath(level, theme)),
    ),
  );

  return [...new Set(fileNames)].sort((a, b) => a.localeCompare(b));
}

describe('radarAssetFiles', () => {
  it('finds exactly the images the map data names, in every theme', async () => {
    const files = await radarAssetFiles(ASSETS_ROOT);

    expect(files.map((file) => file.fileName)).toStrictEqual(pathsTheMapDataNames());
  });

  it('covers every theme', async () => {
    const files = await radarAssetFiles(ASSETS_ROOT);

    for (const theme of RADAR_THEMES) {
      expect(files.filter((file) => file.fileName.startsWith(`radar/${theme}/`))).not.toHaveLength(
        0,
      );
    }
  });

  it('resolves sources under the assets root', async () => {
    const files = await radarAssetFiles(ASSETS_ROOT);

    for (const file of files) {
      expect(file.sourcePath.startsWith(ASSETS_ROOT)).toBe(true);
    }
  });

  it('refuses an assets root with no radar images', async () => {
    await expect(radarAssetFiles(fileURLToPath(new URL('.', import.meta.url)))).rejects.toThrow();
  });
});
