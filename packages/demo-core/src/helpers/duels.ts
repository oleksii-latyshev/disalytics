import type { Frame, ParsedDemo, PlayerSlot, Team } from '../schema';
import { frameForTick, sidesBySlotAtRound } from './selectors';

/**
 * One kill as a thing with two ends on the map, rather than as a line in a feed.
 *
 * It carries the *frame* rather than the tick, because the two positions it is drawn from live in
 * `TickTrack` and are read at the moment the kill happened — by the time anything looks at a match's
 * duels, both players have moved, and a line drawn to where they are now answers nothing.
 *
 * The sides are the ones those slots held **that round**. `PlayerInfo.team` is the end-of-match
 * roster and names the wrong side for every round before the swap, which over a whole match is
 * half of them.
 */
export interface Duel {
  /** The round it happened in, which is the axis a reading of the whole match narrows by. */
  readonly roundIndex: number;
  /** Its index in `MatchEvents.kills`, which is where the weapon and the marks are read. */
  readonly killIndex: number;
  readonly frame: Frame;
  readonly attacker: PlayerSlot;
  readonly victim: PlayerSlot;
  readonly attackerSide: Team | undefined;
  readonly victimSide: Team | undefined;
}

export interface MultiKill {
  readonly roundIndex: number;
  readonly player: PlayerSlot;
  readonly side: Team;
  readonly kills: number;
}

export interface TradeKill {
  readonly roundIndex: number;
  readonly killIndex: number;
  readonly player: PlayerSlot;
  readonly side: Team;
}

export const TRADE_WINDOW_SECONDS = 5;

type OpponentDuel = Duel & { readonly attackerSide: Team; readonly victimSide: Team };

function isOpponentDuel(duel: Duel): duel is OpponentDuel {
  return (
    duel.attackerSide !== undefined &&
    duel.victimSide !== undefined &&
    duel.attackerSide !== duel.victimSide
  );
}

/**
 * Every kill in the match that has two ends, oldest first.
 *
 * **A kill by the world is left out**, and that is the one omission: fall damage and the `kill`
 * command have no attacker, so there is no point on the map for the line to come from. Everything
 * else is kept, a suicide with a grenade included — its two ends are the same point, which is a
 * true drawing of what happened.
 *
 * The window is the round's own `[startTick, endTick]`, which is where `roundSurvivors` and the
 * feed draw it too: the post-round kills that follow most rounds are not part of the round and are
 * not part of its duels either.
 *
 * Rounds and kills are both sorted by tick, so this walks each list once rather than searching the
 * kills per round. The sides are resolved once per round for the same reason.
 */
export function matchDuels(demo: ParsedDemo): readonly Duel[] {
  const { kills, rounds } = demo.events;
  const duels: Duel[] = [];
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < kills.length && (kills[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < kills.length; index++) {
      const kill = kills[index];
      if (kill === undefined || kill.tick > round.endTick) break;

      const { attacker } = kill;
      if (attacker === null) continue;

      duels.push({
        roundIndex,
        killIndex: index,
        frame: frameForTick(demo.track, kill.tick),
        attacker,
        victim: kill.victim,
        attackerSide: sides[attacker],
        victimSide: sides[kill.victim],
      });
    }
  }

  return duels;
}

/** The first opponent kill in each round, oldest first. */
export function openingDuels(demo: ParsedDemo): readonly Duel[] {
  const openings: Duel[] = [];
  let openedRound = -1;

  for (const duel of matchDuels(demo)) {
    if (duel.roundIndex === openedRound || !isOpponentDuel(duel)) continue;

    openings.push(duel);
    openedRound = duel.roundIndex;
  }

  return openings;
}

/** Players who killed at least two opponents in one round, oldest round first. */
export function multiKills(demo: ParsedDemo): readonly MultiKill[] {
  const counts = new Map<number, MultiKill>();

  for (const duel of matchDuels(demo)) {
    if (!isOpponentDuel(duel)) continue;

    const key = duel.roundIndex * demo.track.slotCount + duel.attacker;
    const previous = counts.get(key);
    counts.set(key, {
      roundIndex: duel.roundIndex,
      player: duel.attacker,
      side: duel.attackerSide,
      kills: (previous?.kills ?? 0) + 1,
    });
  }

  return [...counts.values()].filter(({ kills }) => kills >= 2);
}

/** Opponent kills that answer a teammate's death inside the trade window, oldest first. */
export function tradeKills(demo: ParsedDemo): readonly TradeKill[] {
  const trades: TradeKill[] = [];
  const latestKillByAttacker = new Map<PlayerSlot, Duel>();
  let roundIndex = -1;

  for (const duel of matchDuels(demo)) {
    if (duel.roundIndex !== roundIndex) {
      latestKillByAttacker.clear();
      roundIndex = duel.roundIndex;
    }
    if (!isOpponentDuel(duel)) continue;

    const previous = latestKillByAttacker.get(duel.victim);
    if (previous !== undefined) {
      const kill = demo.events.kills[duel.killIndex];
      const previousKill = demo.events.kills[previous.killIndex];
      if (kill === undefined || previousKill === undefined) continue;
      const elapsedTicks = kill.tick - previousKill.tick;
      if (
        previous.victimSide === duel.attackerSide &&
        elapsedTicks <= TRADE_WINDOW_SECONDS * demo.track.tickRate
      ) {
        trades.push({
          roundIndex: duel.roundIndex,
          killIndex: duel.killIndex,
          player: duel.attacker,
          side: duel.attackerSide,
        });
      }
    }

    latestKillByAttacker.set(duel.attacker, duel);
  }

  return trades;
}
