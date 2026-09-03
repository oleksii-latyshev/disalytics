import {
  asFrame,
  asTick,
  type BombPlant,
  type Frame,
  type ParsedDemo,
  type PlayerInfo,
  type Round,
  type Team,
  type Tick,
  type TickTrack,
} from '../schema';

/**
 * The last event at or before `tick`, by binary search over a tick-sorted array — `-1` when every
 * event is still ahead. Events are plain objects in sorted arrays (`AGENTS.md` §2 rule 3), and this
 * is the lookup that makes them cheap to read from a draw.
 */
export function lastIndexAtOrBefore(ticks: readonly { tick: Tick }[], tick: Tick): number {
  let low = 0;
  let high = ticks.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const candidate = ticks[middle];

    if (candidate === undefined) {
      throw new RangeError(`event ${middle} is outside an array of ${ticks.length}`);
    }

    if (candidate.tick <= tick) {
      found = middle;
      low = middle + 1;
      continue;
    }

    high = middle - 1;
  }

  return found;
}

/**
 * One value out of a `TickTrack` buffer. `noUncheckedIndexedAccess` types every buffer read as
 * possibly undefined, and the track's invariant — `frameCount * slotCount` values in each buffer —
 * is not something the type system carries, so an out-of-range read is a mis-indexed caller rather
 * than a value to substitute for.
 */
export function sampleAt(buffer: ArrayLike<number>, index: number): number {
  const value = buffer[index];

  if (value === undefined) {
    throw new RangeError(`sample ${index} is outside a buffer of ${buffer.length}`);
  }

  return value;
}

/**
 * Where one slot's sample sits in every `TickTrack` buffer. The layout is the track's invariant, so
 * it is stated here once rather than spelled out at each of the callers that read a column.
 */
export function slotSampleIndex(track: TickTrack, frame: number, slot: number): number {
  return frame * track.slotCount + slot;
}

/** The last sample a track holds, which is the position playback stops on. */
export function lastFrame(track: TickTrack): Frame {
  return asFrame(Math.max(track.frameCount - 1, 0));
}

/** Match time at a sample position, which may sit between two samples. */
export function secondsAtFrame(track: TickTrack, frame: number): number {
  return track.sampleHz === 0 ? 0 : frame / track.sampleHz;
}

/** The sample covering `tick`, clamped into the track it is read from. */
export function frameForTick(track: TickTrack, tick: Tick): Frame {
  if (track.frameCount === 0) return asFrame(0);

  const frame = Math.round((tick / track.tickRate) * track.sampleHz);

  return asFrame(Math.min(Math.max(frame, 0), track.frameCount - 1));
}

/** The demo tick a sample position stands on — the inverse of `frameForTick`. */
export function tickAtFrame(track: TickTrack, frame: number): Tick {
  if (track.sampleHz === 0) return asTick(0);

  return asTick(Math.round((frame / track.sampleHz) * track.tickRate));
}

/**
 * The frame a round opens on — the end of its freeze time, which is the first moment its players
 * stand where they chose to rather than where they spawned.
 */
export function roundOpeningFrame(demo: ParsedDemo, roundIndex: number): Frame {
  const round = demo.events.rounds.at(roundIndex);

  return round === undefined ? asFrame(0) : frameForTick(demo.track, round.freezeTimeEndTick);
}

/** Where the match opens: the first round, or the first sample in a demo that carries no rounds. */
export function openingFrame(demo: ParsedDemo): Frame {
  return roundOpeningFrame(demo, 0);
}

/**
 * Where playback should stand instead of `frame`, or `null` for a position it may keep.
 *
 * This is `docs/DESIGN.md` §10.5's skip-the-buy-phase rule and it is deliberately a *playback*
 * rule: only the transport's own advance consults it, so scrubbing into a buy phase by hand still
 * lands there and still draws it. A rule that made the buy phase unreachable would be a bug.
 */
export function buyPhaseSkipFrame(demo: ParsedDemo, frame: number): Frame | null {
  const roundIndex = roundIndexAtFrame(demo, frame);
  if (roundIndex === undefined) return null;

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined) return null;

  if (tickAtFrame(demo.track, frame) >= round.freezeTimeEndTick) return null;

  const opening = frameForTick(demo.track, round.freezeTimeEndTick);

  return opening > frame ? opening : null;
}

