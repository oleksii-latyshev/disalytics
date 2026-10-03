import type { TacticStep } from '@disa/demo-core';
import { type InterpolatedTacticState, interpolateTacticStep } from './tactic-interpolation';

export function tacticStateAt(
  steps: readonly TacticStep[],
  activeStepIndex: number,
  currentTime: number | undefined,
): InterpolatedTacticState {
  if (currentTime !== undefined) return interpolateTacticStep(steps, currentTime);

  const currentStep = steps[activeStepIndex] ?? steps[0];
  if (currentStep === undefined) {
    return {
      players: [],
      activeStepIndex: 0,
      flyingGrenades: [],
      activeUtilities: [],
      drawings: [],
      visibleThrows: [],
    };
  }

  return {
    players: currentStep.players,
    activeStepIndex,
    flyingGrenades: [],
    activeUtilities: [],
    drawings: currentStep.drawings ?? [],
    visibleThrows: currentStep.throws,
  };
}
