import type { Lineup } from '@disa/demo-core';
import { allPicks, type FieldId, type Side } from './fields';
import { groupPhotos, keepSide, withoutPhoto } from './photos';
import type { Choice, ItemState } from './review';

export interface ReviewState {
  readonly photoBase: string;
  readonly order: readonly string[];
  readonly items: Readonly<Record<string, ItemState>>;
  /** Lineups only the site has that the person chose to delete. */
  readonly removals: ReadonlySet<string>;
}

export type ReviewAction =
  | { readonly type: 'loaded'; readonly photoBase: string; readonly items: readonly ItemState[] }
  | { readonly type: 'choose'; readonly id: string; readonly choice: Choice }
  | { readonly type: 'pick'; readonly id: string; readonly field: FieldId; readonly side: Side }
  | { readonly type: 'pickAll'; readonly id: string; readonly side: Side }
  | { readonly type: 'keep'; readonly id: string; readonly tile: string; readonly keep: boolean }
  | { readonly type: 'order'; readonly id: string; readonly order: readonly string[] }
  | {
      readonly type: 'edit';
      readonly id: string;
      readonly next: Lineup;
      readonly fields: readonly FieldId[];
    }
  | { readonly type: 'dropPhoto'; readonly id: string; readonly index: number }
  | { readonly type: 'drop'; readonly id: string; readonly dropped: boolean }
  | { readonly type: 'remove'; readonly id: string; readonly remove: boolean };

export const EMPTY_REVIEW: ReviewState = {
  photoBase: '',
  order: [],
  items: {},
  removals: new Set(),
};

function update(
  state: ReviewState,
  id: string,
  change: (item: ItemState) => ItemState,
): ReviewState {
  const item = state.items[id];
  return item === undefined ? state : { ...state, items: { ...state.items, [id]: change(item) } };
}

function withFields(item: ItemState, fields: readonly FieldId[], side: Side): ItemState['picks'] {
  const picks = { ...item.picks };
  for (const field of fields) picks[field] = side;
  return picks;
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'loaded':
      return {
        photoBase: action.photoBase,
        order: action.items.map((item) => item.id),
        items: Object.fromEntries(action.items.map((item) => [item.id, item])),
        removals: new Set(),
      };
    case 'choose':
      return update(state, action.id, (item) => ({ ...item, choice: action.choice }));
    case 'pick':
      return update(state, action.id, (item) => ({
        ...item,
        picks: withFields(item, [action.field], action.side),
      }));
    case 'pickAll':
      return update(state, action.id, (item) => ({
        ...item,
        picks: allPicks(action.side),
        photoKeep:
          item.stored === null
            ? {}
            : keepSide(groupPhotos(item.stored, item.edited, state.photoBase), action.side),
        photoOrder: null,
      }));
    case 'keep':
      return update(state, action.id, (item) => ({
        ...item,
        photoKeep: { ...item.photoKeep, [action.tile]: action.keep },
      }));
    case 'order':
      return update(state, action.id, (item) => ({ ...item, photoOrder: action.order }));
    case 'edit':
      return update(state, action.id, (item) => ({
        ...item,
        edited: action.next,
        picks: withFields(item, action.fields, 'file'),
      }));
    case 'dropPhoto':
      return update(state, action.id, (item) => ({
        ...item,
        edited: withoutPhoto(item.edited, action.index),
        photoKeep: {},
        photoOrder: null,
      }));
    case 'drop':
      return update(state, action.id, (item) => ({ ...item, dropped: action.dropped }));
    case 'remove': {
      const removals = new Set(state.removals);
      if (action.remove) removals.add(action.id);
      else removals.delete(action.id);
      return { ...state, removals };
    }
  }
}
