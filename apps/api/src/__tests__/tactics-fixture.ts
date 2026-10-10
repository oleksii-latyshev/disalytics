import type { Tactic, TacticPlan, TacticStep } from '@disa/demo-core';

export const step: TacticStep = {
  id: 'step-1',
  name: 'Take apartments',
  startsAt: null,
  players: [],
  throws: [],
  drawings: [],
};

export const mainPlan: TacticPlan = {
  id: 'main',
  condition: 'B split',
  parentId: null,
  forkAfter: 0,
  deaths: {},
  steps: [step],
};

export function tactic(overrides: Partial<Tactic> = {}): Tactic {
  return {
    id: 'mirage-b-split',
    title: 'B split',
    map: 'de_mirage',
    side: 'T',
    spawns: [],
    plans: [mainPlan],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}
