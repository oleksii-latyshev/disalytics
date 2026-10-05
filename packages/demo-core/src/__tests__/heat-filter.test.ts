import { describe, expect, it } from 'vitest';
import { HEAT_MODES, type HeatMode, type HeatScope, walkHeat } from '../helpers/heat';
import {
  HEAT_BINS,
  HEAT_PHASES,
  heatBinOf,
  heatWindowOfBins,
  isInHeatWindow,
  isWholeRound,
} from '../helpers/heat-filter';
import { collectHeatPoints, presenceByRoundTime, replayHeatPoints } from '../helpers/heat-points';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  type BuyType,
  FLAG_ALIVE,
  type ParsedDemo,
  type Round,
} from '../schema';
import { atFrame, newEvents, newTrack, withGrenade, withKill } from './helpers';

// 64 ticks to 16 samples: frame = tick / 4. Two rounds of 100 s, each with 10 s of freeze time.
const ct = asPlayerSlot(0);
const t = asPlayerSlot(1);

const ROUND_TICKS = 6400;
const FREEZE_TICKS = 640;
const SAMPLES_PER_SECOND = 16;
const SAMPLES_PER_ROUND = (ROUND_TICKS - FREEZE_TICKS) / 4 + 1;

function newRound(index: number, ctBuy: BuyType, tBuy: BuyType): Round {
  const startTick = index * ROUND_TICKS;

  return {
    number: index + 1,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + FREEZE_TICKS),
    endTick: asTick(startTick + ROUND_TICKS),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: ct, money: 0, equipmentValue: 0, buyType: ctBuy, team: 'CT' },
      { slot: t, money: 0, equipmentValue: 0, buyType: tBuy, team: 'T' },
    ],
  };
}

function newDemo(events = newEvents()): ParsedDemo {
  const frameCount = (2 * ROUND_TICKS) / 4 + 1;
  const track = newTrack({ frameCount, slotCount: 2 });

  for (let frame = 0; frame < frameCount; frame++) {
    atFrame(track, asFrame(frame), ct, { posX: 100, posY: 200, flags: FLAG_ALIVE });
    atFrame(track, asFrame(frame), t, { posX: -300, posY: 400, flags: FLAG_ALIVE });
  }

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track,
    // Round 1 is a pistol round whatever was bought; round 2 is an eco for CT against a full buy.
    events: {
      ...events,
      rounds: [newRound(0, 'full-buy', 'full-buy'), newRound(1, 'eco', 'full-buy')],
    },
  };
}

const WHOLE: HeatScope = { side: null, subject: null, buy: null, window: null };

function totalOf(demo: ParsedDemo, mode: HeatMode, scope: HeatScope): number {
  return walkHeat(demo, mode, scope, () => undefined).total;
}

describe('the round-time axis', () => {
  it('makes no window of the whole round and an open one of a range that reaches the end', () => {
    expect(heatWindowOfBins(0, HEAT_BINS - 1)).toBeNull();
    expect(heatWindowOfBins(0, 3)).toEqual({ fromSeconds: 0, toSeconds: 20 });
    expect(heatWindowOfBins(12, HEAT_BINS - 1)).toEqual({
      fromSeconds: 60,
      toSeconds: Number.POSITIVE_INFINITY,
    });
    expect(isWholeRound(0, HEAT_BINS - 1)).toBe(true);
    expect(isWholeRound(0, 3)).toBe(false);
  });

  it('has three phases that follow each other and cover the axis', () => {
    const [first, second, third] = HEAT_PHASES;

    expect(first.firstBin).toBe(0);
    expect(second.firstBin).toBe(first.lastBin + 1);
    expect(third.firstBin).toBe(second.lastBin + 1);
    expect(third.lastBin).toBe(HEAT_BINS - 1);
  });

  it('puts a moment in the step it falls in, and a window excludes its end', () => {
    expect(heatBinOf(-3)).toBe(0);
    expect(heatBinOf(4.9)).toBe(0);
    expect(heatBinOf(5)).toBe(1);
    expect(heatBinOf(900)).toBe(HEAT_BINS - 1);

    const window = heatWindowOfBins(0, 3);
    expect(isInHeatWindow(window, 19.9)).toBe(true);
    expect(isInHeatWindow(window, 20)).toBe(false);
    expect(isInHeatWindow(window, -1)).toBe(false);
    expect(isInHeatWindow(null, -1)).toBe(true);
  });
});

