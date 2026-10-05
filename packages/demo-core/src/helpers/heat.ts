import {
  asPlayerSlot,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerSlot,
  type Round,
  type Team,
  type Tick,
} from '../schema';
import { type HeatBuy, type HeatWindow, isHeatBuy, isInHeatWindow } from './heat-filter';
import { frameForTick, roundOpeningFrame, sampleAt, sidesBySlotAtRound } from './selectors';
import { type TeamBuyClass, teamBuyClass } from './team-stats';

/**
 * What a heat map can weigh — #385. Presence is time; every other mode is events, each put at the
 * point the reading is about: the attacker for what a side dealt and killed, the victim for what it
 * took and where it died, and the landing for utility.
 */
export const HEAT_MODES = [
  'presence',
  'deaths',
  'damageDealt',
  'damageTaken',
  'kills',
  'utility',
] as const;

export type HeatMode = (typeof HEAT_MODES)[number];

/**
 * Which marks count. Every field is `null` for the match as a whole.
 *
 * `side` and `buy` are read against the round the mark is in, for the side its player held that
 * round — a buy is a team's, and the halftime swap moves every player to the other one. `window`
 * is a part of every round, from the end of its freeze time.
 */
export interface HeatScope {
  readonly side: Team | null;
  readonly subject: PlayerSlot | null;
  readonly buy: HeatBuy | null;
  readonly window: HeatWindow | null;
}

/** What a visited point is about, beyond where it is. Rewritten for every point: copy, never keep. */
export interface HeatMark {
  /** The player the point is about. */
  readonly slot: PlayerSlot;
  /** Seconds from the end of the round's freeze time; negative for a mark before it. */
  readonly seconds: number;
  /** The side the point's player held that round, `null` when no source named one. */
  readonly side: Team | null;
  /** What that side's buy was, `null` when the round recorded none. */
  readonly buy: TeamBuyClass | null;
}

/** One point to weigh, in world units — the altitude too, because a floor is told apart by it. */
export type HeatVisit = (
  worldX: number,
  worldY: number,
  worldZ: number,
  weight: number,
  mark: HeatMark,
) => void;

export interface HeatTally {
  /**
   * Each slot's own figure inside the side scope and **outside the subject narrowing** — seconds for
   * presence, health for the damage modes, a count otherwise — so choosing a player changes what is
   * drawn without moving the numbers that were the reason for choosing them.
   */
  readonly bySlot: Float32Array;
  /** The same figure over exactly what was visited. */
  readonly total: number;
}

interface MutableMark {
  slot: PlayerSlot;
  seconds: number;
  side: Team | null;
  buy: TeamBuyClass | null;
}

interface Walk {
  readonly demo: ParsedDemo;
  readonly scope: HeatScope;
  readonly visit: HeatVisit;
  readonly bySlot: Float32Array;
  readonly mark: MutableMark;
  total: number;
}

/** A round as the walk reads it: who held which side, and what each side bought. */
interface RoundReading {
  readonly round: Round;
  readonly sides: readonly (Team | undefined)[];
  readonly buys: Readonly<Record<Team, TeamBuyClass | null>>;
}

function readRound(demo: ParsedDemo, roundIndex: number, round: Round): RoundReading {
  return {
    round,
    sides: sidesBySlotAtRound(demo, roundIndex),
    buys: { CT: teamBuyClass(round, 'CT'), T: teamBuyClass(round, 'T') },
  };
}

function secondsIntoRound(demo: ParsedDemo, reading: RoundReading, tick: Tick): number {
  return (tick - reading.round.freezeTimeEndTick) / demo.header.tickRate;
}

/**
 * The mark belongs to `actor`: count it for them, and draw it if the narrowing lets it through.
 * The side, the buy and the part of the round all come first, so a figure beside a name follows
 * them; only the subject is left out of it.
 */
