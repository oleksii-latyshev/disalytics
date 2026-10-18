import type { BombPlant, ParsedDemo, Tick } from '../schema';
import { asTick } from '../schema';

/** The part of a round a tactic is cut from, in demo ticks. */
export interface RoundWindow {
  readonly startTick: Tick;
  readonly endTick: Tick;
}

/** How long after the plant a default window runs: long enough to see where the site is held. */
export const POST_PLANT_WINDOW_SECONDS = 10;

/** The shortest window a reader can leave, so a tactic always has a step to play. */
export const MIN_WINDOW_SECONDS = 5;

/** Freeze end to round end: the room a window can move in. `undefined` for an unknown round. */
export function roundWindowBounds(demo: ParsedDemo, roundIndex: number): RoundWindow | undefined {
  const round = demo.events.rounds[roundIndex];
  if (round === undefined) return undefined;
  const startTick = round.freezeTimeEndTick;
  return { startTick, endTick: asTick(Math.max(startTick, round.endTick)) };
}

/** The bomb plant of a round, if the live part of it holds one. */
export function roundPlant(demo: ParsedDemo, roundIndex: number): BombPlant | undefined {
  const bounds = roundWindowBounds(demo, roundIndex);
  if (bounds === undefined) return undefined;
  return demo.events.plants.find(
    (plant) => plant.tick >= bounds.startTick && plant.tick <= bounds.endTick,
  );
}

/** Pulls a window inside the round's live part and keeps it at least `MIN_WINDOW_SECONDS` long. */
export function clampRoundWindow(
  demo: ParsedDemo,
  roundIndex: number,
  window: RoundWindow,
): RoundWindow | undefined {
  const bounds = roundWindowBounds(demo, roundIndex);
  if (bounds === undefined) return undefined;
  const minTicks = Math.min(
    MIN_WINDOW_SECONDS * demo.header.tickRate,
    bounds.endTick - bounds.startTick,
  );
  const startTick = Math.min(
    Math.max(window.startTick, bounds.startTick),
    bounds.endTick - minTicks,
  );
  const endTick = Math.min(Math.max(window.endTick, startTick + minTicks), bounds.endTick);
  return { startTick: asTick(startTick), endTick: asTick(endTick) };
}

/** Freeze end to ten seconds after the plant, or to the round's end when nothing was planted. */
export function defaultRoundWindow(demo: ParsedDemo, roundIndex: number): RoundWindow | undefined {
  const bounds = roundWindowBounds(demo, roundIndex);
  if (bounds === undefined) return undefined;
  const plant = roundPlant(demo, roundIndex);
  if (plant === undefined) return bounds;
  const endTick = plant.tick + POST_PLANT_WINDOW_SECONDS * demo.header.tickRate;
  return clampRoundWindow(demo, roundIndex, {
    startTick: bounds.startTick,
    endTick: asTick(endTick),
  });
}

export type WindowEdge = 'start' | 'end';

/**
 * A window with one edge moved to `tick` and the other left where it was, so dragging an edge into
 * the other stops at the minimum length instead of pushing it along.
 */
export function moveWindowEdge(
  demo: ParsedDemo,
  roundIndex: number,
  window: RoundWindow,
  edge: WindowEdge,
  tick: number,
): RoundWindow | undefined {
  const bounds = roundWindowBounds(demo, roundIndex);
  if (bounds === undefined) return undefined;
  const minTicks = Math.min(
    MIN_WINDOW_SECONDS * demo.header.tickRate,
    bounds.endTick - bounds.startTick,
  );
  if (edge === 'start') {
    const startTick = Math.min(Math.max(tick, bounds.startTick), window.endTick - minTicks);
    return { startTick: asTick(startTick), endTick: window.endTick };
  }
  const endTick = Math.max(Math.min(tick, bounds.endTick), window.startTick + minTicks);
  return { startTick: window.startTick, endTick: asTick(endTick) };
}
