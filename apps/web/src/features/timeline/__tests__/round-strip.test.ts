import { asPlayerSlot, type Team } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  anchorAtFraction,
  hasRoomForNumbers,
  type RoundCell,
  roundCells,
  tooltipAnchor,
  trackSegments,
} from '../helpers/round-strip';
import { newBuy, newDemo, newKill, newRound } from './helpers';

/** Five slots a side, CT on 0–4 and T on 5–9, which is the shape a freeze-time read has. */
const BUY = newBuy({ CT: [4700, 4700, 4700, 4700, 4700], T: [4200, 4200, 4200, 4200, 4200] });

/**
 * The same ten slots with the sides crossed, which is all a halftime is in the data. Written out
 * rather than through `newBuy`, which slots CT first whatever order its argument is given in.
 */
const SWAPPED = BUY.map((entry) => ({ ...entry, team: entry.team === 'CT' ? 'T' : 'CT' }) as const);

/** Rounds are 6400 ticks long from their start — the fixture's `newRound` decides that. */
const SECOND_ROUND_START = 8000;

function twoRounds() {
  return [newRound(1, 0, 'CT', BUY), newRound(2, SECOND_ROUND_START, 'T', BUY)];
}

/** A strip of `count` pills with a segment break every `half` of them. */
function pills(count: number, half = count): readonly RoundCell[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    winner: 'CT' as const,
    reason: 'all-t-eliminated' as const,
    survivors: { CT: 5, T: 0 },
    score: { startedCt: index + 1, startedT: 0 },
    startsSegment: index > 0 && index % half === 0,
  }));
}

describe('roundCells', () => {
  it('carries what a pill shows and what its hover names', () => {
    const demo = newDemo(2001, { rounds: twoRounds() });

    expect(roundCells(demo)).toEqual([
      {
        number: 1,
        winner: 'CT',
        reason: 'all-t-eliminated',
        survivors: { CT: 5, T: 5 },
        score: { startedCt: 1, startedT: 0 },
        startsSegment: false,
      },
      {
        number: 2,
        winner: 'T',
        reason: 'all-t-eliminated',
        survivors: { CT: 5, T: 5 },
        score: { startedCt: 1, startedT: 1 },
        startsSegment: false,
      },
    ]);
  });

  it('marks the round the sides swapped on as the start of a segment', () => {
    const demo = newDemo(2001, {
      rounds: [
        newRound(1, 0, 'CT', BUY),
        newRound(2, SECOND_ROUND_START, 'CT', BUY),
        newRound(3, SECOND_ROUND_START * 2, 'T', SWAPPED),
      ],
    });

    expect(roundCells(demo).map((cell) => cell.startsSegment)).toEqual([false, false, true]);
  });

  it('never starts a segment on the first round, which would divide it from nothing', () => {
    const demo = newDemo(2001, { rounds: [newRound(1, 0, 'CT', BUY)] });

    expect(roundCells(demo).at(0)?.startsSegment).toBe(false);
  });

  it('counts both sides down as they lose players, round by round', () => {
    const demo = newDemo(2001, {
      rounds: twoRounds(),
      kills: [
        newKill(2000, { victim: asPlayerSlot(0) }),
        newKill(3000, { victim: asPlayerSlot(1) }),
        newKill(3500, { victim: asPlayerSlot(5) }),
        newKill(3600, { victim: asPlayerSlot(6) }),
        newKill(SECOND_ROUND_START + 2000, { victim: asPlayerSlot(5) }),
      ],
    });
    const cells = roundCells(demo);

    expect(cells.at(0)?.survivors).toEqual({ CT: 3, T: 3 });
    expect(cells.at(1)?.survivors).toEqual({ CT: 5, T: 4 });
  });

  it('has no cells for a match with no rounds', () => {
    expect(roundCells(newDemo(2001))).toEqual([]);
  });
});

describe('hasRoomForNumbers', () => {
  it('keeps the numbers at the width a real match has', () => {
    // §7.3's arithmetic: the pill row is roughly 1326px at 1440 and roughly 936px below the split,
    // so a 24-round match is 51px a pill on the wide end and 35px on the narrow one.
    expect(hasRoomForNumbers(1326, pills(24, 12))).toBe(true);
    expect(hasRoomForNumbers(936, pills(24, 12))).toBe(true);
    expect(hasRoomForNumbers(1326, pills(40, 10))).toBe(true);
  });

  it('drops them only where a pill cannot hold two legible digits', () => {
    // 40 rounds of overtime on a sub-1080 laptop, which is the one case that loses the number.
    expect(hasRoomForNumbers(936, pills(40, 10))).toBe(false);
    expect(hasRoomForNumbers(400, pills(30))).toBe(false);
  });

  it('counts a segment break as the wider gap it is', () => {
    // 20 pills at exactly 20px plus 19 four-pixel gaps is 476px and fits. Widening one of those
    // gaps to a segment break takes eight pixels out of the pills, and it no longer does.
    expect(hasRoomForNumbers(476, pills(20))).toBe(true);
    expect(hasRoomForNumbers(476, pills(20, 10))).toBe(false);
  });

  it('keeps the numbers before it has been measured, rather than flashing the floor', () => {
    expect(hasRoomForNumbers(0, pills(24, 12))).toBe(true);
    expect(hasRoomForNumbers(1326, [])).toBe(true);
  });
});

/** A track read left to right, which is the only thing these assertions care about. */
function lit(side: Team, alive: number): readonly boolean[] {
  return trackSegments(side, alive).map((seat) => seat.isLive);
}

describe('trackSegments', () => {
  it('fills T from the left and CT from the right, which is where their cards are', () => {
    expect(lit('T', 2)).toEqual([true, true, false, false, false]);
    expect(lit('CT', 2)).toEqual([false, false, false, true, true]);
  });

  it('draws a full track for a side that lost nobody and an empty one for a wipe', () => {
    expect(lit('CT', 5)).toEqual([true, true, true, true, true]);
    expect(lit('T', 0)).toEqual([false, false, false, false, false]);
  });

  it('clamps a side that fielded more than five, rather than growing the track', () => {
    expect(lit('T', 7)).toEqual([true, true, true, true, true]);
  });

  it('numbers the seats left to right, so a seat carries its own identity', () => {
    expect(trackSegments('CT', 1).map((seat) => seat.position)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('tooltipAnchor', () => {
  it('grows a tooltip away from the nearer end of the strip', () => {
    expect(tooltipAnchor(0, 24)).toHaveProperty('left');
    expect(tooltipAnchor(23, 24)).toHaveProperty('right');
  });

  it('anchors a pill at its own centre, measured from whichever end it hangs off', () => {
    expect(tooltipAnchor(1, 4)).toEqual({ left: '37.5%' });
    expect(tooltipAnchor(2, 4)).toEqual({ right: '37.5%' });
  });

  it('hangs a pill sitting exactly on the centre line off its left edge', () => {
    expect(tooltipAnchor(1, 3)).toEqual({ left: '50%' });
  });

  it('has somewhere to sit when there is nothing to name', () => {
    expect(tooltipAnchor(0, 0)).toEqual({ left: '0%' });
  });

  it('reads the same rule off a position, which is how §7.1 anchors a glyph', () => {
    expect(anchorAtFraction(0)).toEqual({ left: '0%' });
    expect(anchorAtFraction(0.25)).toEqual({ left: '25%' });
    expect(anchorAtFraction(0.5)).toEqual({ left: '50%' });
    expect(anchorAtFraction(0.75)).toEqual({ right: '25%' });
    expect(anchorAtFraction(1)).toEqual({ right: '0%' });
  });
});