function weigh(
  walk: Walk,
  reading: RoundReading,
  actor: PlayerSlot,
  worldX: number,
  worldY: number,
  worldZ: number,
  seconds: number,
  weight: number,
): void {
  const { scope, bySlot, mark } = walk;
  if (weight <= 0) return;

  const side = reading.sides[actor];
  if (scope.side !== null && side !== scope.side) return;

  const buy = side === undefined ? null : reading.buys[side];
  if (scope.buy !== null && !isHeatBuy(scope.buy, buy)) return;
  if (!isInHeatWindow(scope.window, seconds)) return;

  bySlot[actor] = sampleAt(bySlot, actor) + weight;
  if (scope.subject !== null && actor !== scope.subject) return;

  walk.total += weight;
  mark.slot = actor;
  mark.seconds = seconds;
  mark.side = side ?? null;
  mark.buy = buy;
  walk.visit(worldX, worldY, worldZ, weight, mark);
}

/** The sample `slot` stands at on the frame an event happened. */
function sampleIndex(demo: ParsedDemo, tick: Tick, slot: PlayerSlot, framesBack = 0): number {
  const { track } = demo;
  const frame = Math.min(Math.max(frameForTick(track, tick) - framesBack, 0), track.frameCount - 1);

  return frame * track.slotCount + slot;
}

/**
 * Each event inside a round's own `[startTick, endTick]`, with that round's reading — the window
 * `matchDuels` and `matchUtility` use, so a post-round kill is in none of the readings. Rounds and
 * events are both sorted by tick, so this walks each list once.
 */
function eachInRounds<T>(
  demo: ParsedDemo,
  events: readonly T[],
  tickOf: (event: T) => Tick,
  each: (event: T, reading: RoundReading) => void,
): void {
  let first = 0;

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    while (first < events.length) {
      const event = events[first];
      if (event === undefined || tickOf(event) >= round.startTick) break;
      first += 1;
    }

    const reading = readRound(demo, roundIndex, round);

    for (let index = first; index < events.length; index++) {
      const event = events[index];
      if (event === undefined || tickOf(event) > round.endTick) break;

      each(event, reading);
    }
  }
}

/**
 * Presence: every living sample, from the end of each round's freeze time to its end.
 *
 * **Only living samples count** — a body lies where it fell until the round ends. **A round counts
 * from its freeze time's end**, `roundOpeningFrame`'s own definition: from `startTick` twenty
 * seconds of every round sit on two spawns.
 */
function walkPresence(walk: Walk): void {
  const { demo } = walk;
  const { track } = demo;
  const { flags, posX, posY, posZ, slotCount } = track;
  const secondsPerSample = 1 / track.sampleHz;

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    const reading = readRound(demo, roundIndex, round);
    const opening = roundOpeningFrame(demo, roundIndex);
    const lastFrame = Math.min(frameForTick(track, round.endTick), track.frameCount - 1);

    for (let frame = opening; frame <= lastFrame; frame++) {
      const base = frame * slotCount;
      const seconds = (frame - opening) * secondsPerSample;

      for (let slot = 0; slot < slotCount; slot++) {
        const sample = base + slot;
        // Indexed directly rather than through `sampleAt`: this is every sample of the match, its
        // bounds check was most of the walk's time (#384), and `sample` is inside the track by the
        // loop bounds above.
        if (((flags[sample] ?? 0) & FLAG_ALIVE) === 0) continue;

        weigh(
          walk,
          reading,
          asPlayerSlot(slot),
          posX[sample] ?? 0,
          posY[sample] ?? 0,
          posZ[sample] ?? 0,
          seconds,
          secondsPerSample,
        );
      }
    }
  }
}

/** The mark belongs to `actor` and stands where they were on the frame the event happened. */
function weighAtEvent(
  walk: Walk,
  reading: RoundReading,
  actor: PlayerSlot,
  tick: Tick,
  weight: number,
): void {
  const { demo } = walk;
  const { track } = demo;
  const at = sampleIndex(demo, tick, actor);

  weigh(
    walk,
    reading,
    actor,
    sampleAt(track.posX, at),
    sampleAt(track.posY, at),
    sampleAt(track.posZ, at),
    secondsIntoRound(demo, reading, tick),
    weight,
  );
}

