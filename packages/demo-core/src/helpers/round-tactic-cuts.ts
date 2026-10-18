import type { ParsedDemo, Team, Tick } from '../schema';
import { asTick } from '../schema';
import { type RoundWindow, roundPlant } from './round-tactic-window';

/**
 * What opens a step of a round tactic. `defence` is the part after the plant on the T side and
 * `retake` the same part on CT. Codes only: the app names them.
 */
export type RoundStepKind = 'opening' | 'utility' | 'contact' | 'defence' | 'retake';

export interface StepCut {
  readonly tick: Tick;
  readonly kind: RoundStepKind;
}

/** Utility released this close together, by the team, starts a step. Approximation. */
export const UTILITY_BURST_SECONDS = 4;
export const UTILITY_BURST_MIN_THROWS = 3;
/** Steps shorter than this are merged into the one before them. Approximation. */
export const MIN_ROUND_STEP_SECONDS = 5;
/** A window is cut into at most this many steps, the cheapest cuts going first. */
export const MAX_ROUND_STEPS = 8;

const PRIORITY: Readonly<Record<RoundStepKind, number>> = {
  opening: 4,
  defence: 3,
  retake: 3,
  contact: 2,
  utility: 1,
};

export interface CutInput {
  readonly demo: ParsedDemo;
  readonly roundIndex: number;
  /** Demo slots of the team the tactic is cut for. */
  readonly slots: ReadonlySet<number>;
  readonly side: Team;
  readonly window: RoundWindow;
}

function isInWindow(tick: number, window: RoundWindow): boolean {
  return tick >= window.startTick && tick < window.endTick;
}

function burstCuts(input: CutInput): readonly StepCut[] {
  const { demo, slots, window } = input;
  const throws = demo.events.grenades
    .filter((grenade) => slots.has(grenade.thrower) && isInWindow(grenade.throwTick, window))
    .map((grenade) => grenade.throwTick);
  const burstTicks = UTILITY_BURST_SECONDS * demo.header.tickRate;
  const cuts: StepCut[] = [];

  let i = 0;
  while (i < throws.length) {
    const first = throws[i] ?? 0;
    let end = i;
    while (end < throws.length && (throws[end] ?? 0) - first <= burstTicks) end++;
    if (end - i >= UTILITY_BURST_MIN_THROWS) {
      cuts.push({ tick: asTick(first), kind: 'utility' });
      i = end;
    } else {
      i++;
    }
  }
  return cuts;
}

/** The first kill or damage between the team and the other side inside the window. */
export function firstContactTick(input: CutInput): Tick | undefined {
  const { demo, slots, window } = input;
  const involves = (attacker: number | null, victim: number): boolean =>
    attacker !== null && slots.has(attacker) !== slots.has(victim);
  let first: Tick | undefined;
  for (const kill of demo.events.kills) {
    if (isInWindow(kill.tick, window) && involves(kill.attacker, kill.victim)) {
      first = kill.tick;
      break;
    }
  }
  for (const hit of demo.events.damage) {
    if (first !== undefined && hit.tick >= first) break;
    if (isInWindow(hit.tick, window) && involves(hit.attacker, hit.victim)) {
      first = hit.tick;
      break;
    }
  }
  return first;
}

function candidates(input: CutInput): readonly StepCut[] {
  const { demo, roundIndex, side, window } = input;
  const found: StepCut[] = [{ tick: window.startTick, kind: 'opening' }, ...burstCuts(input)];
  const contact = firstContactTick(input);
  if (contact !== undefined) found.push({ tick: contact, kind: 'contact' });
  const plant = roundPlant(demo, roundIndex);
  if (plant !== undefined && isInWindow(plant.tick, window) && plant.tick > window.startTick) {
    found.push({ tick: plant.tick, kind: side === 'T' ? 'defence' : 'retake' });
  }
  return found.sort((a, b) => a.tick - b.tick || PRIORITY[b.kind] - PRIORITY[a.kind]);
}

function isPostPlant(kind: RoundStepKind): boolean {
  return kind === 'defence' || kind === 'retake';
}

/** Walks the cuts in time order, letting a cut that lands too close replace a cheaper one. */
function mergeClose(cuts: readonly StepCut[], minTicks: number): readonly StepCut[] {
  const kept: StepCut[] = [];
  for (const cut of cuts) {
    const previous = kept[kept.length - 1];
    if (previous === undefined) {
      kept.push(cut);
      continue;
    }
    if (cut.tick - previous.tick >= minTicks) {
      kept.push(cut);
    } else if (previous.kind !== 'opening' && PRIORITY[cut.kind] > PRIORITY[previous.kind]) {
      kept[kept.length - 1] = cut;
    } else if (isPostPlant(cut.kind)) {
      kept.push(cut);
    }
  }
  return kept;
}

function dropCheapest(cuts: readonly StepCut[]): readonly StepCut[] {
  let cheapest = -1;
  for (let i = 1; i < cuts.length; i++) {
    const cut = cuts[i];
    const best = cuts[cheapest];
    if (cut === undefined || isPostPlant(cut.kind)) continue;
    if (best === undefined || PRIORITY[cut.kind] < PRIORITY[best.kind]) cheapest = i;
  }
  if (cheapest === -1) return cuts;
  return cuts.filter((_, index) => index !== cheapest);
}

/**
 * Where a window is cut into steps: its start, the team's utility bursts, first contact and the
 * plant. Cuts closer than `MIN_ROUND_STEP_SECONDS` merge, the plant always surviving, and the list
 * is trimmed to `MAX_ROUND_STEPS` by dropping utility cuts before contact ones. A heuristic, not
 * what the players called.
 */
export function stepCuts(input: CutInput): readonly StepCut[] {
  const minTicks = MIN_ROUND_STEP_SECONDS * input.demo.header.tickRate;
  let cuts = mergeClose(candidates(input), minTicks);
  const last = cuts[cuts.length - 1];
  if (cuts.length > 1 && last !== undefined && !isPostPlant(last.kind)) {
    if (input.window.endTick - last.tick < minTicks) cuts = cuts.slice(0, -1);
  }
  while (cuts.length > MAX_ROUND_STEPS) {
    const next = dropCheapest(cuts);
    if (next.length === cuts.length) break;
    cuts = next;
  }
  return cuts;
}
