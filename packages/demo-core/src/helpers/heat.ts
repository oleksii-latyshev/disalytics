import {
  asPlayerSlot,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerSlot,
  type Team,
  type Tick,
} from '../schema';
import { frameForTick, roundOpeningFrame, sampleAt, sidesBySlotAtRound } from './selectors';

/**
 * What a heat map can weigh — #385. Presence is time; every other mode is events, each put at the
 * point the reading is about: the attacker for what a side dealt and killed, the victim for what it
 * took and where it died, and the landing for utility.
 */
export const HEAT_MODES = [
  'presence',
  'damageDealt',
  'damageTaken',
  'kills',
  'deaths',
  'utility',
] as const;

export type HeatMode = (typeof HEAT_MODES)[number];

/** Which marks count. Both are `null` for the match as a whole. */
export interface HeatScope {
  readonly side: Team | null;
  readonly subject: PlayerSlot | null;
}

/** One point to weigh, in world units. */
export type HeatVisit = (worldX: number, worldY: number, weight: number) => void;

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

interface Walk {
  readonly demo: ParsedDemo;
  readonly scope: HeatScope;
  readonly visit: HeatVisit;
  readonly bySlot: Float32Array;
  total: number;
}

/** The mark belongs to `actor`: count it for them, and draw it if the narrowing lets it through. */
function weigh(
  walk: Walk,
  sides: readonly (Team | undefined)[],
  actor: PlayerSlot,
  worldX: number,
  worldY: number,
  weight: number,
): void {
  const { scope, bySlot } = walk;
  if (weight <= 0) return;
  if (scope.side !== null && sides[actor] !== scope.side) return;

  bySlot[actor] = sampleAt(bySlot, actor) + weight;
  if (scope.subject !== null && actor !== scope.subject) return;

  walk.total += weight;
  walk.visit(worldX, worldY, weight);
}

/** The sample `slot` stands at on the frame an event happened. */
function sampleIndex(demo: ParsedDemo, tick: Tick, slot: PlayerSlot, framesBack = 0): number {
  const { track } = demo;
  const frame = Math.min(Math.max(frameForTick(track, tick) - framesBack, 0), track.frameCount - 1);

  return frame * track.slotCount + slot;
}

/**
 * Each event inside a round's own `[startTick, endTick]`, with that round's sides — the window
 * `matchDuels` and `matchUtility` use, so a post-round kill is in none of the readings. Rounds and
 * events are both sorted by tick, so this walks each list once.
 */
function eachInRounds<T>(
  demo: ParsedDemo,
  events: readonly T[],
  tickOf: (event: T) => Tick,
  each: (event: T, sides: readonly (Team | undefined)[]) => void,
): void {
  let first = 0;

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    while (first < events.length) {
      const event = events[first];
      if (event === undefined || tickOf(event) >= round.startTick) break;
      first += 1;
    }

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < events.length; index++) {
      const event = events[index];
      if (event === undefined || tickOf(event) > round.endTick) break;

      each(event, sides);
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
  const { flags, posX, posY, slotCount } = track;
  const secondsPerSample = 1 / track.sampleHz;

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    const sides = sidesBySlotAtRound(demo, roundIndex);
    const lastFrame = Math.min(frameForTick(track, round.endTick), track.frameCount - 1);

    for (let frame = roundOpeningFrame(demo, roundIndex); frame <= lastFrame; frame++) {
      const base = frame * slotCount;

      for (let slot = 0; slot < slotCount; slot++) {
        const sample = base + slot;
        // Indexed directly rather than through `sampleAt`: this is every sample of the match, its
        // bounds check was most of the walk's time (#384), and `sample` is inside the track by the
        // loop bounds above.
        if (((flags[sample] ?? 0) & FLAG_ALIVE) === 0) continue;

        weigh(
          walk,
          sides,
          asPlayerSlot(slot),
          posX[sample] ?? 0,
          posY[sample] ?? 0,
          secondsPerSample,
        );
      }
    }
  }
}

function walkDamage(walk: Walk, end: 'attacker' | 'victim'): void {
  const { demo } = walk;
  const { track } = demo;

  eachInRounds(
    demo,
    demo.events.damage,
    (hit) => hit.tick,
    (hit, sides) => {
      const { attacker, victim } = hit;
      // Damage to an opponent only, read against that round's sides: the halftime swap would call
      // half a match's damage friendly fire otherwise (`matchScoreboard`'s rule).
      if (attacker === null || sides[attacker] === sides[victim]) return;

      // `dmg_health` is the shot, not the health lost (`docs/PARSER.md` §24): one AWP headshot reads
      // 452. It is clamped to what the victim had one sample before the hit.
      // ponytail: two hits inside one 1/16 s sample each clamp to the same health; a running total
      // per victim would fix it if the damage modes ever read as too hot on a spray.
      const had = sampleAt(track.health, sampleIndex(demo, hit.tick, victim, 1));
      const lost = Math.min(hit.healthDamage, had);

      const actor = end === 'attacker' ? attacker : victim;
      const at = sampleIndex(demo, hit.tick, actor);

      weigh(walk, sides, actor, sampleAt(track.posX, at), sampleAt(track.posY, at), lost);
    },
  );
}

function walkKills(walk: Walk, end: 'attacker' | 'victim'): void {
  const { demo } = walk;
  const { track } = demo;

  eachInRounds(
    demo,
    demo.events.kills,
    (kill) => kill.tick,
    (kill, sides) => {
      const { attacker, victim } = kill;

      if (end === 'attacker') {
        // A kill is an opponent killed: the world has no position, and a teamkill is not a kill.
        if (attacker === null || sides[attacker] === sides[victim]) return;

        const at = sampleIndex(demo, kill.tick, attacker);
        weigh(walk, sides, attacker, sampleAt(track.posX, at), sampleAt(track.posY, at), 1);
        return;
      }

      // A death is a death whoever or whatever caused it.
      const at = sampleIndex(demo, kill.tick, victim);
      weigh(walk, sides, victim, sampleAt(track.posX, at), sampleAt(track.posY, at), 1);
    },
  );
}

function walkUtility(walk: Walk): void {
  const { demo } = walk;

  eachInRounds(
    demo,
    demo.events.grenades,
    (grenade) => grenade.throwTick,
    (grenade, sides) => {
      // A grenade the round cleaned up never went off and has nowhere to land (`matchUtility`).
      const landing = grenade.detonationPosition;
      if (landing === null) return;

      weigh(walk, sides, grenade.thrower, landing.x, landing.y, 1);
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
    total: 0,
  };

  switch (mode) {
    case 'presence':
      walkPresence(walk);
      break;
    case 'damageDealt':
      walkDamage(walk, 'attacker');
      break;
    case 'damageTaken':
      walkDamage(walk, 'victim');
      break;
    case 'kills':
      walkKills(walk, 'attacker');
      break;
    case 'deaths':
      walkKills(walk, 'victim');
      break;
    case 'utility':
      walkUtility(walk);
      break;
  }

  return { bySlot: walk.bySlot, total: walk.total };
}
