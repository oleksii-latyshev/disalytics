import type { OpeningSide, ParsedDemo, PlayerSlot } from '@disa/demo-core';
import { matchPlayerStats, openingSideBySlot } from '@disa/demo-core';

export interface YourStats {
  readonly slot: PlayerSlot;
  readonly name: string;
  readonly openedAs: OpeningSide;
  readonly kills: number;
  readonly deaths: number;
  readonly adr: number;
  /** 1-based, by kills across both teams, ties broken by fewer deaths. */
  readonly rank: number;
  readonly players: number;
}

/**
 * The reader's line in a match, found by SteamID64, or `null` when they were not in it. The rank is
 * by kills over everyone who played, which is the one ordering a scoreboard already shows.
 */
export function yourStats(demo: ParsedDemo, steamId: string): YourStats | null {
  const me = demo.header.players.find((player) => player.steamId === steamId);
  if (me === undefined) return null;

  const rows = matchPlayerStats(demo).flatMap((team) => team.players);
  const mine = rows.find((row) => row.slot === me.slot);
  if (mine === undefined) return null;

  const ahead = rows.filter(
    (row) => row.kills > mine.kills || (row.kills === mine.kills && row.deaths < mine.deaths),
  ).length;
  const openedAs = openingSideBySlot(demo)[me.slot] ?? 'ct';

  return {
    slot: me.slot,
    name: me.name,
    openedAs,
    kills: mine.kills,
    deaths: mine.deaths,
    adr: Math.round(mine.adr),
    rank: ahead + 1,
    players: rows.length,
  };
}