describe('walkHeat narrowed by buy and by the part of the round', () => {
  const demo = newDemo();

  it('counts only the rounds a side made the buy in, by the side it held that round', () => {
    const eco = walkHeat(demo, 'presence', { ...WHOLE, buy: 'eco' }, () => undefined);

    // Round 2 only, and only the side that bought an eco.
    expect(eco.total).toBeCloseTo(SAMPLES_PER_ROUND / SAMPLES_PER_SECOND, 4);
    expect([...eco.bySlot]).toEqual([eco.total, 0]);
  });

  it('reads round 1 and 13 as pistol rounds for both sides', () => {
    expect(totalOf(demo, 'presence', { ...WHOLE, buy: 'pistol' })).toBeCloseTo(
      (2 * SAMPLES_PER_ROUND) / SAMPLES_PER_SECOND,
      4,
    );
    expect(totalOf(demo, 'presence', { ...WHOLE, buy: 'force' })).toBe(0);
  });

  it('reads the side before the buy', () => {
    expect(totalOf(demo, 'presence', { ...WHOLE, buy: 'eco', side: 'T' })).toBe(0);
    expect(totalOf(demo, 'presence', { ...WHOLE, buy: 'full', side: 'T' })).toBeGreaterThan(0);
  });

  it('counts only the part of each round asked for, from the end of freeze time', () => {
    const early = totalOf(demo, 'presence', {
      ...WHOLE,
      subject: ct,
      window: heatWindowOfBins(0, 3),
    });

    // Twenty seconds of both rounds.
    expect(early).toBeCloseTo(40, 4);
  });

  it('splits into three windows that add up to the whole round', () => {
    const whole = totalOf(demo, 'presence', WHOLE);
    const parts = HEAT_PHASES.map((phase) =>
      totalOf(demo, 'presence', {
        ...WHOLE,
        window: heatWindowOfBins(phase.firstBin, phase.lastBin),
      }),
    );

    expect(parts[0]).toBeGreaterThan(0);
    expect(parts[1]).toBeGreaterThan(parts[0] ?? 0);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBeCloseTo(whole, 3);
  });

  it('puts an event in the window of the moment it happened', () => {
    const events = withKill(newEvents(), {
      tick: asTick(FREEZE_TICKS + 64 * 30),
      attacker: ct,
      victim: t,
    });
    const withEvent = newDemo(events);

    expect(totalOf(withEvent, 'deaths', { ...WHOLE, window: heatWindowOfBins(0, 3) })).toBe(0);
    expect(totalOf(withEvent, 'deaths', { ...WHOLE, window: heatWindowOfBins(4, 11) })).toBe(1);
    expect(totalOf(withEvent, 'deaths', { ...WHOLE, window: heatWindowOfBins(12, 29) })).toBe(0);
  });

  it('reads utility by the moment it was thrown', () => {
    const events = withGrenade(newEvents(), {
      thrower: ct,
      throwTick: asTick(FREEZE_TICKS + 64 * 3),
      detonationTick: asTick(FREEZE_TICKS + 64 * 6),
      detonationPosition: { x: 7, y: 8, z: 0 },
    });

    expect(totalOf(newDemo(events), 'utility', { ...WHOLE, window: heatWindowOfBins(0, 3) })).toBe(
      1,
    );
    expect(totalOf(newDemo(events), 'utility', { ...WHOLE, window: heatWindowOfBins(4, 11) })).toBe(
      0,
    );
    expect(totalOf(newDemo(events), 'utility', { ...WHOLE, buy: 'eco' })).toBe(0);
  });

  it('keeps every figure beside a name inside the buy and the window but outside the subject', () => {
    const tally = walkHeat(
      demo,
      'presence',
      { ...WHOLE, subject: ct, window: heatWindowOfBins(0, 3) },
      () => undefined,
    );

    expect(tally.bySlot[0]).toBeCloseTo(40, 4);
    expect(tally.bySlot[1]).toBeCloseTo(40, 4);
    expect(tally.total).toBeCloseTo(40, 4);
  });
});

