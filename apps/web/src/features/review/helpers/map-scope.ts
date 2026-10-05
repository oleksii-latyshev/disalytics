import {
  asFrame,
  type Duel,
  type Frame,
  frameForTick,
  type ParsedDemo,
  type PlayerSlot,
  type Team,
} from '@disa/demo-core';

/** `all` is not a side, and it is first because the match is what a map screen opens on. */
export type SideScope = 'all' | Team;

/**
 * What a map screen is narrowed to: a side, and the players whose tags are on. No tag on is every
 * player, which is what the screen opens on.
 */
export interface MapNarrowing {
  readonly side: SideScope;
  readonly players: readonly PlayerSlot[];
}

export const WHOLE_MATCH: MapNarrowing = { side: 'all', players: [] };

/**
 * Whether a mark belongs to the narrowing. **A mark belongs to whoever made it** — the attacker of a
 * duel, the thrower of a grenade — which is `isBySubject`'s rule on the round axis.
 */
export function isInNarrowing(
  narrowing: MapNarrowing,
  side: Team | undefined,
  slot: PlayerSlot,
): boolean {
  if (narrowing.side !== 'all' && side !== narrowing.side) return false;

  return narrowing.players.length === 0 || narrowing.players.includes(slot);
}

/** A tag pressed: on if it was off, off if it was on. */
export function togglePlayer(
  players: readonly PlayerSlot[],
  slot: PlayerSlot,
): readonly PlayerSlot[] {
  return players.includes(slot) ? players.filter((each) => each !== slot) : [...players, slot];
}

/**
 * How long before a kill "Open on the stage" lands — #387. Enough to see the two players find each
 * other, short enough that the kill is the next thing that happens.
 */
export const DUEL_LEAD_IN_SECONDS = 3;

/**
 * Where the stage opens for a duel: `DUEL_LEAD_IN_SECONDS` before it, but never before its round
 * started, so the round the reader lands in is the duel's own.
 */
export function stageFrameForDuel(demo: ParsedDemo, duel: Duel): Frame {
  const round = demo.events.rounds.at(duel.roundIndex);
  const roundStart = round === undefined ? 0 : frameForTick(demo.track, round.startTick);

  return asFrame(Math.max(roundStart, duel.frame - DUEL_LEAD_IN_SECONDS * demo.track.sampleHz));
}

/** The two sets of duels the view reads: the round-openers alone, or every kill between opponents. */
export type DuelMode = 'openings' | 'all';

/**
 * What the duel view is narrowed to, held by the match so that opening a duel on the stage and
 * coming back finds all of it where it was left (#387, #568).
 *
 * At most one of `player` and `pair` is set, and `duel` is the one chosen in the list — its index
 * in `MatchEvents.kills`, which survives a change of mode that keeps it and is dropped by one that
 * does not (`duelIsShown`). `pair` is `[row, column]` of the head-to-head grid and matches duels in
 * both directions.
 */
export interface DuelNarrowing {
  readonly mode: DuelMode;
  readonly player: PlayerSlot | null;
  readonly pair: readonly [PlayerSlot, PlayerSlot] | null;
  readonly duel: number | null;
}

/** It opens on the openings: the duels that decided rounds, not all of them at once. */
export const DUELS_OPENING: DuelNarrowing = {
  mode: 'openings',
  player: null,
  pair: null,
  duel: null,
};

export function hasDuelFilter(narrowing: DuelNarrowing): boolean {
  return narrowing.player !== null || narrowing.pair !== null;
}

/** Whether a duel is the pair's, whichever of the two killed the other. */
function isBetween(duel: Duel, pair: readonly [PlayerSlot, PlayerSlot]): boolean {
  const [first, second] = pair;

  return (
    (duel.attacker === first && duel.victim === second) ||
    (duel.attacker === second && duel.victim === first)
  );
}

/** Whether a duel survives the filter: a pair's, else a player's — as killer or as victim. */
export function isInDuelFilter(
  filter: Pick<DuelNarrowing, 'player' | 'pair'>,
  duel: Duel,
): boolean {
  if (filter.pair !== null) return isBetween(duel, filter.pair);
  if (filter.player !== null)
    return duel.attacker === filter.player || duel.victim === filter.player;

  return true;
}

/** A name pressed: that player alone, or everyone again when it was already the one. */
export function withPlayer(narrowing: DuelNarrowing, slot: PlayerSlot): DuelNarrowing {
  return { ...narrowing, player: narrowing.player === slot ? null : slot, pair: null, duel: null };
}

/** A cell pressed: that pair alone, or everyone again when it was already the one. */
export function withPair(
  narrowing: DuelNarrowing,
  row: PlayerSlot,
  column: PlayerSlot,
): DuelNarrowing {
  const [first, second] = narrowing.pair ?? [];
  const isChosen = first === row && second === column;

  return { ...narrowing, player: null, pair: isChosen ? null : [row, column], duel: null };
}

/** A mode pressed. The filter stays, since a name is as true of the other mode; the duel does not. */
export function withMode(narrowing: DuelNarrowing, mode: DuelMode): DuelNarrowing {
  return { ...narrowing, mode, duel: null };
}

/** *Reset*: every duel of the mode, with none chosen. */
export function withoutFilter(narrowing: DuelNarrowing): DuelNarrowing {
  return { ...narrowing, player: null, pair: null, duel: null };
}
