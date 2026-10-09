import {
  areOneTarget,
  type Lineup,
  type LineupSide,
  type UtilityKind,
  type WorldPoint,
} from '@disa/demo-core';
import { calloutAt } from '@disa/map-data';

export type TargetSource = 'builtIn' | 'mine' | 'match';

/** One way of throwing at a target: a saved lineup, and where it is thrown from. */
export interface SavedVariant {
  readonly id: string;
  readonly origin: WorldPoint;
  readonly lineup: Lineup;
}

/**
 * Where a grenade of one kind lands, with every saved lineup that lands there — what a reader looks
 * for ("a smoke on Window"), where a list of lineups is what they have to read to find it.
 */
export interface SavedTarget {
  /** The first lineup's own id, so it holds while positions are added and moved. */
  readonly id: string;
  readonly kind: UtilityKind;
  readonly side: LineupSide;
  readonly landing: WorldPoint;
  /** How many positions are saved for it: the count on its marker. */
  readonly throwCount: number;
  readonly variants: readonly SavedVariant[];
  /** The callout it lands in, or the first lineup's own name where no callout holds it. */
  readonly name: string;
  readonly source: TargetSource;
}

function byAge(a: Lineup, b: Lineup): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

function isSharedLanding(a: Lineup, b: Lineup): boolean {
  return a.groupId !== undefined && a.groupId === b.groupId;
}

function landsTogether(anchor: Lineup, lineup: Lineup): boolean {
  if (anchor.kind !== lineup.kind) return false;

  return isSharedLanding(anchor, lineup) || areOneTarget(anchor.landing, lineup.landing);
}

function sideOf(members: readonly Lineup[]): LineupSide {
  const first = members[0];
  return first !== undefined && first.side !== 'BOTH' && members.every((m) => m.side === first.side)
    ? first.side
    : 'BOTH';
}

function sourceOf(members: readonly Lineup[]): TargetSource {
  if (members.every((member) => member.isBuiltIn === true)) return 'builtIn';

  return members.some((member) => member.fromDemo === true && member.isBuiltIn !== true)
    ? 'match'
    : 'mine';
}

function nameOf(map: string, anchor: Lineup, members: readonly Lineup[]): string {
  const named = members.find((member) => member.targetCallout);
  if (named?.targetCallout) return named.targetCallout;

  const near = calloutAt(map, anchor.landing);
  if (near !== null) return near.isApproximate ? `≈ ${near.name}` : near.name;

  return anchor.title;
}

/**
 * The lineups grouped by where they land, most positions first. Two lineups are one target when
 * they are the same kind and either share a landing group or land within `TARGET_LANDING_UNITS` of
 * the first one on the same floor.
 *
 * Grouping is greedy and runs oldest first, so the same lineups always give the same targets and a
 * target keeps its id while lineups are added to it.
 */
export function lineupTargets(map: string, lineups: readonly Lineup[]): readonly SavedTarget[] {
  const groups: Lineup[][] = [];

  for (const lineup of [...lineups].sort(byAge)) {
    const group = groups.find(([anchor]) => anchor !== undefined && landsTogether(anchor, lineup));
    if (group === undefined) groups.push([lineup]);
    else group.push(lineup);
  }

  return groups
    .flatMap((members) => {
      const [anchor] = members;
      if (anchor === undefined) return [];

      return [
        {
          id: anchor.id,
          kind: anchor.kind,
          side: sideOf(members),
          landing: anchor.landing,
          throwCount: members.length,
          variants: members.map((lineup) => ({ id: lineup.id, origin: lineup.origin, lineup })),
          name: nameOf(map, anchor, members),
          source: sourceOf(members),
        },
      ];
    })
    .sort((a, b) => b.throwCount - a.throwCount);
}