describe('presenceByRoundTime', () => {
  const demo = newDemo();

  it('adds up the seconds a player was alive in each step, over every round', () => {
    const bins = presenceByRoundTime(demo, { side: null, subject: ct, buy: null });

    expect(bins).toHaveLength(HEAT_BINS);
    expect(bins[0]).toBeCloseTo(10, 4);
    expect([...bins].reduce((sum, bin) => sum + bin, 0)).toBeCloseTo(
      totalOf(demo, 'presence', { ...WHOLE, subject: ct }),
      3,
    );
  });

  it('follows the buy and the side', () => {
    const bins = presenceByRoundTime(demo, { side: null, subject: ct, buy: 'eco' });

    expect(bins[0]).toBeCloseTo(5, 4);
    expect(
      presenceByRoundTime(demo, { side: 'T', subject: ct, buy: null }).every((b) => b === 0),
    ).toBe(true);
  });
});

describe('kept heat points', () => {
  const events = withKill(newEvents(), {
    tick: asTick(ROUND_TICKS + FREEZE_TICKS + 64 * 30),
    attacker: t,
    victim: ct,
  });
  const demo = newDemo(events);
  const points = collectHeatPoints(demo, ct);

  const scopes = [
    { side: null, buy: null, window: null },
    { side: 'CT', buy: null, window: null },
    { side: 'T', buy: null, window: null },
    { side: null, buy: 'eco', window: null },
    { side: null, buy: 'pistol', window: heatWindowOfBins(4, 11) },
    { side: null, buy: null, window: heatWindowOfBins(12, 29) },
  ] as const;

  it.each(scopes)('replays what the walk visits for the same player and narrowing: %j', (scope) => {
    const walked: number[][] = [];
    const walkedTotal = walkHeat(demo, 'presence', { ...scope, subject: ct }, (x, y, z, w) =>
      walked.push([x, y, z, w]),
    ).total;

    const replayed: number[][] = [];
    const replayedTotal = replayHeatPoints(points, 'presence', scope, (x, y, z, w) =>
      replayed.push([x, y, z, w]),
    );

    expect(replayed).toEqual(walked);
    expect(replayedTotal).toBeCloseTo(walkedTotal, 4);
  });

  it('keeps where the player died, in the round and at the second it happened', () => {
    const deaths: number[][] = [];
    replayHeatPoints(
      points,
      'deaths',
      { side: null, buy: 'eco', window: heatWindowOfBins(4, 11) },
      (x, y) => deaths.push([x, y]),
    );

    expect(deaths).toEqual([[100, 200]]);
    expect(
      replayHeatPoints(
        points,
        'deaths',
        { side: null, buy: null, window: heatWindowOfBins(0, 3) },
        () => undefined,
      ),
    ).toBe(0);
  });
});

describe('kept heat points for every reading', () => {
  const events = withGrenade(
    withKill(newEvents(), { tick: asTick(FREEZE_TICKS + 64 * 30), attacker: ct, victim: t }),
    {
      thrower: ct,
      throwTick: asTick(FREEZE_TICKS + 64 * 3),
      detonationTick: asTick(FREEZE_TICKS + 64 * 6),
      detonationPosition: { x: 7, y: 8, z: 0 },
    },
  );
  const demo = newDemo(events);
  const points = collectHeatPoints(demo, ct);

  it.each(HEAT_MODES)('replays what the walk visits: %s', (mode) => {
    const scope = { side: 'CT', buy: null, window: heatWindowOfBins(0, 11) } as const;
    const walked = walkHeat(demo, mode, { ...scope, subject: ct }, () => undefined).total;

    expect(replayHeatPoints(points, mode, scope, () => undefined)).toBeCloseTo(walked, 4);
  });
});
