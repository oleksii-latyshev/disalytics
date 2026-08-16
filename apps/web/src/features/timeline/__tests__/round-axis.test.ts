import { asPlayerSlot, asTick } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  axisGlyphs,
  hasRoomForGlyphs,
  positionInSegment,
  timelineSegment,
} from '../helpers/round-axis';
import { newBuy, newDefuse, newDemo, newGrenade, newKill, newPlant, newRound } from './helpers';

// The fixtures run at 64 ticks and 16 samples, so a frame is a tick over four. `newRound` opens the
// buy 640 ticks before the round and closes it 6400 after the start — 160 and 1600 frames.
const ROUNDS = [newRound(1, 0), newRound(2, 8000)];

describe('timelineSegment', () => {
  it('spans the round from its start to where the next one begins', () => {
    const segment = timelineSegment(newDemo(4001, { rounds: ROUNDS }), 0);

    expect(segment.roundNumber).toBe(1);
    expect(segment.startFrame).toBe(0);
    expect(segment.endFrame).toBe(2000);
  });

  it('puts the buy phase and the round close on the axis as fractions of it', () => {
    const segment = timelineSegment(newDemo(4001, { rounds: ROUNDS }), 0);

    expect(segment.buyEndFraction).toBeCloseTo(0.08);
    expect(segment.closeFraction).toBeCloseTo(0.8);
  });

  it('runs the last round to the last sample, having no next round to stop at', () => {
    const segment = timelineSegment(newDemo(4001, { rounds: ROUNDS }), 1);

    expect(segment.startFrame).toBe(2000);
    expect(segment.endFrame).toBe(4000);
  });

  it('covers the warm-up up to the first round rather than leaving an empty axis', () => {
    const segment = timelineSegment(newDemo(4001, { rounds: ROUNDS }), undefined);

    expect(segment.roundNumber).toBeNull();
    expect(segment.startFrame).toBe(0);
    expect(segment.endFrame).toBe(0);
    expect(segment.buyEndFraction).toBeNull();
    expect(segment.closeFraction).toBeNull();
  });

  it('gives a match with no rounds the whole track', () => {
    const segment = timelineSegment(newDemo(4001), undefined);

    expect(segment.roundNumber).toBeNull();
    expect(segment.endFrame).toBe(4000);
  });

  it('falls back to the warm-up for a round index the match does not hold', () => {
    expect(timelineSegment(newDemo(4001, { rounds: ROUNDS }), 9).roundNumber).toBeNull();
  });
});

describe('positionInSegment', () => {
  const segment = timelineSegment(newDemo(4001, { rounds: ROUNDS }), 1);

  it('puts the segment ends on the strip ends', () => {
    expect(positionInSegment(2000, segment, 500)).toBe(0);
    expect(positionInSegment(4000, segment, 500)).toBe(500);
  });

  it('places a position between two samples proportionally', () => {
    expect(positionInSegment(3000, segment, 500)).toBeCloseTo(250);
  });

  it('clamps a position outside the segment onto the strip', () => {
    expect(positionInSegment(0, segment, 500)).toBe(0);
    expect(positionInSegment(9000, segment, 500)).toBe(500);
  });

  it('collapses to the left edge for a segment with no length', () => {
    const empty = timelineSegment(newDemo(4001, { rounds: ROUNDS }), undefined);

    expect(positionInSegment(12, empty, 500)).toBe(0);
  });
});

describe('hasRoomForGlyphs', () => {
  it('has room when nothing is on the axis', () => {
    expect(hasRoomForGlyphs(0, 0)).toBe(true);
  });

  it('has room while the average pitch clears the threshold', () => {
    expect(hasRoomForGlyphs(10, 500)).toBe(true);
    expect(hasRoomForGlyphs(10, 140)).toBe(true);
  });

  it('collapses to marks below it', () => {
    expect(hasRoomForGlyphs(10, 139)).toBe(false);
    expect(hasRoomForGlyphs(60, 500)).toBe(false);
  });
});

