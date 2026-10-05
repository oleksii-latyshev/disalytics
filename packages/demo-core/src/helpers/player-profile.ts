import type { Kill, ParsedDemo, Round, Team } from '../schema';
import { matchClutches } from './clutches';
import { roundKillCounts } from './duels';
import { type MultiKillRounds, matchPlayerStats } from './player-stats';
import { matchScore, type OpeningSide, openingSideBySlot } from './score';
import { killWeaponName } from './weapons';

/** What one side of a match came to for one player. Kills and deaths are the player's own. */
export interface SideRecord {
  readonly kills: number;
  readonly deaths: number;
  /** Rounds the player was recorded on this side for. */
  readonly rounds: number;
  /** Of those rounds, the ones this side won. */
  readonly roundsWon: number;
}

export type MatchResult = 'win' | 'loss' | 'draw';

export interface PlayerMoment {
  readonly roundIndex: number;
  readonly kind: 'clutch' | 'multi';
  /** Opponents faced in a clutch, kills made in a multi-kill. */
  readonly count: number;
}

export interface WeaponKills {
  /** The name a reader sees: `killWeaponName`, so utility and knives read as they do everywhere. */
  readonly weapon: string;
  readonly kills: number;
}

/**
 * One player's match, found by SteamID64 and reduced to the figures a profile adds up. It holds
 * counts rather than ratios — ADR, KAST and HS are ratios of these — so that the fold across
 * matches weighs each match by its rounds and kills instead of averaging averages.
 */
export interface PlayerMatchLine {
  readonly steamId: string;
  readonly name: string;
  readonly map: string;
  /** The side the player's team opened on — the only team name a demo gives. */
  readonly openedAs: OpeningSide;
  readonly result: MatchResult;
  readonly ownScore: number;
  readonly opponentScore: number;
  readonly rounds: number;
  readonly kills: number;
  readonly assists: number;
  readonly deaths: number;
  /** Health damage dealt to opponents. */
  readonly damage: number;
  readonly headshots: number;
  readonly kastRounds: number;
  readonly openingWon: number;
  readonly openingLost: number;
  readonly sides: Readonly<Record<Team, SideRecord>>;
  /** Biggest first, then by name so equal counts keep one order. */
  readonly weapons: readonly WeaponKills[];
  /** Rounds with exactly two, three, four and five opponent kills. */
  readonly multiKillRounds: MultiKillRounds;
  /** Every clutch won, whatever the odds, oldest first. */
  readonly clutches: readonly PlayerMoment[];
  /** Rounds of three or more kills, oldest first. */
  readonly multiKills: readonly PlayerMoment[];
}

const EMPTY_SIDE: SideRecord = { kills: 0, deaths: 0, rounds: 0, roundsWon: 0 };

interface SideTally {
  kills: number;
  deaths: number;
  rounds: number;
  roundsWon: number;
}

/** The kills inside each round's own window, oldest round first; one pass over the kill list. */
function* killsByRound(demo: ParsedDemo): Generator<{ round: Round; inRound: readonly Kill[] }> {
  const { kills, rounds } = demo.events;
  let first = 0;

  for (const round of rounds) {
    while (first < kills.length && (kills[first]?.tick ?? 0) < round.startTick) first += 1;

    let end = first;
    while (end < kills.length && (kills[end]?.tick ?? 0) <= round.endTick) end += 1;

    yield { round, inRound: kills.slice(first, end) };
  }
}

function sideRecords(demo: ParsedDemo, slot: number): Record<Team, SideRecord> {
  const tallies: Record<Team, SideTally> = { CT: { ...EMPTY_SIDE }, T: { ...EMPTY_SIDE } };

  for (const { round, inRound } of killsByRound(demo)) {
    const side = round.economy.find((entry) => entry.slot === slot)?.team ?? null;
    if (side === null) continue;

    const tally = tallies[side];
    tally.rounds += 1;
    if (round.winner === side) tally.roundsWon += 1;
    tally.kills += inRound.filter((kill) => kill.attacker === slot).length;
    tally.deaths += inRound.filter((kill) => kill.victim === slot).length;
  }

  return tallies;
}

