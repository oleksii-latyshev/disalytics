import {
  BUY_SCALE,
  buyBandFractions,
  classifyBuyRange,
  type EnemyRoundEstimate,
} from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { ASSUMPTION_PATHS, VERDICT_PATHS } from '../constants/economy';

type Props = {
  latest: EnemyRoundEstimate | undefined;
  money: Intl.NumberFormat;
  approximateMoney: string | null;
};

const ZONES = [
  { path: 'library.tools.economy.scale.eco', grow: BUY_SCALE.force, shade: 'bg-surface-2' },
  {
    path: 'library.tools.economy.scale.force',
    grow: BUY_SCALE.full - BUY_SCALE.force,
    shade: 'bg-surface-3',
  },
  {
    path: 'library.tools.economy.scale.full',
    grow: BUY_SCALE.max - BUY_SCALE.full,
    shade: 'bg-selected',
  },
] as const;

const TICKS = [0, BUY_SCALE.force, BUY_SCALE.full, BUY_SCALE.max] as const;

export function EconomyOutputPanel({ latest, money, approximateMoney }: Props) {
  return (
    <section
      aria-live="polite"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-line-strong bg-surface-1 p-4 sm:p-5"
    >
      {latest === undefined ? (
        <div className="py-6">
          <h3 className="text-20 font-semibold">
            <Text path="library.tools.economy.emptyTitle" />
          </h3>
          <p className="mt-2 text-13 text-ink-dim leading-prose">
            <Text path="library.tools.economy.emptyHint" />
          </p>
        </div>
      ) : (
        <Verdict latest={latest} money={money} approximateMoney={approximateMoney} />
      )}
    </section>
  );
}

function Verdict({
  latest,
  money,
  approximateMoney,
}: {
  latest: EnemyRoundEstimate;
  money: Intl.NumberFormat;
  approximateMoney: string | null;
}) {
  const floor = latest.estimatedNextCashFloorPerPlayer;
  const ceiling = latest.estimatedNextCashPerPlayer;
  const verdict = classifyBuyRange(floor, ceiling);
  const band = buyBandFractions(floor, ceiling);

  return (
    <>
      <p className="text-11 tracking-[0.14em] text-ink-dim uppercase">
        <Text path="library.tools.economy.nextRound" values={{ round: latest.round + 1 }} />
      </p>
      <p className="text-[clamp(26px,3vw,34px)] font-bold leading-[1.05] tracking-[-0.02em]">
        <Text path={VERDICT_PATHS[verdict]} />
      </p>
      <p className="numeric font-medium text-[clamp(17px,2vw,20px)]">
        {approximateMoney}
        <span className="ml-1 font-normal text-13 text-ink-dim">
          <Text path="library.tools.economy.perPlayer" />
        </span>
      </p>

      <div className="flex flex-col gap-1.5">
        <div
          role="img"
          aria-label={approximateMoney ?? undefined}
          className="relative flex h-[26px] overflow-hidden rounded-chip sm:h-[34px]"
        >
          {ZONES.map((zone) => (
            <span
              key={zone.path}
              style={{ flexGrow: zone.grow }}
              className={`flex basis-0 items-end px-1.5 py-1 text-11 text-ink-dim ${zone.shade}`}
            >
              <Text path={zone.path} />
            </span>
          ))}
          <span
            aria-hidden="true"
            style={{
              left: `${band.start * 100}%`,
              width: `${(band.end - band.start) * 100}%`,
            }}
            className="absolute inset-y-1 rounded-chip border-2 border-ink bg-selected"
          />
        </div>
        <div className="numeric flex justify-between text-11 text-ink-dim" aria-hidden="true">
          {TICKS.map((tick) => (
            <span key={tick}>{money.format(tick)}</span>
          ))}
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-14">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-dim">
            <Text path="library.tools.economy.roundIncome" />
          </dt>
          <dd className="numeric">{money.format(latest.roundRewardPerPlayer)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-dim">
            <Text path="library.tools.economy.observedSpend" />
          </dt>
          <dd className="numeric">
            {money.format(Math.round(latest.estimatedNewWeaponSpend / 100) * 100)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-dim">
            <Text path="library.tools.economy.lossStreak" />
          </dt>
          <dd className="numeric">
            {latest.lossStreak > 0 ? (
              <Text
                path="library.tools.economy.streakRounds"
                values={{ count: latest.lossStreak }}
              />
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <details className="[border-block-start:1px_solid_var(--color-line)] pt-3">
        <summary className="min-h-10 cursor-pointer text-13 text-ink-dim hover:text-ink">
          <Text
            path="library.tools.economy.assumptionCount"
            values={{ count: latest.assumptions.length }}
          />
        </summary>
        <p className="mt-2 text-12 text-ink-dim leading-prose">
          <Text path="library.tools.economy.modelNote" />
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-13 text-ink-dim leading-prose">
          {latest.assumptions.map((assumption) => (
            <li key={assumption}>
              <Text path={ASSUMPTION_PATHS[assumption]} />
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
