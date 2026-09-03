import { asTick, type BombPlant, type ParsedDemo, type Round, type Tick } from '../schema';
import { lastIndexAtOrBefore, roundIndexAtFrame, tickAtFrame } from './selectors';

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