function walkDamage(walk: Walk, end: 'attacker' | 'victim'): void {
  const { demo } = walk;
  const { track } = demo;

  eachInRounds(
    demo,
    demo.events.damage,
    (hit) => hit.tick,
    (hit, reading) => {
      const { attacker, victim } = hit;
      const { sides } = reading;
      // Damage to an opponent only, read against that round's sides: the halftime swap would call
      // half a match's damage friendly fire otherwise (`matchScoreboard`'s rule).
      if (attacker === null || sides[attacker] === sides[victim]) return;

      // `dmg_health` is the shot, not the health lost (`docs/PARSER.md` §24): one AWP headshot reads
      // 452. It is clamped to what the victim had one sample before the hit.
      // ponytail: two hits inside one 1/16 s sample each clamp to the same health; a running total
      // per victim would fix it if the damage modes ever read as too hot on a spray.
      const had = sampleAt(track.health, sampleIndex(demo, hit.tick, victim, 1));
      const lost = Math.min(hit.healthDamage, had);

      weighAtEvent(walk, reading, end === 'attacker' ? attacker : victim, hit.tick, lost);
    },
  );
}

function walkDeaths(walk: Walk): void {
  const { demo } = walk;

  eachInRounds(
    demo,
    demo.events.kills,
    (kill) => kill.tick,
    // A death is a death whoever or whatever caused it.
    (kill, reading) => weighAtEvent(walk, reading, kill.victim, kill.tick, 1),
  );
}

function walkKills(walk: Walk): void {
  const { demo } = walk;

  eachInRounds(
    demo,
    demo.events.kills,
    (kill) => kill.tick,
    (kill, reading) => {
      const { attacker, victim } = kill;
      // A kill is an opponent killed: the world has no position, and a teamkill is not a kill.
      if (attacker === null || reading.sides[attacker] === reading.sides[victim]) return;

      weighAtEvent(walk, reading, attacker, kill.tick, 1);
    },
  );
}

function walkUtility(walk: Walk): void {
  const { demo } = walk;

  eachInRounds(
    demo,
    demo.events.grenades,
    (grenade) => grenade.throwTick,
    (grenade, reading) => {
      // A grenade the round cleaned up never went off and has nowhere to land (`matchUtility`).
      const landing = grenade.detonationPosition;
      if (landing === null) return;

      weigh(
        walk,
        reading,
        grenade.thrower,
        landing.x,
        landing.y,
        landing.z,
        secondsIntoRound(demo, reading, grenade.throwTick),
        1,
      );
    },
  );
}

/**
 * Every point one heat map mode weighs, handed to `visit` in world units — the rule of #385. Where
 * the points go on a picture is the caller's: this knows nothing of maps or pixels.
 *
 * **Sides are the round's own** (`sidesBySlotAtRound`), never `PlayerInfo.team`, and **a mark
 * belongs to whoever it is about** — the attacker, the victim, the thrower — so the side and the
 * subject narrow that player.
 */
export function walkHeat(
  demo: ParsedDemo,
  mode: HeatMode,
  scope: HeatScope,
  visit: HeatVisit,
): HeatTally {
  const walk: Walk = {
    demo,
    scope,
    visit,
    bySlot: new Float32Array(demo.track.slotCount),
    mark: { slot: asPlayerSlot(0), seconds: 0, side: null, buy: null },
    total: 0,
  };

  switch (mode) {
    case 'presence':
      walkPresence(walk);
      break;
    case 'deaths':
      walkDeaths(walk);
      break;
    case 'damageDealt':
      walkDamage(walk, 'attacker');
      break;
    case 'damageTaken':
      walkDamage(walk, 'victim');
      break;
    case 'kills':
      walkKills(walk);
      break;
    case 'utility':
      walkUtility(walk);
      break;
  }

  return { bySlot: walk.bySlot, total: walk.total };
}
