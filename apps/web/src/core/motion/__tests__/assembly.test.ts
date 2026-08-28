import { describe, expect, it } from 'vitest';
import { type Arrival, type AssemblyPart, assembly, pillArrival } from '../helpers/assembly';

const PARTS: readonly AssemblyPart[] = ['stage', 'cardLeft', 'cardRight', 'cardTop', 'cardBottom'];

/** DESIGN.md §8: the whole sequence is ~600ms, and this is what holds that number to its word. */
const ASSEMBLY_BUDGET_SECONDS = 0.6;

function endSeconds(arrival: Arrival): number {
  const { delay = 0, duration = 0 } = arrival.transition;

  return delay + duration;
}

function delaySeconds(arrival: Arrival): number {
  return arrival.transition.delay ?? 0;
}

describe('assembly', () => {
  it('animates opacity and transform and nothing that triggers layout', () => {
    for (const part of PARTS) {
      const arrival = assembly(part);

      expect(Object.keys(arrival.initial).every((key) => ['opacity', 'x', 'y'].includes(key))).toBe(
        true,
      );
      expect(Object.keys(arrival.animate).every((key) => ['opacity', 'x', 'y'].includes(key))).toBe(
        true,
      );
    }
  });

  it('fades the stage where it already stands', () => {
    const stage = assembly('stage');

    expect(stage.initial).toEqual({ opacity: 0 });
    expect(stage.animate).toEqual({ opacity: 1 });
  });

  it('starts each card off the edge it lives against and lands it at rest', () => {
    expect(assembly('cardLeft').initial.x).toBeLessThan(0);
    expect(assembly('cardRight').initial.x).toBeGreaterThan(0);
    expect(assembly('cardTop').initial.y).toBeLessThan(0);
    expect(assembly('cardBottom').initial.y).toBeGreaterThan(0);

    expect(assembly('cardLeft').animate.x).toBe(0);
    expect(assembly('cardRight').animate.x).toBe(0);
    expect(assembly('cardTop').animate.y).toBe(0);
    expect(assembly('cardBottom').animate.y).toBe(0);
  });

  it('brings every card in together', () => {
    const ends = PARTS.filter((part) => part !== 'stage').map((part) => endSeconds(assembly(part)));

    expect(new Set(ends).size).toBe(1);
  });

  it('finishes inside the budget, cards and strip alike', () => {
    for (const part of PARTS)
      expect(endSeconds(assembly(part))).toBeLessThanOrEqual(ASSEMBLY_BUDGET_SECONDS);

    for (const count of [1, 24, 30, 45]) {
      expect(endSeconds(pillArrival(count - 1, count))).toBeLessThanOrEqual(
        ASSEMBLY_BUDGET_SECONDS,
      );
    }
  });
});

describe('pillArrival', () => {
  it('fills the strip left to right', () => {
    const delays = Array.from({ length: 30 }, (_, index) => delaySeconds(pillArrival(index, 30)));

    for (let index = 1; index < delays.length; index++) {
      expect(delays[index] ?? 0).toBeGreaterThan(delays[index - 1] ?? 0);
    }
  });

  it('takes the same span whatever the round count', () => {
    expect(delaySeconds(pillArrival(0, 30))).toBeCloseTo(delaySeconds(pillArrival(0, 45)));
    expect(delaySeconds(pillArrival(29, 30))).toBeCloseTo(delaySeconds(pillArrival(44, 45)));
  });

  it('gives a one-round match a delay rather than a division by zero', () => {
    const only = pillArrival(0, 1);

    expect(delaySeconds(only)).toBe(delaySeconds(pillArrival(0, 30)));
  });

  it('lights a pill without moving it', () => {
    const pill = pillArrival(3, 30);

    expect(pill.initial).toEqual({ opacity: 0 });
    expect(pill.animate).toEqual({ opacity: 1 });
  });
});
