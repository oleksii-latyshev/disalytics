import {
  asFrame,
  asTick,
  type Frame,
  type ParsedDemo,
  type PlayerInfo,
  type Round,
  type Team,
  type Tick,
  type TickTrack,
} from '../schema';

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

/** Which part of a round a sample position stands in — `docs/DESIGN.md` §5.2's three phases. */
export type RoundPhase = 'freeze' | 'live' | 'post';

export interface RoundClock {
  phase: RoundPhase;
  /** Whole seconds the phase puts on the clock, already rounded the way its direction wants. */
  seconds: number;
}

/**
 * The round clock at a sample position — `undefined` during warmup, which no round covers.
 *
 * Three phases, three readings, and each one is answerable from the data the demo carries:
 *
 * - **freeze** counts *down* to zero, over `startTick` → `freezeTimeEndTick`. The buy phase has a
 *   length the demo states, so this is measured rather than assumed.
 * - **live** counts *up* from `0:00`. It cannot count down: that needs the round length, and no
 *   `mp_roundtime` reaches the demo any more than a tick rate or a bombsite name does
 *   (`docs/PARSER.md` §13). Counting down from an assumed 1:55 would be wrong on every server
 *   running anything else, and wrong quietly.
 * - **post** holds the time the round ended on, because the five to seven seconds after `endTick`
 *   are not round time and a clock that keeps running through them says they are.
 *
 * A countdown rounds up and a count-up rounds down, so each one shows the second it is *in* rather
 * than the one it has finished: a freeze phase opens on its full length and reaches `0:00` as it
 * ends, which is the opposite of what flooring both would do.
 */
export function roundClockAtFrame(demo: ParsedDemo, frame: number): RoundClock | undefined {
  const roundIndex = roundIndexAtFrame(demo, frame);
  if (roundIndex === undefined) return undefined;

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined || demo.track.tickRate === 0) return undefined;

  const tick = tickAtFrame(demo.track, frame);
  const { tickRate } = demo.track;

  if (tick < round.freezeTimeEndTick) {
    return { phase: 'freeze', seconds: Math.ceil((round.freezeTimeEndTick - tick) / tickRate) };
  }

  const played = Math.min(tick, round.endTick) - round.freezeTimeEndTick;

  return {
    phase: tick > round.endTick ? 'post' : 'live',
    seconds: Math.max(Math.floor(played / tickRate), 0),
  };
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
