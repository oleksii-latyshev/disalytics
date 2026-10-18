import { GRENADE_KINDS, type GrenadeKind, type TacticStep } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { formatElapsed } from '../helpers/tactic-preview';
import type { StepSchedule } from '../helpers/tactic-schedule';
import { GrenadeTally } from './GrenadeTally';

export interface TacticStepReadoutProps {
  readonly step: TacticStep | undefined;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly stepSchedule: StepSchedule | undefined;
}

/** What the step in view says, read-only: its name, when it starts and the utility it throws. */
export function TacticStepReadout({
  step,
  stepIndex,
  stepCount,
  stepSchedule,
}: TacticStepReadoutProps) {
  if (step === undefined) return null;
  const counts: Record<GrenadeKind, number> = { he: 0, flash: 0, smoke: 0, fire: 0, decoy: 0 };
  for (const thrown of step.throws) {
    for (const kind of GRENADE_KINDS) if (kind === thrown.kind) counts[kind] += 1;
  }

  return (
    <section className="flex flex-col gap-1.5 p-3 lg:pr-0">
      <div className="px-1 font-mono text-11 text-ink-dim uppercase tracking-[0.12em]">
        <Text
          path="library.tactics.board.step.eyebrow"
          values={{ index: stepIndex + 1, total: stepCount }}
        />
      </div>
      <div className="rounded-card border border-line bg-surface-1 p-2.5">
        <p className="m-0 font-semibold text-14">{step.name}</p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-ink-dim">
          <span>
            <Text
              path="library.tactics.preview.startsAt"
              values={{ time: formatElapsed(stepSchedule?.startSeconds ?? 0) }}
            />
          </span>
          <span className="flex items-center gap-1.5">
            <Text path="library.tactics.preview.throws" values={{ count: step.throws.length }} />
            {step.throws.length > 0 && <GrenadeTally counts={counts} />}
          </span>
        </p>
      </div>
    </section>
  );
}
