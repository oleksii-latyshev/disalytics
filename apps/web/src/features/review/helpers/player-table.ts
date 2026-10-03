import type { PlayerStats } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export type PlayerColumnId =
  | 'kills'
  | 'assists'
  | 'deaths'
  | 'diff'
  | 'adr'
  | 'headshots'
  | 'kast'
  | 'opening'
  | 'tradeKills'
  | 'deathsTraded'
  | 'multi2'
  | 'multi3'
  | 'multi4'
  | 'multi5'
  | 'clutches'
  | 'utilityDamage'
  | 'flashAssists'
  | 'blind'
  | 'rating';

/** How a figure is written; the formatting itself is the locale's, so it lives in the component. */
export type PlayerColumnFormat =
  | 'integer'
  | 'signed'
  | 'percent'
  | 'decimal1'
  | 'decimal2'
  | 'record';

export interface PlayerColumn {
  readonly id: PlayerColumnId;
  /** The full name, read by a screen reader and shown as the header's tooltip. */
  readonly namePath: TranslationKey;
  readonly nameValues?: { readonly count: number };
  /** What fits over a column of figures; a column with none states `abbrLiteral` in every locale. */
  readonly abbrPath?: TranslationKey;
  readonly abbrLiteral?: string;
  readonly format: PlayerColumnFormat;
  /** The figure the column sorts by. */
  readonly read: (player: PlayerStats) => number;
}

const multiColumn = (size: 2 | 3 | 4 | 5): PlayerColumn => ({
  id: `multi${size}`,
  namePath: 'review.stats.players.col.multi',
  nameValues: { count: size },
  abbrLiteral: `${size}K`,
  format: 'integer',
  read: (player) => player.multiKillRounds[size - 2] ?? 0,
});

/** What a row states, in the order the table reads them. */
export const PLAYER_COLUMNS: readonly PlayerColumn[] = [
  {
    id: 'kills',
    namePath: 'review.player.kills',
    abbrPath: 'review.player.abbr.kills',
    format: 'integer',
    read: (player) => player.kills,
  },
  {
    id: 'assists',
    namePath: 'review.board.assists',
    abbrPath: 'review.board.abbr.assists',
    format: 'integer',
    read: (player) => player.assists,
  },
  {
    id: 'deaths',
    namePath: 'review.player.deaths',
    abbrPath: 'review.player.abbr.deaths',
    format: 'integer',
    read: (player) => player.deaths,
  },
  {
    id: 'diff',
    namePath: 'review.board.diff',
    abbrPath: 'review.board.abbr.diff',
    format: 'signed',
    read: (player) => player.kills - player.deaths,
  },
  {
    id: 'adr',
    namePath: 'review.board.adr',
    abbrPath: 'review.board.abbr.adr',
    format: 'integer',
    read: (player) => player.adr,
  },
  {
    id: 'headshots',
    namePath: 'review.board.headshots',
    abbrPath: 'review.board.abbr.headshots',
    format: 'percent',
    read: (player) => player.headshotPercent,
  },
  {
    id: 'kast',
    namePath: 'review.stats.players.col.kast.name',
    abbrPath: 'review.stats.players.col.kast.abbr',
    format: 'percent',
    read: (player) => player.kastPercent,
  },
  {
    id: 'opening',
    namePath: 'review.stats.players.col.opening.name',
    abbrPath: 'review.stats.players.col.opening.abbr',
    format: 'record',
    read: (player) => player.openingWon,
  },
  {
    id: 'tradeKills',
    namePath: 'review.stats.players.col.tradeKills.name',
    abbrPath: 'review.stats.players.col.tradeKills.abbr',
    format: 'integer',
    read: (player) => player.tradeKills,
  },
  {
    id: 'deathsTraded',
    namePath: 'review.stats.players.col.deathsTraded.name',
    abbrPath: 'review.stats.players.col.deathsTraded.abbr',
    format: 'integer',
    read: (player) => player.deathsTraded,
  },
  multiColumn(2),
  multiColumn(3),
  multiColumn(4),
  multiColumn(5),
  {
    id: 'clutches',
    namePath: 'review.stats.players.col.clutches.name',
    abbrPath: 'review.stats.players.col.clutches.abbr',
    format: 'integer',
    read: (player) => player.clutchesWon,
  },
  {
    id: 'utilityDamage',
    namePath: 'review.stats.players.col.utilityDamage.name',
    abbrPath: 'review.stats.players.col.utilityDamage.abbr',
    format: 'integer',
    read: (player) => player.utilityDamage,
  },
  {
    id: 'flashAssists',
    namePath: 'review.stats.players.col.flashAssists.name',
    abbrPath: 'review.stats.players.col.flashAssists.abbr',
    format: 'integer',
    read: (player) => player.flashAssists,
  },
  {
    id: 'blind',
    namePath: 'review.stats.players.col.blind.name',
    abbrPath: 'review.stats.players.col.blind.abbr',
    format: 'decimal1',
    read: (player) => player.enemyBlindSeconds,
  },
  {
    id: 'rating',
    namePath: 'review.stats.players.col.rating.name',
    abbrPath: 'review.stats.players.col.rating.abbr',
    format: 'decimal2',
    read: (player) => player.rating,
  },
];

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

/** A stable sort: two players level on the figure keep the order they arrived in. */
export function sortPlayers(
  players: readonly PlayerStats[],
  sort: PlayerSort | null,
): readonly PlayerStats[] {
  const column = PLAYER_COLUMNS.find((entry) => entry.id === sort?.column);
  if (sort === null || column === undefined) return players;

  const sign = sort.direction === 'desc' ? -1 : 1;
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => sign * (column.read(a.player) - column.read(b.player)) || a.index - b.index)
    .map(({ player }) => player);
}
