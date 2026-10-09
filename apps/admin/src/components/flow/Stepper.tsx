import { Text, type TranslationKey } from '@disa/i18n';
import { cn } from '@disa/ui';

export type StepNumber = 1 | 2 | 3 | 4;

const STEPS: readonly { readonly number: StepNumber; readonly label: TranslationKey }[] = [
  { number: 1, label: 'admin.step.file' },
  { number: 2, label: 'admin.step.decide' },
  { number: 3, label: 'admin.step.review' },
  { number: 4, label: 'admin.step.done' },
];

export function Stepper({ step }: { step: StepNumber }) {
  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
      {STEPS.map(({ number, label }) => {
        const state = number < step ? 'done' : number === step ? 'now' : 'next';
        return (
          <li
            key={number}
            aria-current={state === 'now' ? 'step' : undefined}
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-chip border bg-surface-1 px-3 py-2.5 text-13 transition-[color,border-color] duration-(--duration-base)',
              state === 'now' && 'border-line-strong text-ink',
              state === 'done' && 'border-line text-ink-dim',
              state === 'next' && 'border-line text-ink-faint',
            )}
          >
            <span
              className={cn(
                'grid size-[22px] flex-none place-items-center rounded-full border border-current text-12 transition-[background-color,color] duration-(--duration-base)',
                state === 'done' && 'border-ink-dim bg-ink-dim text-surface-0',
              )}
            >
              {state === 'done' ? '✓' : number}
            </span>
            <span className="max-sm:sr-only truncate">
              <Text path={label} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