describe('axisGlyphs', () => {
  function glyphsFor(options: Parameters<typeof newDemo>[1], roundIndex = 0) {
    const demo = newDemo(4001, { rounds: ROUNDS, ...options });

    return axisGlyphs(demo, roundIndex, timelineSegment(demo, roundIndex));
  }

  it('places the round events in the order they happened', () => {
    const glyphs = glyphsFor({
      kills: [newKill(4000)],
      plants: [newPlant(2000)],
      grenades: [newGrenade(800, { detonationTick: asTick(1200), type: 'flashbang' })],
    });

    expect(glyphs.map((glyph) => glyph.event.kind)).toEqual(['grenade', 'plant', 'kill']);
    expect(glyphs.map((glyph) => glyph.frame)).toEqual([300, 500, 1000]);
  });

  it('leaves out a kill after the round closed, which is the next buy rather than this round', () => {
    // The segment runs to tick 8000, so a kill at 6800 is inside the axis and outside the round.
    expect(glyphsFor({ kills: [newKill(6800)] })).toEqual([]);
  });

  it('leaves out a kill before the round opened', () => {
    expect(glyphsFor({ kills: [newKill(0)] }, 1)).toEqual([]);
  });

  it('tints a skull by the side the victim held that round, not by the roster', () => {
    const rounds = [
      newRound(1, 0, 'CT', newBuy({ CT: [0], T: [0] })),
      newRound(2, 8000, 'T', newBuy({ CT: [0], T: [0] })),
    ];
    const kills = [newKill(400, { victim: asPlayerSlot(1) })];
    const demo = newDemo(4001, { rounds, kills });
    const [glyph] = axisGlyphs(demo, 0, timelineSegment(demo, 0));

    expect(glyph?.event).toMatchObject({ kind: 'kill', victimSide: 'T' });
  });

  it('marks a completed defuse where it finished and an interrupted one where it began', () => {
    const completed = glyphsFor({
      defuses: [newDefuse(2000, { status: 'completed', tick: asTick(4560) })],
    });
    const interrupted = glyphsFor({ defuses: [newDefuse(2000, { status: 'interrupted' })] });

    expect(completed.at(0)?.frame).toBe(1140);
    expect(interrupted.at(0)?.frame).toBe(500);
    expect(interrupted.at(0)?.event).toMatchObject({ kind: 'defuse', status: 'interrupted' });
  });

  it('marks a grenade where it went off, and where it was thrown when it never did', () => {
    const detonated = glyphsFor({
      grenades: [newGrenade(800, { detonationTick: asTick(1200) })],
    });
    const unknown = glyphsFor({ grenades: [newGrenade(800)] });

    expect(detonated.at(0)?.frame).toBe(300);
    expect(unknown.at(0)?.frame).toBe(200);
  });

  it('resolves a molotov and an incendiary to the same utility', () => {
    const molotov = glyphsFor({ grenades: [newGrenade(800, { type: 'molotov' })] });
    const incendiary = glyphsFor({ grenades: [newGrenade(800, { type: 'incgrenade' })] });

    expect(molotov.at(0)?.event).toMatchObject({ kind: 'grenade', utility: 'fire' });
    expect(incendiary.at(0)?.event).toMatchObject({ kind: 'grenade', utility: 'fire' });
  });

  it('identifies every glyph on the axis distinctly', () => {
    const glyphs = glyphsFor({ kills: [newKill(400), newKill(400)], plants: [newPlant(400)] });

    expect(new Set(glyphs.map((glyph) => glyph.id)).size).toBe(3);
  });

  it('has nothing to place during the warm-up, which is not a round', () => {
    const demo = newDemo(4001, { rounds: ROUNDS, kills: [newKill(400)] });

    expect(axisGlyphs(demo, undefined, timelineSegment(demo, undefined))).toEqual([]);
  });
});
