import { describe, expect, it } from 'vitest';
import { lineupOfVariant, savedLineupId } from '../helpers/lineup-of-variant';
import {
  areOneTarget,
  matchLineups,
  TARGET_LANDING_UNITS,
  VARIANT_LANDING_UNITS,
  VARIANT_ORIGIN_UNITS,
} from '../helpers/match-lineups';
import {
  ANGLE_SCALE,
  asPlayerSlot,
  asTick,
  type GrenadeType,
  type ParsedDemo,
  type Round,
  type WorldPoint,
} from '../schema';
import { newEvents, newTrack, withGrenade } from './helpers';

const slot = asPlayerSlot(0);

const round: Round = {
  number: 1,
  startTick: asTick(0),
  freezeTimeEndTick: asTick(100),
  endTick: asTick(100_000),
  winner: 'CT',
  reason: 'all-t-eliminated',
  roundTimeSeconds: null,
  economy: [{ slot, money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'T' }],
};

interface Spec {
  readonly from: WorldPoint;
  readonly landing: WorldPoint;
  readonly type?: GrenadeType;
  readonly onTheMove?: boolean;
}

/** One throw per spec, each four ticks after the last so every one has a frame of its own. */
function demoOf(specs: readonly Spec[]): ParsedDemo {
  const track = newTrack({ frameCount: specs.length * 40 + 40 });
  let events = newEvents();

  for (const [index, spec] of specs.entries()) {
    const frame = 40 + index * 40;
    const cell = frame * track.slotCount + slot;
    track.posX[cell] = spec.from.x;
    track.posY[cell] = spec.from.y;
    track.posZ[cell] = spec.from.z;
    track.yaw[cell] = 90 * ANGLE_SCALE;
    track.speed[cell] = spec.onTheMove === true ? 215 : 0;

    if (spec.onTheMove === true) {
      const before = (frame - 16) * track.slotCount + slot;
      track.posX[before] = spec.from.x;
      track.posY[before] = spec.from.y - 120;
      track.speed[before] = 215;
    }

    events = withGrenade(events, {
      thrower: slot,
      type: spec.type ?? 'smokegrenade',
      throwTick: asTick(frame * 4),
      detonationTick: asTick(frame * 4 + 200),
      detonationPosition: spec.landing,
    });
  }

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track,
    events: { ...events, rounds: [round] },
  };
}

const spot = { x: 0, y: 0, z: 0 };
const xbox = { x: 1000, y: 1000, z: 0 };

describe('matchLineups', () => {
  it('keeps a throw on the move apart, as a landing and never a lineup', () => {
    const { targets, onTheMove } = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: spot, landing: xbox, onTheMove: true },
      ]),
    );

    expect(onTheMove).toHaveLength(1);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.throwCount).toBe(1);
  });

  it('merges throws from one spot to one landing into one variant with every thrower and round', () => {
    const near = { x: VARIANT_ORIGIN_UNITS - 10, y: 0, z: 0 };
    const { targets } = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: near, landing: { x: xbox.x + 10, y: xbox.y, z: 0 } },
      ]),
    );

    const [target] = targets;
    expect(target?.variants).toHaveLength(1);
    expect(target?.variants[0]?.throws).toHaveLength(2);
    expect(target?.variants[0]?.roundIndexes).toEqual([0]);
    expect(target?.variants[0]?.players).toEqual([slot]);
    expect(target?.variants[0]?.command).toContain('setpos');
  });

  it('splits variants by origin, and keeps both under one target when they land together', () => {
    const far = { x: VARIANT_ORIGIN_UNITS + 40, y: 0, z: 0 };
    const { targets } = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: far, landing: xbox },
      ]),
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]?.variants).toHaveLength(2);
    expect(targets[0]?.throwCount).toBe(2);
  });

  it('splits one origin into two variants when the landings differ, and a target when far enough', () => {
    const sameTarget = { x: xbox.x + VARIANT_LANDING_UNITS + 20, y: xbox.y, z: 0 };
    const elsewhere = { x: xbox.x + TARGET_LANDING_UNITS + 200, y: xbox.y, z: 0 };

    const merged = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: spot, landing: sameTarget },
      ]),
    );
    expect(merged.targets).toHaveLength(1);
    expect(merged.targets[0]?.variants).toHaveLength(2);

    const apart = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: spot, landing: elsewhere },
      ]),
    );
    expect(apart.targets).toHaveLength(2);
  });

  it('never joins two kinds', () => {
    const { targets } = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: spot, landing: xbox, type: 'flashbang' },
      ]),
    );

    expect(targets.map((target) => target.kind).sort()).toEqual(['flash', 'smoke']);
  });

  it('orders targets by how often they were thrown and gives a stable identity', () => {
    const specs: Spec[] = [
      { from: spot, landing: { x: 3000, y: 0, z: 0 } },
      { from: spot, landing: xbox },
      { from: spot, landing: xbox },
    ];
    const first = matchLineups(demoOf(specs));
    const second = matchLineups(demoOf(specs));

    expect(first.targets.map((target) => target.throwCount)).toEqual([2, 1]);
    expect(first.targets.map((target) => target.id)).toEqual(second.targets.map((t) => t.id));
    expect(first.targets[0]?.variants[0]?.id).toBe(second.targets[0]?.variants[0]?.id);
  });

  it('does not merge landings on different floors', () => {
    const { targets } = matchLineups(
      demoOf([
        { from: spot, landing: xbox },
        { from: spot, landing: { x: xbox.x, y: xbox.y, z: 600 } },
      ]),
    );

    expect(targets).toHaveLength(2);
  });
});

describe('areOneTarget', () => {
  const at = (x: number, z: number): WorldPoint => ({ x, y: 0, z });

  it('joins landings within the target distance on one floor', () => {
    expect(areOneTarget(at(0, 0), at(TARGET_LANDING_UNITS, 0))).toBe(true);
    expect(areOneTarget(at(0, 0), at(TARGET_LANDING_UNITS + 1, 0))).toBe(false);
  });

  it('never joins two floors, however close they are on the ground', () => {
    expect(areOneTarget(at(0, 0), at(0, 1000))).toBe(false);
  });
});

describe('lineupOfVariant', () => {
  const [target] = matchLineups(demoOf([{ from: spot, landing: xbox }])).targets;
  const variant = target?.variants[0];

  it('fills the lineup from the throw and keeps one id per variant', () => {
    if (variant === undefined) throw new Error('expected a variant');
    const options = { map: 'de_dust2', title: 'Smoke Xbox', targetCallout: 'Xbox', createdAt: 1 };
    const lineup = lineupOfVariant(variant, options);

    expect(lineup).toMatchObject({
      id: savedLineupId('de_dust2', variant),
      map: 'de_dust2',
      kind: 'smoke',
      side: 'T',
      throwType: 'stand',
      fromDemo: true,
      targetCallout: 'Xbox',
      landingCommand: 'setpos 1000.00 1000.00 0.00',
    });
    expect(lineup.command).toBe(variant.command);
    expect(lineupOfVariant(variant, { ...options, createdAt: 2 }).id).toBe(lineup.id);
    expect(lineupOfVariant(variant, { ...options, targetCallout: undefined })).not.toHaveProperty(
      'targetCallout',
    );
  });
});
