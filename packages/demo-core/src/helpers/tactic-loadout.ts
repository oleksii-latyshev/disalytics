import { GRENADE_REFERENCES } from './reference-data';
import type { Tactic, TacticSide } from './tactics';
import { THROWN_UTILITY_KINDS, type UtilityKind } from './utility';

export type GrenadeKind = Exclude<UtilityKind, 'kit'>;

export const GRENADE_KINDS: readonly GrenadeKind[] = THROWN_UTILITY_KINDS.filter(
  (kind): kind is GrenadeKind => kind !== 'kit',
);

export const MAX_FLASHES_CARRIED = 2;
export const MAX_OF_OTHER_KIND_CARRIED = 1;
export const MAX_GRENADES_CARRIED = 4;

export type GrenadeCounts = Readonly<Record<GrenadeKind, number>>;

export type CarryWarning =
  | { readonly code: 'flashLimit'; readonly slot: number; readonly count: number }
  | {
      readonly code: 'kindLimit';
      readonly slot: number;
      readonly kind: GrenadeKind;
      readonly count: number;
    }
  | { readonly code: 'totalLimit'; readonly slot: number; readonly count: number };

export interface PlayerLoadout {
  readonly slot: number;
  readonly counts: GrenadeCounts;
  readonly total: number;
  readonly cost: number;
}

export interface TacticLoadout {
  readonly players: readonly PlayerLoadout[];
  readonly teamCounts: GrenadeCounts;
  readonly teamTotal: number;
  readonly teamCost: number;
  readonly warnings: readonly CarryWarning[];
}

function emptyCounts(): Record<GrenadeKind, number> {
  return { he: 0, flash: 0, smoke: 0, fire: 0, decoy: 0 };
}

function isGrenadeKind(kind: UtilityKind): kind is GrenadeKind {
  return kind !== 'kit';
}

/** What one grenade of a kind costs a side; fire is the Molotov for T and the Incendiary for CT. */
export function grenadePrice(kind: GrenadeKind, side: TacticSide): number {
  const team = side === 'CT' ? 'ct' : 't';
  const reference = GRENADE_REFERENCES.find(
    (entry) => entry.kind === kind && (entry.team === 'both' || entry.team === team),
  );
  return reference?.price ?? 0;
}

function carryWarnings(slot: number, counts: GrenadeCounts, total: number): CarryWarning[] {
  const warnings: CarryWarning[] = [];
  if (counts.flash > MAX_FLASHES_CARRIED) {
    warnings.push({ code: 'flashLimit', slot, count: counts.flash });
  }
  for (const kind of GRENADE_KINDS) {
    if (kind !== 'flash' && counts[kind] > MAX_OF_OTHER_KIND_CARRIED) {
      warnings.push({ code: 'kindLimit', slot, kind, count: counts[kind] });
    }
  }
  if (total > MAX_GRENADES_CARRIED) {
    warnings.push({ code: 'totalLimit', slot, count: total });
  }
  return warnings;
}

/**
 * The utility a tactic needs: every throw across all steps consumes one grenade of its kind from
 * its thrower, so the totals are the minimum to buy for the tactic to be playable as drawn.
 */
export function tacticLoadout(tactic: Tactic): TacticLoadout {
  const bySlot = new Map<number, Record<GrenadeKind, number>>();
  for (const step of tactic.steps) {
    for (const player of step.players) {
      if (!bySlot.has(player.slot)) bySlot.set(player.slot, emptyCounts());
    }
    for (const thrown of step.throws) {
      if (!isGrenadeKind(thrown.kind)) continue;
      const counts = bySlot.get(thrown.throwerSlot) ?? emptyCounts();
      counts[thrown.kind] += 1;
      bySlot.set(thrown.throwerSlot, counts);
    }
  }

  const teamCounts = emptyCounts();
  const warnings: CarryWarning[] = [];
  let teamCost = 0;
  let teamTotal = 0;

  const players = [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slot, counts]): PlayerLoadout => {
      let total = 0;
      let cost = 0;
      for (const kind of GRENADE_KINDS) {
        total += counts[kind];
        cost += counts[kind] * grenadePrice(kind, tactic.side);
        teamCounts[kind] += counts[kind];
      }
      teamTotal += total;
      teamCost += cost;
      warnings.push(...carryWarnings(slot, counts, total));
      return { slot, counts, total, cost };
    });

  return { players, teamCounts, teamTotal, teamCost, warnings };
}
