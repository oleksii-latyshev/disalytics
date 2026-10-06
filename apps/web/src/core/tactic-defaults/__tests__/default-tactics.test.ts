import { describe, expect, it } from 'vitest';
import { defaultTactics } from '../helpers/default-tactics';

describe('defaultTactics', () => {
  it('reads every shipped tactic in the current shape', () => {
    const tactics = defaultTactics();

    expect(tactics.map((tactic) => [tactic.map, tactic.side])).toEqual([['de_mirage', 'T']]);
  });

  it('points at no lineup, since none ships with it', () => {
    const throws = defaultTactics().flatMap((tactic) =>
      tactic.plans.flatMap((plan) => plan.steps.flatMap((step) => step.throws)),
    );

    expect(throws.length).toBeGreaterThan(0);
    expect(throws.filter((thrown) => thrown.lineupId !== undefined)).toEqual([]);
  });
});
