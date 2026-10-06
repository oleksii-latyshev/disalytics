import { GRENADE_REFERENCES } from './reference-data';
import { effectiveSteps, rootPlan } from './tactic-plans';
import type { Tactic, TacticSide, TacticThrow } from './tactics';
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

/** A grenade this player buys for a teammate, who throws it. */
export interface PlayerDrop {
  readonly toSlot: number;
  readonly kind: GrenadeKind;
  readonly count: number;
}

export interface PlayerLoadout {
  readonly slot: number;
  /** What the player buys and holds when the round starts, dropped grenades included. */
  readonly counts: GrenadeCounts;
  readonly total: number;
  readonly cost: number;
  /** The part of `counts` that is bought to be dropped to a teammate. */
  readonly drops: readonly PlayerDrop[];
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

interface Holdings {
  readonly bySlot: Map<number, Record<GrenadeKind, number>>;
  readonly dropsBySlot: Map<number, Map<string, PlayerDrop>>;
}

function recordDrop(holdings: Holdings, holder: number, thrown: TacticThrow, kind: GrenadeKind) {
  const drops = holdings.dropsBySlot.get(holder) ?? new Map<string, PlayerDrop>();
  const key = `${thrown.throwerSlot}:${kind}`;
  drops.set(key, {
    toSlot: thrown.throwerSlot,
    kind,
    count: (drops.get(key)?.count ?? 0) + 1,
  });
  holdings.dropsBySlot.set(holder, drops);
}

function holdThrow(holdings: Holdings, thrown: TacticThrow): void {
  if (!isGrenadeKind(thrown.kind)) return;
  const holder = thrown.droppedBy ?? thrown.throwerSlot;
  const counts = holdings.bySlot.get(holder) ?? emptyCounts();
  counts[thrown.kind] += 1;
  holdings.bySlot.set(holder, counts);
  if (holder !== thrown.throwerSlot) recordDrop(holdings, holder, thrown, thrown.kind);
}

/** Who carries each thrown grenade at buy time, and which of those are dropped to a teammate. */
function collectHoldings(tactic: Tactic): Holdings {
  const holdings: Holdings = { bySlot: new Map(), dropsBySlot: new Map() };
  const main = rootPlan(tactic);
  for (const step of main === undefined ? [] : effectiveSteps(tactic, main.id)) {
    for (const player of step.players) {
      if (!holdings.bySlot.has(player.slot)) holdings.bySlot.set(player.slot, emptyCounts());
    }
    for (const thrown of step.throws) holdThrow(holdings, thrown);
  }
  return holdings;
}

/**
 * The utility a tactic needs: every throw across all steps consumes one grenade of its kind, so the
 * totals are the minimum to buy for the tactic to be playable as drawn. A grenade is bought and
 * carried at buy time by whoever holds it then: its thrower, or the teammate named in `droppedBy`,
 * who drops it. Carry limits are checked on that, not on what a player throws over the round.
 */
export function tacticLoadout(tactic: Tactic): TacticLoadout {
  const { bySlot, dropsBySlot } = collectHoldings(tactic);

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
      const drops = [...(dropsBySlot.get(slot)?.values() ?? [])].sort(
        (a, b) =>
          a.toSlot - b.toSlot || GRENADE_KINDS.indexOf(a.kind) - GRENADE_KINDS.indexOf(b.kind),
      );
      return { slot, counts, total, cost, drops };
    });

  return { players, teamCounts, teamTotal, teamCost, warnings };
}
