import type { EnemyRoundEstimate } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { ASSUMPTION_PATHS } from '../constants/economy';

type Props = {
  latest: EnemyRoundEstimate | undefined;
  money: Intl.NumberFormat;
  approximateMoney: string | null;
};

export function EconomyOutputPanel({ latest, money, approximateMoney }: Props) {
  return (
    <div className="rounded-card border border-line bg-surface-1 p-5 sm:p-6">
      <p className="text-11 tracking-[0.12em] text-ink-dim uppercase">
        <Text path="library.tools.economy.outputEyebrow" />
      </p>
      {latest === undefined ? (
        <div className="py-8">
          <h4 className="text-20 font-medium">
            <Text path="library.tools.economy.emptyTitle" />
          </h4>
          <p className="mt-2 text-13 text-ink-dim leading-prose">
            <Text path="library.tools.economy.emptyHint" />
          </p>
        </div>
      ) : (
        <div aria-live="polite">
          <h4 className="mt-3 text-20 font-medium">
            <Text path="library.tools.economy.nextRound" values={{ round: latest.round + 1 }} />
          </h4>
          <p className="mt-5 text-12 text-ink-dim">
            <Text path="library.tools.economy.estimatedBank" />
          </p>
          <div className="numeric mt-1 text-[clamp(27px,3vw,40px)] font-medium tracking-[-0.055em]">
            ≈{approximateMoney}
          </div>
          <p className="mt-1 text-12 text-ink-dim">
            <Text path="library.tools.economy.perPlayer" />
          </p>
          <p className="mt-2 text-12 text-ink-dim">
            <Text path="library.tools.economy.exactUnknown" />
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 [border-block-start:1px_solid_var(--color-line)] pt-4">
            <div>
              <p className="text-11 text-ink-dim">
                <Text path="library.tools.economy.roundIncome" />
              </p>
              <p className="numeric mt-1 text-16">{money.format(latest.roundRewardPerPlayer)}</p>
            </div>
            <div>
              <p className="text-11 text-ink-dim">
                <Text path="library.tools.economy.observedSpend" />
              </p>
              <p className="numeric mt-1 text-16">
                ≈{money.format(Math.round(latest.estimatedNewWeaponSpend / 100) * 100)}
              </p>
            </div>
          </div>
          <p className="mt-5 text-12 text-ink-dim leading-prose">
            <Text path="library.tools.economy.modelNote" />
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-11 text-ink-dim leading-prose">
            {latest.assumptions.map((assumption) => (
              <li key={assumption}>
                <Text path={ASSUMPTION_PATHS[assumption]} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
