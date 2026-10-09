import {
  DUPLICATE_RADIUS,
  type FieldDiff,
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
      diffs.push({ field, before: left[field], after: right[field] });
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

/** Classifies every incoming lineup against what is stored. */
/** A preview row with its lineup typed. */
export type PlanItem = Omit<PreviewItem, 'lineup'> & { readonly lineup: Lineup };

export function planLineups(existing: readonly Lineup[], incoming: readonly Lineup[]): PlanItem[] {
  const byId = new Map(existing.map((lineup) => [lineup.id, lineup]));
  return incoming.map((lineup): PlanItem => {
    const stored = byId.get(lineup.id);
    if (stored !== undefined) {
      const diff = diffLineups(stored, lineup);
      return diff.length === 0
        ? { id: lineup.id, status: 'unchanged', lineup }
        : { id: lineup.id, status: 'update', lineup, diff };
    }
    const twin = findDuplicate(lineup, existing);
    return twin === null
      ? { id: lineup.id, status: 'new', lineup }
      : {
          id: lineup.id,
          status: 'duplicate',
          lineup,
          candidate: { id: twin.id, title: twin.title },
        };
  });
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