/**
 * `mp_c4timer` is not among the convars a recording carries, so a match in which no bomb ever went
 * off has nothing to measure the timer against. This is the engine's default, and it is a stated
 * assumption rather than a reading — the owner's decision, taken over the objection that it is the
 * same quiet guess an assumed round length would be. Every match that saw one explosion measures
 * its own timer instead and never reaches this.
 */
export const DEFAULT_BOMB_TIMER_SECONDS = 40;

/**
 * How long this match gave a planted bomb, in ticks, measured from its own plants.
 *
 * The first plant that detonated answers for the match: on the Phase 0 fixture all three explosions
 * sit exactly 2,624 ticks — 41.00 s at 64 tick — after their own `bomb_planted`, so there is no
 * spread here to take an average over. A bomb that went off is read from its own `detonationTick`
 * and never through this; the value exists for the bombs that were defused or outlived by the round.
 */
export function bombTimerTicks(demo: ParsedDemo): number {
  for (const plant of demo.events.plants) {
    if (plant.detonationTick !== null) return plant.detonationTick - plant.tick;
  }

  return DEFAULT_BOMB_TIMER_SECONDS * demo.track.tickRate;
}

/**
 * Which part of a round a sample position stands in.
 *
 * `bomb` is the span between a plant and the moment its bomb is due to go off. It is a phase of its
 * own rather than a flag on `live` because the number beside it counts a different thing down.
 */
export type RoundPhase = 'freeze' | 'live' | 'bomb' | 'post';

export interface RoundClock {
  phase: RoundPhase;
  /** Whole seconds the phase puts on the clock, already rounded the way its direction wants. */
  seconds: number;
}

/**
 * The round clock at a sample position — `undefined` during warmup, which no round covers.
 *
 * It reads the way CS2 reads: **down**, towards the moment the round is due to end.
 *
 * - **freeze** counts down to zero over `startTick` → `freezeTimeEndTick`. The buy phase has a
 *   length the demo states, so this is measured rather than assumed.
 * - **live** counts down from `Round.roundTimeSeconds`, which is the engine's own `m_iRoundTime`
 *   read at freeze-time end. Where the demo does not carry that prop it counts *up* from `0:00`
 *   instead — the reading this clock gave everywhere before `SCHEMA_VERSION` 7, kept as the
 *   fallback because counting down from an assumed 1:55 would be wrong on every server running
 *   anything else, and wrong quietly.
 * - **bomb** replaces the round's own clock the moment the bomb goes down, exactly as the game's
 *   HUD does, and counts down to the detonation. A bomb that actually exploded is read from its own
 *   `detonationTick`; one that was defused or outlived by the round falls back to
 *   [`bombTimerTicks`].
 * - **post** holds the reading the round ended on, because the five to seven seconds after
 *   `endTick` are not round time and a clock that kept moving through them would say they are. A
 *   round that ended with the bomb down holds the *bomb's* remainder there — a defuse with three
 *   seconds left reads `0:03` — and it is deliberately still `post` rather than a fifth state: what
 *   the number means is already said by the round strip and the feed, and a phase minted to colour
 *   a number that has stopped moving would be a state nothing else could use.
 *
 * A countdown rounds **up** and the count-up fallback rounds **down**, so each shows the second it
 * is *in* rather than the one it has finished: a round opens on its full length and reaches `0:00`
 * as it ends, which is the opposite of what flooring both would do.
 */
