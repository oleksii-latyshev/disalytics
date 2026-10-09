import {
  DUPLICATE_RADIUS,
  type FieldDiff,
  lineupProblems,
  type PhotoStats,
  type PreviewItem,
} from '@disa/admin-contract';
import { isLocalImageRef, type Lineup, localImageHash } from '@disa/demo-core';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON with sorted keys and no `undefined`, so two equal values print the same whatever their order. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? 'null';
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

/** Fields that differ between two lineups, ignoring key order and the `isBuiltIn` marker. */
export function diffLineups(before: Lineup, after: Lineup): FieldDiff[] {
  const left: Record<string, unknown> = { ...before };
  const right: Record<string, unknown> = { ...after };
  const fields = new Set([...Object.keys(left), ...Object.keys(right)]);
  fields.delete('isBuiltIn');

  const diffs: FieldDiff[] = [];
  for (const field of [...fields].sort()) {
    if (stable(left[field]) !== stable(right[field])) {
      diffs.push({
        field,
        ...(left[field] === undefined ? {} : { before: left[field] }),
        ...(right[field] === undefined ? {} : { after: right[field] }),
      });
    }
  }
  return diffs;
}

function distance(a: Lineup['origin'], b: Lineup['origin']): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** The stored lineup that is the same throw as `lineup` under another id, nearest first. */
export function findDuplicate(lineup: Lineup, existing: readonly Lineup[]): Lineup | null {
  let best: Lineup | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of existing) {
    if (
      candidate.id === lineup.id ||
      candidate.map !== lineup.map ||
      candidate.kind !== lineup.kind ||
      candidate.side !== lineup.side
    ) {
      continue;
    }
    const origin = distance(candidate.origin, lineup.origin);
    const landing = distance(candidate.landing, lineup.landing);
    if (origin > DUPLICATE_RADIUS || landing > DUPLICATE_RADIUS) continue;
    if (origin + landing < bestDistance) {
      best = candidate;
      bestDistance = origin + landing;
    }
  }
  return best;
}

/** A preview row with its lineups typed. */
export type PlanItem = Omit<PreviewItem, 'lineup' | 'stored'> & {
  readonly lineup: Lineup;
  readonly stored?: Lineup;
};

/**
 * The lineup as it compares: a `local:<sha>` photo is the photo our storage keeps under that same
 * SHA-256, so a file that carries the bytes again reads equal to a lineup that already stores them.
 */
function comparable(lineup: Lineup, photoBaseUrl: string): Lineup {
  if (lineup.imageUrls === undefined) return lineup;
  const imageUrls = lineup.imageUrls.map((url) => {
    const hash = localImageHash(url);
    return hash === null ? url : `${photoBaseUrl}/${hash}`;
  });
  return { ...lineup, imageUrls };
}

/** Classifies every incoming lineup against what is stored. */
export function planLineups(
  existing: readonly Lineup[],
  incoming: readonly Lineup[],
  map: string,
  photoBaseUrl: string,
  aliases: ReadonlyMap<string, string> = new Map(),
): PlanItem[] {
  const byId = new Map(existing.map((lineup) => [lineup.id, lineup]));
  return incoming.map((lineup): PlanItem => {
    const problems = lineupProblems(lineup, map);
    const aliased = byId.get(aliases.get(lineup.id) ?? '');
    const stored = byId.get(lineup.id) ?? aliased;
    if (stored !== undefined) {
      const diff = diffLineups(stored, { ...comparable(lineup, photoBaseUrl), id: stored.id });
      return diff.length === 0
        ? { id: lineup.id, status: 'unchanged', lineup, stored, problems }
        : { id: lineup.id, status: 'update', lineup, stored, diff, problems };
    }
    const twin = findDuplicate(lineup, existing);
    return twin === null
      ? { id: lineup.id, status: 'new', lineup, problems }
      : {
          id: lineup.id,
          status: 'duplicate',
          lineup,
          stored: twin,
          diff: diffLineups(twin, comparable(lineup, photoBaseUrl)),
          problems,
        };
  });
}

/** Stored lineups the file does not mention, by id or by an alias it was merged under. */
export function serverOnlyLineups(
  existing: readonly Lineup[],
  incoming: readonly Lineup[],
  aliases: ReadonlyMap<string, string> = new Map(),
): Lineup[] {
  const ids = new Set(incoming.flatMap((lineup) => [lineup.id, aliases.get(lineup.id) ?? '']));
  return existing.filter((lineup) => !ids.has(lineup.id));
}

export function photoStats(lineups: readonly Lineup[], photoBaseUrl: string): PhotoStats {
  const embedded = new Set<string>();
  const links = new Set<string>();
  const ours = new Set<string>();
  for (const lineup of lineups) {
    for (const url of lineup.imageUrls ?? []) {
      const hash = localImageHash(url);
      if (hash !== null) embedded.add(hash);
      else if (isLocalImageRef(url)) continue;
      else if (url.startsWith(`${photoBaseUrl}/`)) ours.add(url);
      else links.add(url);
    }
  }
  return { embedded: embedded.size, links: links.size, ours: ours.size };
}

/** The `http(s)` photo links among the lineups' photos, without repeats. */
export function linkUrls(lineups: readonly Lineup[], photoBaseUrl: string): string[] {
  const links = new Set<string>();
  for (const lineup of lineups) {
    for (const url of lineup.imageUrls ?? []) {
      if (!isLocalImageRef(url) && !url.startsWith(`${photoBaseUrl}/`)) links.add(url);
    }
  }
  return [...links];
}

/**
 * Points every link we already copied at our copy, so a re-imported file compares equal to what is
 * stored and a replace does not bring the original links back.
 */
export function withKnownLinks(
  lineups: readonly Lineup[],
  known: ReadonlyMap<string, string>,
  photoBaseUrl: string,
): Lineup[] {
  if (known.size === 0) return [...lineups];
  return lineups.map((lineup) => {
    if (lineup.imageUrls === undefined) return lineup;
    const imageUrls = lineup.imageUrls.map((url) => {
      const sha = known.get(url);
      return sha === undefined ? url : `${photoBaseUrl}/${sha}`;
    });
    return { ...lineup, imageUrls };
  });
}
