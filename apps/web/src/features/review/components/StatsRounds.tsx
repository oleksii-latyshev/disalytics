import {
  hasBlindEvents,
  matchClutches,
  matchEnemyBlindTime,
  matchUtilityDamage,
  multiKills,
  openingDuels,
  type ParsedDemo,
  type Team,
  tradeKills,
} from '@disa/demo-core';
import { Text, type TranslationKey, useLocale, useT } from '@disa/i18n';
import { type ReactNode, useMemo } from 'react';
import { EconomyGaps, economySteps } from '@/features/timeline';

const CENTRE = 50;
const REACH = 42;
const MULTI_KILL_COUNTS = [2, 3, 4, 5] as const;
const SIDES = ['CT', 'T'] as const;

interface FigureCardProps {
  titlePath: TranslationKey;
  notePath: TranslationKey;
  columns: 'grid-cols-2' | 'grid-cols-4';
  children: ReactNode;
}

/** One reading of the match, titled and explained, over the figures that answer it. */
function FigureCard({ titlePath, notePath, columns, children }: FigureCardProps) {
  return (
    <section className="surface-card flex flex-col gap-3 rounded-card p-3">
      <header className="flex flex-col gap-1">
        <h3 className="font-ui font-medium text-20 leading-dense">
          <Text path={titlePath} />
        </h3>
        <p className="text-12 text-ink-dim leading-prose">
          <Text path={notePath} />
        </p>
      </header>

      <div className={`grid ${columns} gap-2`}>{children}</div>
    </section>
  );
}

/** A figure for each side, which is how every team-level reading here is stated. */
function SideFigures({ figures }: { figures: Record<Team, ReactNode> }) {
  return SIDES.map((side) => (
    <p
      key={side}
      className="flex items-baseline justify-between gap-3 rounded-card bg-surface-2 px-3 py-2"
    >
      <span className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</span>
      <span className="numeric text-28 text-ink">{figures[side]}</span>
    </p>
  ));
}

function countBySide<T extends { side: Team }>(items: readonly T[]): Record<Team, number> {
  const totals: Record<Team, number> = { CT: 0, T: 0 };
  for (const item of items) totals[item.side] += 1;
  return totals;
}

/** The Rounds & economy tab: the economy across the match, then the team-level readings. */
export function StatsRounds({ demo }: { demo: ParsedDemo }) {
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
  const openingWins = useMemo(
    () =>
      countBySide(
        openingDuels(demo).flatMap((duel) =>
          duel.attackerSide === undefined ? [] : [{ side: duel.attackerSide }],
        ),
      ),
    [demo],
  );
  const multiKillRounds = useMemo(() => {
    const rounds = [0, 0, 0, 0];
    for (const multiKill of multiKills(demo)) {
      const index = Math.min(multiKill.kills, 5) - 2;
      rounds[index] = (rounds[index] ?? 0) + 1;
    }
    return rounds;
  }, [demo]);
  const tradeKillTotals = useMemo(() => countBySide(tradeKills(demo)), [demo]);
  const clutchTotals = useMemo(() => countBySide(matchClutches(demo)), [demo]);
  const utilityDamage = useMemo(() => matchUtilityDamage(demo), [demo]);
  const enemyBlindTime = useMemo(() => matchEnemyBlindTime(demo), [demo]);
  const hasFlashData = useMemo(() => hasBlindEvents(demo), [demo]);

  if (steps.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center text-13 text-ink-dim">
        <Text path="review.metrics.empty" />
      </div>
    );
  }

  const last = steps.at(-1);
  const unknownFigure = (
    <span title={t('review.stats.unknown')}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t('review.stats.unknown')}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-ink-dim">
        <Text path="timeline.economy.label" />
      </p>

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

      <FigureCard
        titlePath="review.metrics.opening.title"
        notePath="review.metrics.opening.note"
        columns="grid-cols-2"
      >
        <SideFigures figures={openingWins} />
      </FigureCard>

      <FigureCard
        titlePath="review.metrics.trades.title"
        notePath="review.metrics.trades.note"
        columns="grid-cols-2"
      >
        <SideFigures figures={tradeKillTotals} />
      </FigureCard>

      <FigureCard
        titlePath="review.metrics.multi.title"
        notePath="review.metrics.multi.note"
        columns="grid-cols-4"
      >
        {MULTI_KILL_COUNTS.map((kills, index) => (
          <p key={kills} className="flex flex-col gap-1 rounded-card bg-surface-2 px-3 py-2">
            <span className="label-dense text-ink-dim">
              {kills}K{kills === 5 ? '+' : ''}
            </span>
            <span className="numeric text-28 text-ink">{multiKillRounds[index]}</span>
          </p>
        ))}
      </FigureCard>

      <FigureCard
        titlePath="review.metrics.clutches.title"
        notePath="review.metrics.clutches.note"
        columns="grid-cols-2"
      >
        <SideFigures figures={clutchTotals} />
      </FigureCard>

      <FigureCard
        titlePath="review.metrics.utilityDamage.title"
        notePath="review.metrics.utilityDamage.note"
        columns="grid-cols-2"
      >
        <SideFigures
          figures={{
            CT: numberFormat.format(utilityDamage.CT),
            T: numberFormat.format(utilityDamage.T),
          }}
        />
      </FigureCard>

      <FigureCard
        titlePath="review.metrics.enemyBlindTime.title"
        notePath="review.metrics.enemyBlindTime.note"
        columns="grid-cols-2"
      >
        <SideFigures
          figures={
            hasFlashData
              ? {
                  CT: durationFormat.format(enemyBlindTime.CT),
                  T: durationFormat.format(enemyBlindTime.T),
                }
              : { CT: unknownFigure, T: unknownFigure }
          }
        />
        {!hasFlashData && (
          <p className="col-span-2 text-12 text-ink-dim leading-prose">
            <Text path="review.stats.noFlashEvents" />
          </p>
        )}
      </FigureCard>

      <EconomyGaps steps={steps} />
    </div>
  );
}