export function roundClockAtFrame(demo: ParsedDemo, frame: number): RoundClock | undefined {
  const roundIndex = roundIndexAtFrame(demo, frame);
  if (roundIndex === undefined) return undefined;

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined || demo.track.tickRate === 0) return undefined;

  const tick = tickAtFrame(demo.track, frame);
  const { tickRate } = demo.track;

  if (tick < round.freezeTimeEndTick) {
    return { phase: 'freeze', seconds: remaining(round.freezeTimeEndTick - tick, tickRate) };
  }

  // The post-round span holds what the clock read as the round ended rather than reading on
  // through it, so every branch below is answered at the round's own last tick.
  const held = asTick(Math.min(tick, round.endTick));
  const isPost = tick > round.endTick;

  const plant = plantDownAt(demo, round, held);
  if (plant !== undefined) {
    const detonation = plant.detonationTick ?? plant.tick + bombTimerTicks(demo);

    return { phase: isPost ? 'post' : 'bomb', seconds: remaining(detonation - held, tickRate) };
  }

  const played = held - round.freezeTimeEndTick;
  if (round.roundTimeSeconds === null) {
    return { phase: isPost ? 'post' : 'live', seconds: Math.max(Math.floor(played / tickRate), 0) };
  }

  return {
    phase: isPost ? 'post' : 'live',
    seconds: remaining(round.roundTimeSeconds * tickRate - played, tickRate),
  };
}

/** Seconds left on a countdown: the second it is *in*, never a negative one. */
function remaining(ticks: number, tickRate: number): number {
  return Math.max(Math.ceil(ticks / tickRate), 0);
}

/**
 * The bomb standing armed at `tick` in this round, if one is.
 *
 * Bounded by the round rather than by the plant list, because a plant belongs to the round it fell
 * in and the search starts from the last plant at or before `tick` — which may be the previous
 * round's.
 */
function plantDownAt(demo: ParsedDemo, round: Round, tick: Tick): BombPlant | undefined {
  const index = lastIndexAtOrBefore(demo.events.plants, tick);
  if (index < 0) return undefined;

  const plant = demo.events.plants.at(index);

  return plant !== undefined && plant.tick >= round.startTick ? plant : undefined;
}

/**
 * The side each slot held in a round, indexed by slot.
 *
 * `PlayerInfo.team` cannot answer this: it is read at the end of the match, and the halftime swap
 * moves every player across, so it names the wrong side for half the rounds. The round's economy is
 * read at freeze-time end and carries the side the slot held then — the same reasoning that put
 * `PlayerEconomy.team` in the schema.
 *
 * `roundIndex` is `undefined` during warmup, which no round covers; the opening round's sides are
 * the closest true answer there. A slot the round has no entry for falls back to `PlayerInfo.team`,
 * and `undefined` means no source named a side at all.
 */
export function sidesBySlotAtRound(
  demo: ParsedDemo,
  roundIndex: number | undefined,
): readonly (Team | undefined)[] {
  const sides: (Team | undefined)[] = [];

  for (const player of demo.header.players) sides[player.slot] = player.team;

  const round = demo.events.rounds.at(roundIndex ?? 0);
  if (round === undefined) return sides;

  for (const slot of round.economy) {
    if (slot.team !== null) sides[slot.slot] = slot.team;
  }

  return sides;
}

/** The roster of a side, in slot order, so a rail is not re-sorted on every readout. */
export function playersOnSide(
  players: readonly PlayerInfo[],
  sides: readonly (Team | undefined)[],
  side: Team,
): readonly PlayerInfo[] {
  return players.filter((player) => sides[player.slot] === side).sort((a, b) => a.slot - b.slot);
}

/**
 * The tick a round begins on. Rounds are plain objects in a sorted array, so an out-of-range index
 * is a mis-stepped caller rather than a value to substitute for — the same reasoning as `sampleAt`.
 */
function startTickAt(rounds: readonly Round[], index: number): Tick {
  const round = rounds[index];

  if (round === undefined) {
    throw new RangeError(`round ${index} is outside a match of ${rounds.length}`);
  }

  return round.startTick;
}

/**
 * The round a sample position falls in — the last one to have started by then, by binary search
 * over the sorted rounds. `undefined` before the first round starts: warmup is not a round.
 */
export function roundIndexAtFrame(demo: ParsedDemo, frame: number): number | undefined {
  const { rounds } = demo.events;
  const tick = tickAtFrame(demo.track, frame);

  let low = 0;
  let high = rounds.length - 1;
  let started: number | undefined;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (startTickAt(rounds, middle) <= tick) {
      started = middle;
      low = middle + 1;
      continue;
    }

    high = middle - 1;
  }

  return started;
}
