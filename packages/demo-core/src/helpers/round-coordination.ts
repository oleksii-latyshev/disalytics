import { asTick, FLAG_ALIVE } from '../schema';
import { TRADE_WINDOW_SECONDS } from './duels';
import { type CutInput, firstContactTick } from './round-tactic-cuts';
import { roundPlant } from './round-tactic-window';
import { frameForTick, slotSampleIndex } from './selectors';

export type CoordinationLevel = 'coordinated' | 'partial' | 'loose';

/** What the level was read from; the app explains each in a tooltip. */
export type CoordinationSignal = 'utilityBurst' | 'grouped' | 'plant' | 'trade';

export interface Coordination {
  readonly level: CoordinationLevel;
  readonly signals: readonly CoordinationSignal[];
}

/** A burst: this many grenades, from at least two players, inside `BURST_SECONDS`. */
export const COORDINATION_BURST_THROWS = 3;
export const COORDINATION_BURST_SECONDS = 5;
/** Three players this close to one of them, after the opening seconds, count as moving together. */
export const COORDINATION_GROUP_SIZE = 3;
export const COORDINATION_GROUP_RADIUS_UNITS = 500;
/** The spawn cluster is not coordination: grouping is read from this far into the window. */
export const COORDINATION_GROUP_AFTER_SECONDS = 10;

function hasBurst(input: CutInput): boolean {
  const { demo, slots, window } = input;
  const throws = demo.events.grenades.filter(
    (grenade) =>
      slots.has(grenade.thrower) &&
      grenade.throwTick >= window.startTick &&
      grenade.throwTick < window.endTick,
  );
  const spanTicks = COORDINATION_BURST_SECONDS * demo.header.tickRate;
  return throws.some((first, i) => {
    const burst = throws.slice(i).filter((other) => other.throwTick - first.throwTick <= spanTicks);
    return (
      burst.length >= COORDINATION_BURST_THROWS &&
      new Set(burst.map((grenade) => grenade.thrower)).size >= 2
    );
  });
}

function isGroupedAt(input: CutInput, frame: number): boolean {
  const { track } = input.demo;
  const alive: { x: number; y: number }[] = [];
  for (const slot of input.slots) {
    const index = slotSampleIndex(track, frame, slot);
    if (((track.flags[index] ?? 0) & FLAG_ALIVE) === 0) continue;
    alive.push({ x: track.posX[index] ?? 0, y: track.posY[index] ?? 0 });
  }
  return alive.some(
    (centre) =>
      alive.filter(
        (other) =>
          Math.hypot(other.x - centre.x, other.y - centre.y) <= COORDINATION_GROUP_RADIUS_UNITS,
      ).length >= COORDINATION_GROUP_SIZE,
  );
}

function hasGrouping(input: CutInput): boolean {
  const { demo, window } = input;
  const { track } = demo;
  const from = window.startTick + COORDINATION_GROUP_AFTER_SECONDS * demo.header.tickRate;
  const until = Math.min(window.endTick, firstContactTick(input) ?? window.endTick);
  if (from >= until) return false;
  const firstFrame = frameForTick(track, asTick(from));
  const lastFrame = frameForTick(track, asTick(until));
  for (let frame: number = firstFrame; frame <= lastFrame; frame += track.sampleHz) {
    if (isGroupedAt(input, frame)) return true;
  }
  return false;
}

function hasTrade(input: CutInput): boolean {
  const { demo, slots, window } = input;
  const windowTicks = TRADE_WINDOW_SECONDS * demo.header.tickRate;
  const kills = demo.events.kills.filter(
    (kill) => kill.tick >= window.startTick && kill.tick < window.endTick,
  );
  return kills.some((lost) =>
    kills.some(
      (answer) =>
        slots.has(lost.victim) &&
        lost.attacker !== null &&
        answer.attacker !== null &&
        slots.has(answer.attacker) &&
        answer.victim === lost.attacker &&
        answer.tick > lost.tick &&
        answer.tick - lost.tick <= windowTicks,
    ),
  );
}

function levelOf(count: number): CoordinationLevel {
  if (count >= 3) return 'coordinated';
  return count >= 1 ? 'partial' : 'loose';
}

/**
 * How together a team looked in a window: utility released in tight bursts, three players moving
 * as a group before the first fight, a plant (T side only) and a traded death. Three or more
 * signals read as coordinated, one or two as partial. A named approximation of intent, not of it.
 */
export function windowCoordination(input: CutInput): Coordination {
  const signals: CoordinationSignal[] = [];
  if (hasBurst(input)) signals.push('utilityBurst');
  if (hasGrouping(input)) signals.push('grouped');
  const plant = roundPlant(input.demo, input.roundIndex);
  const isPlanted =
    plant !== undefined &&
    plant.tick >= input.window.startTick &&
    plant.tick < input.window.endTick;
  if (input.side === 'T' && isPlanted) signals.push('plant');
  if (hasTrade(input)) signals.push('trade');
  return { level: levelOf(signals.length), signals };
}
