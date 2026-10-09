import { type Lineup, LineupFileError, parseLineupFile } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export interface LoadedFile {
  readonly name: string;
  readonly lineups: readonly Lineup[];
  readonly images: Readonly<Record<string, string>>;
}

export type FileResult =
  | { readonly ok: true; readonly file: LoadedFile }
  | { readonly ok: false; readonly key: TranslationKey; readonly detail: string | undefined };

const KEYS: Readonly<Record<LineupFileError['code'], TranslationKey>> = {
  INVALID_JSON: 'admin.file.invalidJson',
  UNSUPPORTED_VERSION: 'admin.file.unsupportedVersion',
  INVALID_SCHEMA: 'admin.file.invalidSchema',
};

export function readLineupFile(name: string, text: string): FileResult {
  try {
    const { lineups, images } = parseLineupFile(text, { allowBlankTitle: true });
    return { ok: true, file: { name, lineups, images } };
  } catch (error) {
    if (error instanceof LineupFileError) {
      return { ok: false, key: KEYS[error.code], detail: error.message };
    }
    return { ok: false, key: 'admin.file.invalidJson', detail: undefined };
  }
}

/** The maps a file holds lineups for, most common first. */
export function mapsOf(lineups: readonly Lineup[]): string[] {
  const counts = new Map<string, number>();
  for (const lineup of lineups) counts.set(lineup.map, (counts.get(lineup.map) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([map]) => map);
}
