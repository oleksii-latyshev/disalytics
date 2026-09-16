import type { ParsedDemo } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { EconomyGaps, economySteps } from '@/features/timeline';

const CENTRE = 50;
const REACH = 42;

export function MatchMetrics({ demo }: { demo: ParsedDemo }) {
  const t = useT();
  const steps = useMemo(() => economySteps(demo), [demo]);

  if (steps.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center text-13 text-ink-dim">
        <Text path="review.metrics.empty" />
      </div>
    );
  }

  const last = steps.at(-1);

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-[72rem] flex-col gap-3 overflow-y-auto">
      <header className="flex flex-col gap-1">
        <h2 className="font-ui font-medium text-28 leading-dense">
          <Text path="review.views.metrics" />
        </h2>
        <p className="text-13 text-ink-dim">
          <Text path="timeline.economy.label" />
        </p>
      </header>

      <figure className="surface-card m-0 flex min-h-[12rem] flex-1 flex-col gap-3 rounded-card p-3">
        <div className="relative min-h-[10rem] flex-1 pl-7">
          <span aria-hidden="true" className="absolute top-1 left-0 label-dense text-ct">
            CT
          </span>
          <span aria-hidden="true" className="absolute bottom-1 left-0 label-dense text-t">
            T
          </span>

          <svg
            role="img"
            aria-label={t('timeline.economy.label')}
            viewBox={`0 0 ${steps.length} 100`}
            preserveAspectRatio="none"
            className="block size-full"
          >
            <line
              x1="0"
              x2={steps.length}
              y1={CENTRE}
              y2={CENTRE}
              className="stroke-line"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            {steps.map((step, index) => {
              const height = step.share * REACH;
              const label =
                step.leader === null
                  ? t('timeline.economy.even', { round: step.round })
                  : t('timeline.economy.lead', {
                      round: step.round,
                      side: step.leader,
                      value: step.difference,
                    });

              return (
                <rect
                  key={step.round}
                  x={index + 0.1}
                  y={step.leader === 'CT' ? CENTRE - height : CENTRE}
                  width="0.8"
                  height={step.leader === null ? 1 : height}
                  className={
                    step.leader === 'CT'
                      ? 'fill-ct opacity-40'
                      : step.leader === 'T'
                        ? 'fill-t opacity-40'
                        : 'fill-line-strong'
                  }
                >
                  <title>{label}</title>
                </rect>
              );
            })}
          </svg>
        </div>

        <figcaption className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3 text-12 text-ink-dim leading-prose">
          <span className="numeric text-ink">
            <Text path="review.maps.roundShort" values={{ round: steps[0]?.round ?? 1 }} />
          </span>
          <Text path="timeline.match.legend.economy" />
          <span className="numeric text-ink">
            <Text path="review.maps.roundShort" values={{ round: last?.round ?? 1 }} />
          </span>
        </figcaption>
      </figure>

      <EconomyGaps steps={steps} />
    </section>
  );
}
