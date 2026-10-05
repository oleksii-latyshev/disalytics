/** One entry of Vite's `build.manifest`, the fields a screen's weight is read from. */
export interface ManifestChunk {
  readonly file: string;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
}

export type Manifest = Readonly<Record<string, ManifestChunk>>;

/** A screen a visitor can open, named by the manifest keys of the lazy chunks it asks for. */
export interface Screen {
  readonly name: string;
  readonly lazy: readonly string[];
}

export const ENTRY_KEY = 'index.html';

const PAGES = 'src/routes/pages';
const REVIEW = 'src/features/review/components';

/**
 * Every screen the budget is about. Keys are manifest keys (the source path of a dynamic import), so
 * a rename that orphans one fails the measurement loudly instead of quietly weighing less.
 */
export const SCREENS: readonly Screen[] = [
  { name: 'home /', lazy: [`${PAGES}/HomePage.tsx`] },
  { name: 'library', lazy: [`${PAGES}/LibraryPage.tsx`] },
  { name: 'tools', lazy: [`${PAGES}/ToolsPage.tsx`] },
  { name: 'lineups', lazy: [`${PAGES}/LineupsPage.tsx`] },
  { name: 'tactics', lazy: [`${PAGES}/TacticsPage.tsx`] },
  { name: 'stats', lazy: [`${PAGES}/StatsPage.tsx`] },
  { name: 'match: stage', lazy: [`${PAGES}/MatchPage.tsx`] },
  { name: 'match: stats', lazy: [`${PAGES}/MatchPage.tsx`, `${REVIEW}/MatchStats.tsx`] },
  { name: 'match: duels', lazy: [`${PAGES}/MatchPage.tsx`, `${REVIEW}/MatchDuels.tsx`] },
  { name: 'match: heat map', lazy: [`${PAGES}/MatchPage.tsx`, `${REVIEW}/MatchHeatmap.tsx`] },
  { name: 'match: utility', lazy: [`${PAGES}/MatchPage.tsx`, `${REVIEW}/MatchUtility.tsx`] },
];

/** Files a chunk pulls in through static imports, itself included. */
export function staticClosure(
  manifest: Manifest,
  key: string,
  into = new Set<string>(),
): Set<string> {
  const chunk = manifest[key];
  if (chunk === undefined) throw new Error(`"${key}" is not in the build manifest`);
  if (into.has(chunk.file)) return into;

  into.add(chunk.file);
  for (const imported of chunk.imports ?? []) staticClosure(manifest, imported, into);
  return into;
}

/** The files opening `screen` downloads: the entry and what it loads, then each lazy chunk's own closure. */
export function screenFiles(manifest: Manifest, screen: Screen): ReadonlySet<string> {
  const files = staticClosure(manifest, ENTRY_KEY);
  for (const key of screen.lazy) staticClosure(manifest, key, files);
  return files;
}
