import type { PlayerSlot, PlayerStats } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export type PlayerColumnId =
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'diff'
  | 'adr'
  | 'headshots'
  | 'kast'
  | 'rating'
  | 'openingKills'
  | 'openingDeaths'
  | 'openingSuccess'
  | 'tradeKills'
  | 'deathsTraded'
  | 'multi2'
  | 'multi3'
  | 'multi4'
  | 'multi5'
  | 'clutches'
  | 'utilityDamage'
  | 'flashAssists'
  | 'blind';

export type PlayerColumnSetId = 'main' | 'duels' | 'multi' | 'utility';

/** How a figure is written; the formatting itself is the locale's, so it lives in the component. */
export type PlayerColumnFormat = 'integer' | 'signed' | 'percent' | 'decimal1' | 'decimal2';

export interface PlayerColumn {
  readonly id: PlayerColumnId;
  /** The heading, in words a reader needs no tooltip for. */
  readonly labelPath: TranslationKey;
  readonly labelValues?: { readonly count: number };
  readonly format: PlayerColumnFormat;
  /** Which end of the column is the good one: more kills is, more deaths is not. */
  readonly better: 'higher' | 'lower';
  /** The figure's own heading is a short mark, so the full name goes to the tooltip. */
  readonly nameTitlePath?: TranslationKey;
  /** Drawn as a bar beside the figure, scaled to the largest in the match. */
  readonly bar?: true;
  /** Set for the two figures a recording without flash events cannot state. */
  readonly needsFlashData?: true;
  /** The figure shown and sorted by; `null` is a figure that does not exist, such as 0 of 0. */
  readonly read: (player: PlayerStats) => number | null;
}

/** Opening kills as a share of the opening duels the player took part in; `null` with none. */
export function openingSuccessPercent(player: PlayerStats): number | null {
  const attempts = player.openingWon + player.openingLost;
  return attempts === 0 ? null : (player.openingWon / attempts) * 100;
}

const multiColumn = (size: 2 | 3 | 4 | 5): PlayerColumn => ({
  id: `multi${size}`,
  labelPath: 'review.stats.players.col.multi',
  labelValues: { count: size },
  format: 'integer',
  better: 'higher',
  read: (player) => player.multiKillRounds[size - 2] ?? 0,
});

const MAIN: readonly PlayerColumn[] = [
  {
    id: 'kills',
    labelPath: 'review.stats.players.short.kills',
    nameTitlePath: 'review.player.kills',
    format: 'integer',
    better: 'higher',
    read: (player) => player.kills,
  },
  {
    id: 'deaths',
    labelPath: 'review.stats.players.short.deaths',
    nameTitlePath: 'review.player.deaths',
    format: 'integer',
    better: 'lower',
    read: (player) => player.deaths,
  },
  {
    id: 'assists',
    labelPath: 'review.stats.players.short.assists',
    nameTitlePath: 'review.board.assists',
    format: 'integer',
    better: 'higher',
    read: (player) => player.assists,
  },
  {
    id: 'diff',
    labelPath: 'review.stats.players.col.diff',
    nameTitlePath: 'review.stats.players.col.diffName',
    format: 'signed',
    better: 'higher',
    read: (player) => player.kills - player.deaths,
  },
  {
    id: 'adr',
    labelPath: 'review.stats.players.col.adr',
    format: 'integer',
    better: 'higher',
    read: (player) => player.adr,
  },
  {
    id: 'headshots',
    labelPath: 'review.stats.players.col.headshots',
    format: 'percent',
    better: 'higher',
    read: (player) => player.headshotPercent,
  },
  {
    id: 'kast',
    labelPath: 'review.stats.players.col.kast',
    format: 'percent',
    better: 'higher',
    read: (player) => player.kastPercent,
  },
  {
    id: 'rating',
    labelPath: 'review.stats.players.col.rating',
    bar: true,
    format: 'decimal2',
    better: 'higher',
    read: (player) => player.rating,
  },
];

const DUELS: readonly PlayerColumn[] = [
  {
    id: 'openingKills',
    labelPath: 'review.stats.players.col.openingKills',
    format: 'integer',
    better: 'higher',
    read: (player) => player.openingWon,
  },
  {
    id: 'openingDeaths',
    labelPath: 'review.stats.players.col.openingDeaths',
    format: 'integer',
    better: 'lower',
    read: (player) => player.openingLost,
  },
  {
    id: 'openingSuccess',
    labelPath: 'review.stats.players.col.openingSuccess',
    format: 'percent',
    better: 'higher',
    read: openingSuccessPercent,
  },
  {
    id: 'tradeKills',
    labelPath: 'review.stats.players.col.tradeKills',
    format: 'integer',
    better: 'higher',
    read: (player) => player.tradeKills,
  },
  {
    id: 'deathsTraded',
    labelPath: 'review.stats.players.col.deathsTraded',
    format: 'integer',
    better: 'higher',
    read: (player) => player.deathsTraded,
  },
];

