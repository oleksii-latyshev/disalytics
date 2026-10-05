import type { LineupSide } from '@disa/demo-core';
import { LINEUP_KIND_NAMES } from '@/core/lineup-catalog';
import type { SavedTarget } from './lineup-targets';

/** "Smoke · Window": what a target is called wherever it is listed. */
export function targetTitle(target: Pick<SavedTarget, 'kind' | 'name'>): string {
  return `${LINEUP_KIND_NAMES[target.kind]} · ${target.name}`;
}

/** A side as it is read in a list: a lineup for both sides is `T·CT`. */
export function sideLabel(side: LineupSide): string {
  return side === 'BOTH' ? 'T·CT' : side;
}
