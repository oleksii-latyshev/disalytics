import {
  averageEnemyBlind,
  enemiesPerFlash,
  type ThrownKind,
  totalThrown,
  UTILITY_NAMES,
  type UtilityFigures,
} from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export type UtilityTableId = 'thrown' | 'flashes' | 'damage';

/** How a figure is written; the formatting itself is the locale's, so it lives in the component. */
export type UtilityColumnFormat = 'integer' | 'decimal1' | 'decimal2' | 'money';

export interface UtilityColumn {
  readonly id: string;
  /** A heading made of words; game vocabulary has none and carries `name` instead. */
  readonly labelPath?: TranslationKey;
  /** A grenade's name, which is game vocabulary and is never translated (`AGENTS.md` §11). */
  readonly name?: string;
  readonly format: UtilityColumnFormat;
  /** Which end of the column is the good one. */
  readonly better: 'higher' | 'lower';
  /** Set for the figures a recording without flash events cannot state. */
  readonly needsFlashData?: true;
  /** The figure shown; `null` is one that does not exist, such as an average over nothing. */
  readonly read: (figures: UtilityFigures) => number | null;
}

/** A count over the rounds played; `null` with no round to measure. */
export function perRound(count: number, rounds: number): number | null {
  return rounds === 0 ? null : count / rounds;
}

const thrownColumn = (kind: ThrownKind): UtilityColumn => ({
  id: kind,
  name: UTILITY_NAMES[kind],
  format: 'decimal2',
  better: 'higher',
  read: (figures) => perRound(figures.thrown[kind], figures.rounds),
});

const THROWN: readonly UtilityColumn[] = [
  thrownColumn('he'),
  thrownColumn('flash'),
  thrownColumn('smoke'),
  thrownColumn('fire'),
  thrownColumn('decoy'),
  {
    id: 'total',
    labelPath: 'review.stats.utility.col.total',
    format: 'decimal2',
    better: 'higher',
    read: (figures) => perRound(totalThrown(figures.thrown), figures.rounds),
  },
];

const FLASHES: readonly UtilityColumn[] = [
  {
    id: 'flashesThrown',
    labelPath: 'review.stats.utility.col.flashesThrown',
    format: 'integer',
    better: 'higher',
    read: (figures) => figures.thrown.flash,
  },
  {
    id: 'enemiesPerFlash',
    labelPath: 'review.stats.utility.col.enemiesPerFlash',
    format: 'decimal2',
    better: 'higher',
    needsFlashData: true,
    read: enemiesPerFlash,
  },
  {
    id: 'averageBlind',
    labelPath: 'review.stats.utility.col.averageBlind',
    format: 'decimal2',
    better: 'higher',
    needsFlashData: true,
    read: averageEnemyBlind,
  },
  {
    id: 'teamFlashes',
    labelPath: 'review.stats.utility.col.teamFlashes',
    format: 'integer',
    better: 'lower',
    needsFlashData: true,
    read: (figures) => figures.teamFlashes,
  },
  {
    id: 'flashAssists',
    labelPath: 'review.stats.players.col.flashAssists',
    format: 'integer',
    better: 'higher',
    needsFlashData: true,
    read: (figures) => figures.flashAssists,
  },
];

const DAMAGE: readonly UtilityColumn[] = [
  {
    id: 'utilityDamage',
    labelPath: 'review.stats.players.col.utilityDamage',
    format: 'integer',
    better: 'higher',
    read: (figures) => figures.utilityDamage,
  },
  {
    id: 'damagePerRound',
    labelPath: 'review.stats.utility.col.damagePerRound',
    format: 'decimal1',
    better: 'higher',
    read: (figures) => perRound(figures.utilityDamage, figures.rounds),
  },
  {
    id: 'unusedDollars',
    labelPath: 'review.stats.utility.col.unusedDollars',
    format: 'money',
    better: 'lower',
    read: (figures) => figures.unusedDollars,
  },
  {
    id: 'unusedGrenades',
    labelPath: 'review.stats.utility.col.unusedGrenades',
    format: 'integer',
    better: 'lower',
    read: (figures) => figures.unusedGrenades,
  },
];

export interface UtilityTable {
  readonly id: UtilityTableId;
  readonly titlePath: TranslationKey;
  readonly columns: readonly UtilityColumn[];
}

/** One table per question, in the order a reader asks them. */
export const UTILITY_TABLES: readonly UtilityTable[] = [
  { id: 'thrown', titlePath: 'review.stats.utility.table.thrown', columns: THROWN },
  { id: 'flashes', titlePath: 'review.stats.utility.table.flashes', columns: FLASHES },
  { id: 'damage', titlePath: 'review.stats.utility.table.damage', columns: DAMAGE },
];

/**
 * The figure that stands out in a column across the players shown, or `null` when nothing does:
 * fewer than two distinct figures, or a column the recording cannot state.
 */
export function bestUtilityValue(
  players: readonly UtilityFigures[],
  column: UtilityColumn,
): number | null {
  const values = players
    .map((player) => column.read(player))
    .filter((value): value is number => value !== null);

  if (new Set(values).size < 2) return null;
  return column.better === 'higher' ? Math.max(...values) : Math.min(...values);
}