const MULTI: readonly PlayerColumn[] = [
  multiColumn(2),
  multiColumn(3),
  multiColumn(4),
  multiColumn(5),
  {
    id: 'clutches',
    labelPath: 'review.stats.players.col.clutches',
    format: 'integer',
    better: 'higher',
    read: (player) => player.clutchesWon,
  },
];

const UTILITY: readonly PlayerColumn[] = [
  {
    id: 'utilityDamage',
    labelPath: 'review.stats.players.col.utilityDamage',
    bar: true,
    format: 'integer',
    better: 'higher',
    read: (player) => player.utilityDamage,
  },
  {
    id: 'flashAssists',
    labelPath: 'review.stats.players.col.flashAssists',
    format: 'integer',
    better: 'higher',
    needsFlashData: true,
    read: (player) => player.flashAssists,
  },
  {
    id: 'blind',
    labelPath: 'review.stats.players.col.blind',
    format: 'decimal1',
    better: 'higher',
    needsFlashData: true,
    read: (player) => player.enemyBlindSeconds,
  },
];

export interface PlayerColumnSet {
  readonly id: PlayerColumnSetId;
  readonly labelPath: TranslationKey;
  readonly notePath: TranslationKey;
  readonly columns: readonly PlayerColumn[];
}

/** One set of columns per question, in the order a reader asks them. */
export const PLAYER_COLUMN_SETS: readonly PlayerColumnSet[] = [
  {
    id: 'main',
    labelPath: 'review.stats.players.sets.main',
    notePath: 'review.stats.players.setNotes.main',
    columns: MAIN,
  },
  {
    id: 'duels',
    labelPath: 'review.stats.players.sets.duels',
    notePath: 'review.stats.players.setNotes.duels',
    columns: DUELS,
  },
  {
    id: 'multi',
    labelPath: 'review.stats.players.sets.multi',
    notePath: 'review.stats.players.setNotes.multi',
    columns: MULTI,
  },
  {
    id: 'utility',
    labelPath: 'review.stats.players.sets.utility',
    notePath: 'review.stats.players.setNotes.utility',
    columns: UTILITY,
  },
];

/**
 * The figure that stands out in a column across every player shown, or `null` when nothing does.
 *
 * Nothing does when fewer than two distinct figures exist: a column of zeros, or of one shared
 * value, has no best, and marking all ten rows is the same as marking none.
 */
export function bestValue(players: readonly PlayerStats[], column: PlayerColumn): number | null {
  const values = players
    .map((player) => column.read(player))
    .filter((value): value is number => value !== null);

  if (new Set(values).size < 2) return null;
  return column.better === 'higher' ? Math.max(...values) : Math.min(...values);
}

/** A stable sort by rating, best first: players level on it keep the order they arrived in. */
export function sortByRating(players: readonly PlayerStats[]): readonly PlayerStats[] {
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.rating - a.player.rating || a.index - b.index)
    .map(({ player }) => player);
}

/** The largest figure of a column across `players`, which a bar is scaled to; 0 when none exists. */
export function barScale(players: readonly PlayerStats[], column: PlayerColumn): number {
  return Math.max(0, ...players.map((player) => column.read(player) ?? 0));
}

export interface BestHolders {
  readonly value: number;
  /** Everyone who has it, in the order the players were given. */
  readonly slots: readonly PlayerSlot[];
}

/** Who holds a column's best figure, or `null` when nothing stands out (`bestValue`'s own rule). */
export function bestHolders(
  players: readonly PlayerStats[],
  column: PlayerColumn,
): BestHolders | null {
  const value = bestValue(players, column);
  if (value === null) return null;

  return {
    value,
    slots: players.filter((player) => column.read(player) === value).map((player) => player.slot),
  };
}

export const PLAYER_COLUMNS: readonly PlayerColumn[] = PLAYER_COLUMN_SETS.flatMap(
  (set) => set.columns,
);

export interface BestCard {
  readonly column: PlayerColumn;
  readonly titlePath: TranslationKey;
}

const BEST_CARD_ORDER: readonly (readonly [PlayerColumnId, TranslationKey])[] = [
  ['rating', 'review.stats.best.rating'],
  ['kills', 'review.stats.best.kills'],
  ['adr', 'review.stats.best.adr'],
  ['openingKills', 'review.stats.best.openingKills'],
  ['utilityDamage', 'review.stats.best.utilityDamage'],
  ['kast', 'review.stats.best.kast'],
];

/** One card per figure a post-match page leads with, in the order they are read. */
export const BEST_CARDS: readonly BestCard[] = BEST_CARD_ORDER.flatMap(([id, titlePath]) => {
  const column = PLAYER_COLUMNS.find((candidate) => candidate.id === id);
  return column === undefined ? [] : [{ column, titlePath }];
});
