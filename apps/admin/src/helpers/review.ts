import {
  lineupProblems,
  type PreviewItem,
  type PreviewStatus,
  type Problem,
} from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { defaultPicks, FIELD_IDS, mergeFields, type Picks, sameField } from './fields';
import { groupPhotos, keptTiles, orderedTiles, type Sizes, withTiles } from './photos';

/** What the person chose for one lineup of the file. */
export type Choice = 'merge' | 'file' | 'stored' | 'both' | 'add' | 'skip';

export interface ItemState {
  readonly id: string;
  readonly status: PreviewStatus;
  /** The lineup on the site this one updates or may duplicate. */
  readonly stored: Lineup | null;
  /** As the file has it, with the person's fixes. */
  readonly edited: Lineup;
  readonly choice: Choice;
  readonly picks: Picks;
  readonly photoKeep: Readonly<Record<string, boolean>>;
  readonly photoOrder: readonly string[] | null;
  /** "Do not add" from the review list; works on any row and is undone from the same place. */
  readonly dropped: boolean;
  /** The id a lineup gets when it is kept as a second one beside the site's. */
  readonly secondId: string;
  /** What was wrong with the file's lineup when it was read, which puts it among the questions. */
  readonly initialProblems: readonly Problem[];
}

export type Plan =
  | { readonly kind: 'skip'; readonly why: 'dropped' | 'same' | 'chosen' }
  | { readonly kind: 'add'; readonly lineup: Lineup; readonly second: boolean }
  | {
      readonly kind: 'replace';
      readonly targetId: string;
      readonly lineup: Lineup;
      readonly merged: boolean;
    };

export interface ItemInput {
  readonly item: PreviewItem;
  readonly lineup: Lineup;
  readonly stored: Lineup | null;
  readonly secondId: string;
}

export function defaultChoice(status: PreviewStatus): Choice {
  if (status === 'new') return 'add';
  return status === 'unchanged' ? 'skip' : 'merge';
}

export function initialItem(input: ItemInput): ItemState {
  const { item, lineup, stored } = input;
  return {
    id: item.id,
    status: item.status,
    stored,
    edited: lineup,
    choice: defaultChoice(item.status),
    picks: stored === null ? defaultPicks(lineup, lineup) : defaultPicks(stored, lineup),
    photoKeep: {},
    photoOrder: null,
    dropped: false,
    secondId: input.secondId,
    initialProblems: item.problems,
  };
}

function mergedLineup(item: ItemState, stored: Lineup, photoBase: string, sizes: Sizes): Lineup {
  const fields = mergeFields(stored, item.edited, item.picks);
  const groups = groupPhotos(stored, item.edited, photoBase);
  const tiles = orderedTiles(keptTiles(groups, sizes, item.photoKeep), item.photoOrder);
  return withTiles(fields, tiles);
}

/** Whether an unchanged lineup was edited, which makes it a replace after all. */
function isEdited(item: ItemState, stored: Lineup): boolean {
  return FIELD_IDS.some((id) => !sameField(id, stored, item.edited));
}

/** What saving this lineup would do, with the lineup exactly as it would be saved. */
export function planOf(item: ItemState, photoBase: string, sizes: Sizes): Plan {
  if (item.dropped) return { kind: 'skip', why: 'dropped' };
  const { stored } = item;
  if (item.status === 'unchanged') {
    return stored !== null && isEdited(item, stored)
      ? {
          kind: 'replace',
          targetId: stored.id,
          lineup: { ...item.edited, id: stored.id },
          merged: false,
        }
      : { kind: 'skip', why: 'same' };
  }
  switch (item.choice) {
    case 'skip':
    case 'stored':
      return { kind: 'skip', why: 'chosen' };
    case 'add':
      return { kind: 'add', lineup: item.edited, second: false };
    case 'both':
      return { kind: 'add', lineup: { ...item.edited, id: item.secondId }, second: true };
    case 'file':
      return stored === null
        ? { kind: 'add', lineup: item.edited, second: false }
        : {
            kind: 'replace',
            targetId: stored.id,
            lineup: { ...item.edited, id: stored.id },
            merged: false,
          };
    case 'merge':
      return stored === null
        ? { kind: 'add', lineup: item.edited, second: false }
        : {
            kind: 'replace',
            targetId: stored.id,
            lineup: mergedLineup(item, stored, photoBase, sizes),
            merged: true,
          };
  }
}

export function problemsOfPlan(plan: Plan, map: string): Problem[] {
  return plan.kind === 'skip' ? [] : lineupProblems(plan.lineup, map);
}

export type Outcome = 'add' | 'addSecond' | 'update' | 'merge' | 'skip' | 'same' | 'fix';

export function outcomeOf(item: ItemState, plan: Plan, problems: readonly Problem[]): Outcome {
  if (plan.kind === 'skip') return plan.why === 'same' ? 'same' : 'skip';
  if (problems.length > 0) return 'fix';
  if (plan.kind === 'add') return plan.second ? 'addSecond' : 'add';
  return item.status === 'duplicate' ? 'merge' : 'update';
}

/** The questions the person has to answer: what changed or looks the same, and what is wrong. */
export function needsDecision(item: ItemState): boolean {
  return item.status === 'update' || item.status === 'duplicate' || item.initialProblems.length > 0;
}

/** The stored lineup a plan would replace, or null when it replaces nothing. */
function targetOf(plan: Plan): string | null {
  return plan.kind === 'replace' ? plan.targetId : null;
}

/**
 * For each lineup of the file that shares its target on the site with another, the titles of the
 * others. The Worker refuses a request that replaces one lineup twice, so the page never lets it
 * get that far.
 */
export function targetClashes(
  entries: readonly { readonly id: string; readonly title: string; readonly plan: Plan }[],
): ReadonlyMap<string, readonly string[]> {
  const byTarget = new Map<string, typeof entries>();
  for (const entry of entries) {
    const target = targetOf(entry.plan);
    if (target !== null) byTarget.set(target, [...(byTarget.get(target) ?? []), entry]);
  }
  const clashes = new Map<string, readonly string[]>();
  for (const group of byTarget.values()) {
    if (group.length < 2) continue;
    for (const entry of group) {
      clashes.set(
        entry.id,
        group.filter((other) => other.id !== entry.id).map((other) => other.title),
      );
    }
  }
  return clashes;
}

/**
 * Starts a file that holds several versions of one stored lineup in a state that saves: the one
 * with the stored id (else the first) keeps its place, the others are added as lineups of their own.
 */
export function resolveClashes(items: readonly ItemState[]): ItemState[] {
  const taken = new Set<string>();
  const ordered = [...items].sort(
    (a, b) => Number(b.status === 'update') - Number(a.status === 'update'),
  );
  const demoted = new Set<string>();
  for (const item of ordered) {
    const plan = planOf(item, '', new Map());
    const target = targetOf(plan);
    if (target === null) continue;
    if (taken.has(target)) demoted.add(item.id);
    else taken.add(target);
  }
  return items.map((item) =>
    demoted.has(item.id) ? { ...item, choice: item.status === 'update' ? 'both' : 'add' } : item,
  );
}
