import type { PlayerInfo, Team } from '@disa/demo-core';

/** Sides indexed by the slot they occupy in `TickTrack`, so a draw never searches the roster. */
export function teamsBySlot(players: readonly PlayerInfo[]): readonly (Team | undefined)[] {
  const teams: (Team | undefined)[] = [];

  for (const player of players) teams[player.slot] = player.team;

  return teams;
}