function weaponKills(demo: ParsedDemo, slot: number): readonly WeaponKills[] {
  const counts = new Map<string, number>();

  for (const { inRound } of killsByRound(demo)) {
    for (const kill of inRound) {
      if (kill.attacker !== slot) continue;

      const name = killWeaponName(kill.weapon);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return sortedWeapons(counts);
}

function sortedWeapons(counts: ReadonlyMap<string, number>): readonly WeaponKills[] {
  return [...counts]
    .map(([weapon, killCount]) => ({ weapon, kills: killCount }))
    .sort((a, b) => b.kills - a.kills || a.weapon.localeCompare(b.weapon, 'en'));
}

function resultOf(own: number, opponent: number): MatchResult {
  if (own === opponent) return 'draw';

  return own > opponent ? 'win' : 'loss';
}

/**
 * The rounds worth opening a replay on for one player: every clutch won, whatever the odds, and
 * every round of three or more kills, oldest first (a clutch before a multi-kill in one round).
 */
export function playerKeyRounds(demo: ParsedDemo, slot: number): readonly PlayerMoment[] {
  const clutches = matchClutches(demo)
    .filter((clutch) => clutch.player === slot)
    .map(
      (clutch): PlayerMoment => ({
        roundIndex: clutch.roundIndex,
        kind: 'clutch',
        count: clutch.opponents,
      }),
    );
  const multiKills = roundKillCounts(demo)
    .filter((multi) => multi.player === slot && multi.kills >= 3)
    .map(
      (multi): PlayerMoment => ({
        roundIndex: multi.roundIndex,
        kind: 'multi',
        count: multi.kills,
      }),
    );

  return [...clutches, ...multiKills].sort(
    (a, b) => a.roundIndex - b.roundIndex || (a.kind === b.kind ? 0 : a.kind === 'clutch' ? -1 : 1),
  );
}

/**
 * The match as one player lived it, or `null` when no player in it has this SteamID64.
 *
 * K, A, D, damage, headshots and rounds are `matchPlayerStats`' own — the review's Players table —
 * so a line here and a row there cannot disagree. KAST is carried as the round count it is a share
 * of. Side records read the side the round's economy recorded, never
 * `PlayerInfo.team`, which names the wrong side for half a match.
 */
export function playerMatchLine(demo: ParsedDemo, steamId: string): PlayerMatchLine | null {
  const info = demo.header.players.find((player) => player.steamId === steamId);
  if (info === undefined) return null;

  const row = matchPlayerStats(demo)
    .flatMap((team) => team.players)
    .find((candidate) => candidate.slot === info.slot);
  if (row === undefined) return null;

  const openedAs = openingSideBySlot(demo)[info.slot] ?? 'ct';
  const score = matchScore(demo);
  const ownScore = openedAs === 'ct' ? score.startedCt : score.startedT;
  const opponentScore = openedAs === 'ct' ? score.startedT : score.startedCt;

  const keyRounds = playerKeyRounds(demo, info.slot);
  const clutches = keyRounds.filter((moment) => moment.kind === 'clutch');
  const multiKills = keyRounds.filter((moment) => moment.kind === 'multi');

  return {
    steamId,
    name: info.name,
    map: demo.header.map,
    openedAs,
    result: resultOf(ownScore, opponentScore),
    ownScore,
    opponentScore,
    rounds: row.rounds,
    kills: row.kills,
    assists: row.assists,
    deaths: row.deaths,
    damage: Math.round(row.adr * row.rounds),
    headshots: Math.round((row.headshotPercent / 100) * row.kills),
    kastRounds: Math.round((row.kastPercent / 100) * row.rounds),
    openingWon: row.openingWon,
    openingLost: row.openingLost,
    sides: sideRecords(demo, info.slot),
    weapons: weaponKills(demo, info.slot),
    multiKillRounds: row.multiKillRounds,
    clutches,
    multiKills,
  };
}

/** A profile: every figure a screen states for one player over a set of matches. */
export interface PlayerSummary {
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly rounds: number;
  readonly kills: number;
  readonly assists: number;
  readonly deaths: number;
  readonly damage: number;
  readonly headshots: number;
  readonly kastRounds: number;
  readonly openingWon: number;
  readonly openingLost: number;
  readonly clutchesWon: number;
  /** The biggest clutch won, as the number of opponents faced; 0 when none. */
  readonly bestClutch: number;
  /** Rounds with exactly two, three, four and five opponent kills. */
  readonly multiKillRounds: MultiKillRounds;
  readonly sides: Readonly<Record<Team, SideRecord>>;
  readonly weapons: readonly WeaponKills[];
  /** Damage per round over every round played; 0 with no rounds. */
  readonly adr: number;
  /** Kills per death; kills when the player never died. */
  readonly kd: number;
  /** Share of kills that were headshots, 0–100. */
  readonly headshotPercent: number;
  /** Share of rounds with a kill, an assist, survival or a trade, 0–100. */
  readonly kastPercent: number;
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

function addSide(a: SideRecord, b: SideRecord): SideRecord {
  return {
    kills: a.kills + b.kills,
    deaths: a.deaths + b.deaths,
    rounds: a.rounds + b.rounds,
    roundsWon: a.roundsWon + b.roundsWon,
  };
}

/**
 * Adds matches up. Ratios are taken over the sums — ADR over all rounds, HS over all kills — so a
 * 16-round match weighs less than a 40-round one rather than counting the same.
 */
export function foldPlayerLines(lines: readonly PlayerMatchLine[]): PlayerSummary {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let rounds = 0;
  let kills = 0;
  let assists = 0;
  let deaths = 0;
  let damage = 0;
  let headshots = 0;
  let kastRounds = 0;
  let openingWon = 0;
  let openingLost = 0;
  let clutchesWon = 0;
  let bestClutch = 0;
  let sides: Record<Team, SideRecord> = { CT: EMPTY_SIDE, T: EMPTY_SIDE };
  const multi: [number, number, number, number] = [0, 0, 0, 0];
  const weapons = new Map<string, number>();

  for (const line of lines) {
    if (line.result === 'win') wins += 1;
    else if (line.result === 'loss') losses += 1;
    else draws += 1;

    rounds += line.rounds;
    kills += line.kills;
    assists += line.assists;
    deaths += line.deaths;
    damage += line.damage;
    headshots += line.headshots;
    kastRounds += line.kastRounds;
    openingWon += line.openingWon;
    openingLost += line.openingLost;
    clutchesWon += line.clutches.length;
    for (const clutch of line.clutches) bestClutch = Math.max(bestClutch, clutch.count);
    sides = { CT: addSide(sides.CT, line.sides.CT), T: addSide(sides.T, line.sides.T) };
    line.multiKillRounds.forEach((count, index) => {
      multi[index] = (multi[index] ?? 0) + count;
    });
    for (const entry of line.weapons) {
      weapons.set(entry.weapon, (weapons.get(entry.weapon) ?? 0) + entry.kills);
    }
  }

  return {
    matches: lines.length,
    wins,
    losses,
    draws,
    rounds,
    kills,
    assists,
    deaths,
    damage,
    headshots,
    kastRounds,
    openingWon,
    openingLost,
    clutchesWon,
    bestClutch,
    multiKillRounds: multi,
    sides,
    weapons: sortedWeapons(weapons),
    adr: ratio(damage, rounds),
    kd: deaths === 0 ? kills : kills / deaths,
    headshotPercent: ratio(headshots, kills) * 100,
    kastPercent: ratio(kastRounds, rounds) * 100,
  };
}
