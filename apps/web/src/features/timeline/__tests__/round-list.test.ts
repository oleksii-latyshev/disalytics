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
        survivors: 5,
        score: { startedCt: 1, startedT: 0 },
      },
      {
        number: 2,
        winner: 'T',
        reason: 'all-t-eliminated',
        survivors: 5,
        score: { startedCt: 1, startedT: 1 },
      },
    ]);
  });

  it('counts the winning side down as it loses players, round by round', () => {
    const demo = newDemo(2001, {
      rounds: twoRounds(),
      kills: [
        newKill(2000, { victim: asPlayerSlot(0) }),
        newKill(3000, { victim: asPlayerSlot(1) }),
        // The T side lost four, and none of them come off the CT side's count.
        newKill(3500, { victim: asPlayerSlot(5) }),
        newKill(3600, { victim: asPlayerSlot(6) }),
        newKill(SECOND_ROUND_START + 2000, { victim: asPlayerSlot(5) }),
      ],
    });
    const cells = roundCells(demo);

    expect(cells.at(0)?.survivors).toBe(3);
    expect(cells.at(1)?.survivors).toBe(4);
  });

  it('has no cells for a match with no rounds', () => {
    expect(roundCells(newDemo(2001))).toEqual([]);
  });
});

describe('cellDetail', () => {
  it('shows the tint, the number and the count at the width a real match has', () => {
    // §7.3's arithmetic: the block is roughly 1390px wide at 1440, and 24 rounds is 58px a cell.
    expect(cellDetail(1390, 24)).toBe('full');
    expect(cellDetail(1000, 40)).toBe('full');
    expect(cellDetail(400, 20)).toBe('full');
  });

  it('drops the count first, because the number is the way in', () => {
    expect(cellDetail(399, 20)).toBe('number');
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
