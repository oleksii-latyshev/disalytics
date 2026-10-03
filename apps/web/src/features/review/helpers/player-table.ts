import type { PlayerStats } from '@disa/demo-core';
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

export type PlayerTableId = 'overview' | 'opening' | 'multi' | 'utility';

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

const OVERVIEW: readonly PlayerColumn[] = [
  {
    id: 'kills',
    labelPath: 'review.player.kills',
    format: 'integer',
    better: 'higher',
    read: (player) => player.kills,
  },
  {
    id: 'deaths',
    labelPath: 'review.player.deaths',
    format: 'integer',
    better: 'lower',
    read: (player) => player.deaths,
  },
  {
    id: 'assists',
    labelPath: 'review.board.assists',
    format: 'integer',
    better: 'higher',
    read: (player) => player.assists,
  },
  {
    id: 'diff',
    labelPath: 'review.stats.players.col.diff',
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
    format: 'decimal2',
    better: 'higher',
    read: (player) => player.rating,
  },
];

const OPENING: readonly PlayerColumn[] = [
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

export interface PlayerTable {
  readonly id: PlayerTableId;
  readonly titlePath: TranslationKey;
  readonly columns: readonly PlayerColumn[];
}

/** One table per question, in the order a reader asks them. */
export const PLAYER_TABLES: readonly PlayerTable[] = [
  { id: 'overview', titlePath: 'review.stats.players.table.overview', columns: OVERVIEW },
  { id: 'opening', titlePath: 'review.stats.players.table.opening', columns: OPENING },
  { id: 'multi', titlePath: 'review.stats.players.table.multi', columns: MULTI },
  { id: 'utility', titlePath: 'review.stats.players.table.utility', columns: UTILITY },
];

export const PLAYER_COLUMNS: readonly PlayerColumn[] = PLAYER_TABLES.flatMap(
  (table) => table.columns,
);

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

export interface PlayerSort {
  readonly column: PlayerColumnId;
  readonly direction: 'asc' | 'desc';
}

/**
 * A column sorts largest-first on its first press, smallest-first on its second, and the third
 * gives the table back its own order — the one `matchScoreboard` lists a team in.
 */
export function nextPlayerSort(
  current: PlayerSort | null,
  column: PlayerColumnId,
): PlayerSort | null {
  if (current?.column !== column) return { column, direction: 'desc' };
  return current.direction === 'desc' ? { column, direction: 'asc' } : null;
}

/** A stable sort: players level on the figure keep the order they arrived in, and a missing one goes last. */
export function sortPlayers(
  players: readonly PlayerStats[],
  sort: PlayerSort | null,
): readonly PlayerStats[] {
  const column = PLAYER_COLUMNS.find((entry) => entry.id === sort?.column);
  if (sort === null || column === undefined) return players;

  const sign = sort.direction === 'desc' ? -1 : 1;
  return players
    .map((player, index) => ({ player, index, value: column.read(player) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return (a.value === null ? 1 : 0) - (b.value === null ? 1 : 0) || a.index - b.index;
      }
      return sign * (a.value - b.value) || a.index - b.index;
    })
    .map(({ player }) => player);
}
