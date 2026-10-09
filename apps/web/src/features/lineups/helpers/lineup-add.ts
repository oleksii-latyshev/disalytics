import type { Lineup, MovementKey, ThrowType, UtilityKind, WorldPoint } from '@disa/demo-core';
import { calloutAt, findNearestCallout } from '@disa/map-data';
import { LINEUP_KIND_NAMES } from '@/core/lineup-catalog';
import { buildLineupFromForm } from './build-lineup-from-form';
import { initFormValues } from './lineup-form-model';
import type { SavedTarget } from './lineup-targets';

export type AddSide = 'T' | 'CT';
export type AddStep = 'land' | 'origin' | 'details';

/** What a reader says about how it is thrown; each carries the keys that go with it. */
export const ADD_THROW_TYPES = ['stand', 'jump', 'crouch', 'run'] as const;
export type AddThrowType = (typeof ADD_THROW_TYPES)[number];

const KEYS_OF: Readonly<Record<AddThrowType, readonly MovementKey[]>> = {
  stand: ['Stand'],
  jump: ['Jump'],
  crouch: ['Ctrl'],
  run: ['W'],
};

/** A lineup being added: where it lands, where it is thrown from, and what is said about it. */
export interface AddDraft {
  readonly kind: UtilityKind;
  readonly side: AddSide;
  readonly landing: WorldPoint | null;
  readonly origin: WorldPoint | null;
  /** The target a position is being added to, whose landing is fixed. */
  readonly target: SavedTarget | null;
  readonly throwType: AddThrowType;
  /** `null` while it follows the suggestion, so changing the landing renames it. */
  readonly title: string | null;
  readonly notes: string;
}

export function startAdd(kind: UtilityKind | 'all', side: 'ALL' | 'T' | 'CT'): AddDraft {
  return {
    kind: kind === 'all' ? 'smoke' : kind,
    side: side === 'CT' ? 'CT' : 'T',
    landing: null,
    origin: null,
    target: null,
    throwType: 'jump',
    title: null,
    notes: '',
  };
}

/** A new position for a target: its landing is fixed, so the first press is where to throw from. */
export function startAnother(target: SavedTarget, side: Lineup['side']): AddDraft {
  return {
    ...startAdd(target.kind, side === 'CT' ? 'CT' : 'T'),
    landing: target.landing,
    target,
  };
}

export function addStep(draft: AddDraft): AddStep {
  if (draft.landing === null) return 'land';

  return draft.origin === null ? 'origin' : 'details';
}

export function stepNumber(step: AddStep): 1 | 2 | 3 {
  switch (step) {
    case 'land':
      return 1;
    case 'origin':
      return 2;
    case 'details':
      return 3;
  }
}

/** A press on the map: it places whichever point is next, and does nothing once both are placed. */
export function placePoint(draft: AddDraft, point: WorldPoint): AddDraft {
  switch (addStep(draft)) {
    case 'land':
      return { ...draft, landing: point };
    case 'origin':
      return { ...draft, origin: point };
    case 'details':
      return draft;
  }
}

/** Takes a placed point back so it can be placed again; a fixed landing stays where it is. */
export function redoPoint(draft: AddDraft, point: 'landing' | 'origin'): AddDraft {
  if (point === 'origin') return { ...draft, origin: null };

  return draft.target === null ? { ...draft, landing: null, origin: null } : draft;
}

/** What a landing is called: the callout it is in, or the nearest one within reach. */
export function landingName(map: string, landing: WorldPoint | null): string | null {
  return landing === null ? null : (calloutAt(map, landing)?.name ?? null);
}

/** "Smoke Window": what the lineup is called until the reader says otherwise. */
export function suggestedTitle(map: string, draft: AddDraft): string {
  return [LINEUP_KIND_NAMES[draft.kind], landingName(map, draft.landing)]
    .filter((part) => part !== null)
    .join(' ');
}

export function titleOf(map: string, draft: AddDraft): string {
  return draft.title ?? suggestedTitle(map, draft);
}

function throwTypeOf(type: AddThrowType): ThrowType {
  return type;
}

export interface NewLineupOptions {
  readonly map: string;
  readonly draft: AddDraft;
  readonly imageUrls: readonly string[];
  readonly id: string;
  readonly now: number;
  /** The group the lineup joins, when it is another position for a target. */
  readonly groupId?: string | undefined;
}

/** The lineup an add flow ends in, or `null` while a point is still unplaced. */
export function newLineup(options: NewLineupOptions): Lineup | null {
  const { map, draft, imageUrls, id, now, groupId } = options;
  const { landing, origin } = draft;
  if (landing === null || origin === null) return null;

  const callout = findNearestCallout(map, landing);
  const base = initFormValues(
    {
      map,
      kind: draft.kind,
      side: draft.side,
      origin,
      landing,
      throwType: throwTypeOf(draft.throwType),
      movementKeys: KEYS_OF[draft.throwType],
      mouseButtons: ['left'],
      notes: draft.notes,
      imageUrls,
      imageCaptions: imageUrls.map(() => ''),
      ...(callout === null ? {} : { targetCallout: callout }),
      ...(groupId === undefined ? {} : { groupId }),
    },
    map,
  );

  return buildLineupFromForm({ ...base, title: titleOf(map, draft) }, id, now, false);
}

export interface JoinPlan {
  readonly groupId: string;
  /** Members that were not in the group yet and now are; built-ins are left as they are. */
  readonly regrouped: readonly Lineup[];
}

/**
 * How a new position joins its target's group. The landing is shared, so moving it moves every
 * position of the target together; a built-in is not copied just to be put in the group, since it
 * lands together with the rest anyway.
 */
export function joinPlan(target: SavedTarget, newGroupId: string): JoinPlan {
  const members = target.variants.map(({ lineup }) => lineup);
  const existing = members.find((member) => member.groupId !== undefined);
  const groupId = existing?.groupId ?? newGroupId;

  return {
    groupId,
    regrouped: members
      .filter((member) => member.groupId === undefined && member.isBuiltIn !== true)
      .map((member) => ({ ...member, groupId })),
  };
}
