import { describe, expect, it } from 'vitest';
import { STACK_RADIUS_PLATE_PX, stackPoints } from '../helpers/target-stacks';

describe('stackPoints', () => {
  it('keeps markers that clear one another as stacks of one', () => {
    const stacks = stackPoints([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: STACK_RADIUS_PLATE_PX + 1, y: 0 },
    ]);

    expect(stacks.map((stack) => stack.ids)).toEqual([['a'], ['b']]);
  });

  it('stacks markers that would overlap, anchored on the first given', () => {
    const stacks = stackPoints([
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 110, y: 100 },
      { id: 'c', x: 100, y: 120 },
      { id: 'd', x: 400, y: 400 },
    ]);

    expect(stacks).toEqual([
      { x: 100, y: 100, ids: ['a', 'b', 'c'] },
      { x: 400, y: 400, ids: ['d'] },
    ]);
  });

  it('has nothing to stack when it is given nothing', () => {
    expect(stackPoints([])).toEqual([]);
  });
});
