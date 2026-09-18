import {
  matchClutches,
  matchEnemyBlindTime,
  matchUtilityDamage,
  multiKills,
  openingDuels,
  type ParsedDemo,
  type Team,
  tradeKills,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { EconomyGaps, economySteps } from '@/features/timeline';

const CENTRE = 50;
const REACH = 42;
const MULTI_KILL_COUNTS = [2, 3, 4, 5] as const;

export function MatchMetrics({ demo }: { demo: ParsedDemo }) {
  const t = useT();
  const locale = useLocale();
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const durationFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'short',
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const steps = useMemo(() => economySteps(demo), [demo]);
  const openingWins = useMemo(() => {
    const wins: Record<Team, number> = { CT: 0, T: 0 };
    for (const duel of openingDuels(demo)) {
      if (duel.attackerSide !== undefined) wins[duel.attackerSide] += 1;
    }
    return wins;
  }, [demo]);
  const multiKillRounds = useMemo(() => {
    const rounds = [0, 0, 0, 0];
    for (const multiKill of multiKills(demo)) {
      const index = Math.min(multiKill.kills, 5) - 2;
      rounds[index] = (rounds[index] ?? 0) + 1;
    }
    return rounds;
  }, [demo]);
  const tradeKillTotals = useMemo(() => {
    const totals: Record<Team, number> = { CT: 0, T: 0 };
    for (const trade of tradeKills(demo)) totals[trade.side] += 1;
    return totals;
  }, [demo]);
  const clutchTotals = useMemo(() => {
    const totals: Record<Team, number> = { CT: 0, T: 0 };
    for (const clutch of matchClutches(demo)) totals[clutch.side] += 1;
    return totals;
  }, [demo]);
  const utilityDamage = useMemo(() => matchUtilityDamage(demo), [demo]);
  const enemyBlindTime = useMemo(() => matchEnemyBlindTime(demo), [demo]);

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

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.opening.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.opening.note" />
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(['CT', 'T'] as const).map((side) => (
            <p
              key={side}
              className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
            >
              <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
              <span className="numeric text-28 text-ink">{openingWins[side]}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.trades.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.trades.note" />
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(['CT', 'T'] as const).map((side) => (
            <p
              key={side}
              className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
            >
              <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
              <span className="numeric text-28 text-ink">{tradeKillTotals[side]}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.multi.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.multi.note" />
          </p>
        </header>

        <div className="grid grid-cols-4 gap-2">
          {MULTI_KILL_COUNTS.map((kills, index) => (
            <p key={kills} className="flex flex-col gap-1 rounded-card bg-surface-2 px-3 py-2">
              <span className="label-dense text-ink-dim">
                {kills}K{kills === 5 ? '+' : ''}
              </span>
              <span className="numeric text-28 text-ink">{multiKillRounds[index]}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.clutches.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.clutches.note" />
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(['CT', 'T'] as const).map((side) => (
            <p
              key={side}
              className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
            >
              <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
              <span className="numeric text-28 text-ink">{clutchTotals[side]}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.utilityDamage.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.utilityDamage.note" />
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(['CT', 'T'] as const).map((side) => (
            <p
              key={side}
              className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
            >
              <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
              <span className="numeric text-28 text-ink">
                {numberFormat.format(utilityDamage[side])}
              </span>
            </p>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-3 rounded-card p-3">
        <header className="flex flex-col gap-1">
          <h3 className="font-ui font-medium text-20 leading-dense">
            <Text path="review.metrics.enemyBlindTime.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.metrics.enemyBlindTime.note" />
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(['CT', 'T'] as const).map((side) => (
            <p
              key={side}
              className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
            >
              <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
              <span className="numeric text-28 text-ink">
                {durationFormat.format(enemyBlindTime[side])}
              </span>
            </p>
          ))}
        </div>
      </section>

      <EconomyGaps steps={steps} />
    </section>
  );
}
