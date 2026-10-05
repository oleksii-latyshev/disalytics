import type { UtilityKind } from '@disa/demo-core';
import type { LineupTagFilter } from './lineup-filter';

export type SideScope = 'ALL' | 'T' | 'CT';
export type KindScope = 'all' | UtilityKind;

/** What the reader has narrowed the map's lineups to. */
export interface LineupScope {
  readonly kind: KindScope;
  readonly side: SideScope;
  readonly tag: LineupTagFilter;
  readonly search: string;
}

export const NO_SCOPE: LineupScope = { kind: 'all', side: 'ALL', tag: 'all', search: '' };

/** The tags a reader can ask for; a lineup with no tag is only ever shown under "all". */
export const TAG_SCOPES = ['all', 'meta', 'old'] as const satisfies readonly LineupTagFilter[];
export const SIDE_SCOPES = ['ALL', 'T', 'CT'] as const satisfies readonly SideScope[];
