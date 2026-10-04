import type { TacticStep } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { stepThrowRows } from '../helpers/tactic-step-throws';

const step: TacticStep = {
  id: 's',
  name: 'Utility',
  timeOffsetSeconds: 0,
  players: [{ slot: 1, x: 0, y: 0, label: ' Entry ' }],
  throws: [
    {
      id: 't1',
      throwerSlot: 1,
      kind: 'smoke',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      releaseTime: 2,
      lineupId: 'l1',
    },
    {
      id: 't2',
      throwerSlot: 3,
      kind: 'flash',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      releaseTime: 0,
    },
  ],
};

describe('stepThrowRows', () => {
  it('resolves the lineup title and the thrower label', () => {
    const lineups = [{ id: 'l1', title: 'Connector smoke' }];
    const rows = stepThrowRows(step, lineups);
    expect(rows[0]).toMatchObject({ lineupTitle: 'Connector smoke', label: 'Entry', slot: 1 });
    expect(rows[1]).toMatchObject({ lineupTitle: undefined, label: '', slot: 3 });
  });

  it('is empty without a step', () => {
    expect(stepThrowRows(undefined, [])).toEqual([]);
  });
});
