import { asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { cellDetail, roundCells, tooltipAnchor } from '../helpers/round-list';
import { newBuy, newDemo, newKill, newRound } from './helpers';

/** Five slots a side, CT on 0–4 and T on 5–9, which is the shape a freeze-time read has. */
const BUY = newBuy({ CT: [4700, 4700, 4700, 4700, 4700], T: [4200, 4200, 4200, 4200, 4200] });

/** Rounds are 6400 ticks long from their start — the fixture's `newRound` decides that. */
const SECOND_ROUND_START = 8000;

function twoRounds() {
  return [newRound(1, 0, 'CT', BUY), newRound(2, SECOND_ROUND_START, 'T', BUY)];
}

describe('roundCells', () => {
  it('carries what a cell shows and what its hover names', () => {
    const demo = newDemo(2001, { rounds: twoRounds() });

    expect(roundCells(demo)).toEqual([
      {
        number: 1,
        winner: 'CT',
        reason: 'all-t-eliminated',
        survivors: { CT: 5, T: 5 },
        score: { startedCt: 1, startedT: 0 },
      },
      {
        number: 2,
        winner: 'T',
        reason: 'all-t-eliminated',
        survivors: { CT: 5, T: 5 },
        score: { startedCt: 1, startedT: 1 },
      },
    ]);
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

describe('cellDetail', () => {
  it('shows the tint, the number and both counts at the width a real match has', () => {
    // §7.3's arithmetic: the block is roughly 1390px at 1440 and roughly 1000px below the split,
    // so a 24-round match is 58px a cell on the wide end and 42px on the narrow one. Overtime
    // keeps the counts on the wide end well past the 24 a match without it plays.
    expect(cellDetail(1390, 24)).toBe('full');
    expect(cellDetail(1000, 24)).toBe('full');
    expect(cellDetail(1390, 34)).toBe('full');
  });

  it('drops the counts first, because the number is the way in', () => {
    // Overtime on the narrow end is where the three-column row runs out of width.
    expect(cellDetail(1000, 40)).toBe('number');
    expect(cellDetail(399, 10)).toBe('number');
    expect(cellDetail(280, 20)).toBe('number');
  });

  it('falls back to bands for a strip with no room for a legible number', () => {
    expect(cellDetail(279, 20)).toBe('tint');
    expect(cellDetail(400, 60)).toBe('tint');
  });

  it('renders the full row before it has been measured, rather than flashing the floor', () => {
    expect(cellDetail(0, 24)).toBe('full');
    expect(cellDetail(1390, 0)).toBe('full');
  });
});

describe('tooltipAnchor', () => {
  it('grows a tooltip away from the nearer end of the strip', () => {
    expect(tooltipAnchor(0, 24)).toHaveProperty('left');
    expect(tooltipAnchor(23, 24)).toHaveProperty('right');
  });

  it('anchors a cell at its own centre, measured from whichever end it hangs off', () => {
    expect(tooltipAnchor(1, 4)).toEqual({ left: '37.5%' });
    expect(tooltipAnchor(2, 4)).toEqual({ right: '37.5%' });
  });

  it('hangs a cell sitting exactly on the centre line off its left edge', () => {
    expect(tooltipAnchor(1, 3)).toEqual({ left: '50%' });
  });

  it('has somewhere to sit when there is nothing to name', () => {
    expect(tooltipAnchor(0, 0)).toEqual({ left: '0%' });
  });
});
