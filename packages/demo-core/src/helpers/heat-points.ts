import type { ParsedDemo, PlayerSlot, Team } from '../schema';
import { type HeatMode, type HeatScope, type HeatVisit, walkHeat } from './heat';
import { HEAT_BINS, heatBinOf, isHeatBuy, isInHeatWindow } from './heat-filter';
import type { TeamBuyClass } from './team-stats';

/** The narrowing that still applies to a player's points: the subject is already the player. */
export type HeatPointsScope = Pick<HeatScope, 'side' | 'buy' | 'window'>;

/**
 * One player's marks of one kind, as columns — what is kept of a match once it is dropped.
 *
 * Every mark carries the side the player held and the buy that side made in its round, and how far
 * into the round it was, so the same narrowings the walk applies to a demo apply to these without
 * the demo: changing a filter on a match that is no longer in memory costs a pass over a few
 * thousand points rather than a read of the whole container.
 */
export interface HeatMarks {
  readonly count: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly seconds: Float32Array;
  readonly side: Uint8Array;
  readonly buy: Uint8Array;
  /** What every mark weighs: a sample's duration in seconds for presence, one for a death. */
  readonly weight: number;
}

export interface HeatPoints {
  readonly presence: HeatMarks;
  readonly deaths: HeatMarks;
}

const SIDE_CODES: readonly (Team | null)[] = ['CT', 'T', null];
const BUY_CODES: readonly (TeamBuyClass | null)[] = [
  'pistol',
  'eco',
  'force',
  'full',
  'mixed',
  null,
];

function codeOf<T>(codes: readonly T[], value: T): number {
  const at = codes.indexOf(value);

  return at === -1 ? codes.length - 1 : at;
}

interface Collector {
  readonly x: number[];
  readonly y: number[];
  readonly z: number[];
  readonly seconds: number[];
  readonly side: number[];
  readonly buy: number[];
}

function newCollector(): Collector {
  return { x: [], y: [], z: [], seconds: [], side: [], buy: [] };
}

function collect(demo: ParsedDemo, mode: HeatMode, subject: PlayerSlot): HeatMarks {
  const collector = newCollector();
  let weight = 0;

  walkHeat(
    demo,
    mode,
    { side: null, subject, buy: null, window: null },
    (worldX, worldY, worldZ, pointWeight, mark) => {
      weight = pointWeight;
      collector.x.push(worldX);
      collector.y.push(worldY);
      collector.z.push(worldZ);
      collector.seconds.push(mark.seconds);
      collector.side.push(codeOf(SIDE_CODES, mark.side));
      collector.buy.push(codeOf(BUY_CODES, mark.buy));
    },
  );

  return {
    count: collector.x.length,
    x: Float32Array.from(collector.x),
    y: Float32Array.from(collector.y),
    z: Float32Array.from(collector.z),
    seconds: Float32Array.from(collector.seconds),
    side: Uint8Array.from(collector.side),
    buy: Uint8Array.from(collector.buy),
    weight,
  };
}

/** Where `subject` stood and died, with what each mark needs to be filtered later. */
export function collectHeatPoints(demo: ParsedDemo, subject: PlayerSlot): HeatPoints {
  return { presence: collect(demo, 'presence', subject), deaths: collect(demo, 'deaths', subject) };
}

function isKept(marks: HeatMarks, at: number, scope: HeatPointsScope): boolean {
  const side = SIDE_CODES[marks.side[at] ?? 0] ?? null;
  if (scope.side !== null && side !== scope.side) return false;

  const buy = BUY_CODES[marks.buy[at] ?? 0] ?? null;

  return isHeatBuy(scope.buy, buy) && isInHeatWindow(scope.window, marks.seconds[at] ?? Number.NaN);
}

/**
 * The marks that survive the narrowing, handed to `visit` the way `walkHeat` hands its own, and
 * their total weight — what `walkHeat`'s tally says for the same player and the same narrowing.
 */
export function replayHeatPoints(
  points: HeatPoints,
  read: HeatMode,
  scope: HeatPointsScope,
  visit: HeatVisit,
): number {
  const marks = points[read];
  const mark: { seconds: number; side: Team | null; buy: TeamBuyClass | null } = {
    seconds: 0,
    side: null,
    buy: null,
  };
  let total = 0;

  for (let at = 0; at < marks.count; at++) {
    if (!isKept(marks, at, scope)) continue;

    mark.seconds = marks.seconds[at] ?? 0;
    mark.side = SIDE_CODES[marks.side[at] ?? 0] ?? null;
    mark.buy = BUY_CODES[marks.buy[at] ?? 0] ?? null;
    total += marks.weight;
    visit(marks.x[at] ?? 0, marks.y[at] ?? 0, marks.z[at] ?? 0, marks.weight, mark);
  }

  return total;
}

/**
 * Seconds of presence in each step of the round-time axis, over the side, the buy and the subject
 * but **not** the part of the round: it is what the axis is drawn from, and the part chosen is
 * marked on it rather than taken out of it.
 */
export function presenceByRoundTime(
  demo: ParsedDemo,
  scope: Pick<HeatScope, 'side' | 'subject' | 'buy'>,
): Float32Array {
  const bins = new Float32Array(HEAT_BINS);

  walkHeat(demo, 'presence', { ...scope, window: null }, (_x, _y, _z, weight, mark) => {
    const bin = heatBinOf(mark.seconds);
    bins[bin] = (bins[bin] ?? 0) + weight;
  });

  return bins;
}
