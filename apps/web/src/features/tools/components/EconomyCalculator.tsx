import {
  calculateNextRoundEconomy,
  LOSS_BONUS_LADDER,
  type PreviousBuyType,
  type RoundEndReason,
  type Team,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { Switch } from '@disa/ui';
import { useMemo, useState } from 'react';

const LOSS_STREAKS = [0, 1, 2, 3, 4] as const;

export function EconomyCalculator() {
  const t = useT();
  const locale = useLocale();
  const moneyFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const [team, setTeam] = useState<Team>('T');
  const [result, setResult] = useState<'won' | 'lost'>('lost');
  const [reason, setReason] = useState<RoundEndReason>('elimination');
  const [lossStreak, setLossStreak] = useState<number>(1);
  const [bombPlantedOnLoss, setBombPlantedOnLoss] = useState(false);
  const [survivedTWithoutPlant, setSurvivedTWithoutPlant] = useState(false);
  const [previousBuy, setPreviousBuy] = useState<PreviousBuyType>('full');

  const [rifles, setRifles] = useState(0);
  const [smgs, setSmgs] = useState(0);
  const [shotguns, setShotguns] = useState(0);
  const [snipers, setSnipers] = useState(0);
  const [knife, setKnife] = useState(0);

  const estimate = useMemo(
    () =>
      calculateNextRoundEconomy({
        team,
        result,
        reason,
        lossStreak,
        bombPlantedOnLoss,
        survivedTWithoutPlant,
        previousBuy,
        kills: {
          rifles,
          smgs,
          shotguns,
          snipers,
          knife,
        },
      }),
    [
      team,
      result,
      reason,
      lossStreak,
      bombPlantedOnLoss,
      survivedTWithoutPlant,
      previousBuy,
      rifles,
      smgs,
      shotguns,
      snipers,
      knife,
    ],
  );

  const availableReasons = useMemo<readonly RoundEndReason[]>(() => {
    if (result === 'lost') return ['elimination', 'time-expired'];
    if (team === 'CT') return ['elimination', 'bomb-defused', 'time-expired'];
    return ['elimination', 'bomb-exploded'];
  }, [result, team]);

  const handleTeamChange = (newTeam: Team) => {
    setTeam(newTeam);
    if (result === 'won' && newTeam === 'CT' && reason === 'bomb-exploded') {
      setReason('elimination');
    } else if (result === 'won' && newTeam === 'T' && reason === 'bomb-defused') {
      setReason('elimination');
    }
  };

  const handleResultChange = (newResult: 'won' | 'lost') => {
    setResult(newResult);
    setReason('elimination');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Inputs panel */}
        <div className="surface-card flex flex-col gap-5 rounded-card p-4">
          {/* Team and Result row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-1.5 border-0 p-0">
              <legend className="label-dense text-ink-dim">
                <Text path="library.tools.economy.team" />
              </legend>
              <div className="grid grid-cols-2 gap-1 rounded-card bg-surface-2 p-1">
                {(['CT', 'T'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => handleTeamChange(side)}
                    className={`h-8 rounded-card font-ui text-13 font-medium transition-colors ${
                      team === side
                        ? side === 'CT'
                          ? 'bg-surface-0 text-ct shadow-xs'
                          : 'bg-surface-0 text-t shadow-xs'
                        : 'text-ink-dim hover:text-ink'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1.5 border-0 p-0">
              <legend className="label-dense text-ink-dim">
                <Text path="library.tools.economy.result" />
              </legend>
              <div className="grid grid-cols-2 gap-1 rounded-card bg-surface-2 p-1">
                {(['won', 'lost'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleResultChange(r)}
                    className={`h-8 rounded-card font-ui text-13 font-medium transition-colors ${
                      result === r
                        ? 'bg-surface-0 text-ink shadow-xs'
                        : 'text-ink-dim hover:text-ink'
                    }`}
                  >
                    <Text
                      path={
                        r === 'won' ? 'library.tools.economy.won' : 'library.tools.economy.lost'
                      }
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Win / Loss condition */}
          {result === 'won' ? (
            <fieldset className="flex flex-col gap-1.5 border-0 p-0">
              <legend className="label-dense text-ink-dim">
                <Text path="library.tools.economy.reason" />
              </legend>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {availableReasons.map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setReason(res)}
                    className={`h-8 rounded-card px-2 font-ui text-12 font-medium transition-colors ${
                      reason === res
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-surface-2 text-ink-dim hover:bg-surface-3 hover:text-ink'
                    }`}
                  >
                    {res === 'elimination' && <Text path="library.tools.economy.elimination" />}
                    {res === 'bomb-defused' && <Text path="library.tools.economy.bombDefused" />}
                    {res === 'bomb-exploded' && <Text path="library.tools.economy.bombExploded" />}
                    {res === 'time-expired' && <Text path="library.tools.economy.timeExpired" />}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-1.5 border-0 p-0">
                <legend className="label-dense text-ink-dim">
                  <Text path="library.tools.economy.lossStreak" />
                </legend>
                <div className="grid grid-cols-5 gap-1">
                  {LOSS_STREAKS.map((streak) => (
                    <button
                      key={streak}
                      type="button"
                      onClick={() => setLossStreak(streak)}
                      className={`flex flex-col items-center justify-center rounded-card py-1.5 transition-colors ${
                        lossStreak === streak
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-surface-2 text-ink-dim hover:bg-surface-3 hover:text-ink'
                      }`}
                    >
                      <span className="font-ui text-12 font-medium">
                        {streak}
                        {streak === 4 ? '+' : ''}
                      </span>
                      <span className="numeric text-10 text-ink-dim">
                        ${(LOSS_BONUS_LADDER[streak] ?? 1400) / 1000}k
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {team === 'T' && (
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-6">
                  <label
                    htmlFor="economy-bomb-planted"
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <Switch
                      id="economy-bomb-planted"
                      checked={bombPlantedOnLoss}
                      onChange={(e) => setBombPlantedOnLoss(e.target.checked)}
                      aria-label={t('library.tools.economy.bombPlanted')}
                    />
                    <span className="text-13 text-ink">
                      <Text path="library.tools.economy.bombPlanted" />{' '}
                      <span className="label-dense text-t">(+$800)</span>
                    </span>
                  </label>

                  <label
                    htmlFor="economy-survived-save"
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <Switch
                      id="economy-survived-save"
                      checked={survivedTWithoutPlant}
                      onChange={(e) => setSurvivedTWithoutPlant(e.target.checked)}
                      aria-label={t('library.tools.economy.survivedSave')}
                    />
                    <span className="text-13 text-ink">
                      <Text path="library.tools.economy.survivedSave" />{' '}
                      <span className="label-dense text-ink-dim">($0)</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Previous round buy level */}
          <fieldset className="flex flex-col gap-1.5 border-0 p-0">
            <legend className="label-dense text-ink-dim">
              <Text path="library.tools.economy.previousBuy" />
            </legend>
            <div className="grid grid-cols-3 gap-1 rounded-card bg-surface-2 p-1">
              {(['full', 'force', 'eco'] as const).map((buy) => (
                <button
                  key={buy}
                  type="button"
                  onClick={() => setPreviousBuy(buy)}
                  className={`h-8 rounded-card font-ui text-12 font-medium transition-colors ${
                    previousBuy === buy
                      ? 'bg-surface-0 text-ink shadow-xs'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {buy === 'full' && <Text path="library.tools.economy.buyFull" />}
                  {buy === 'force' && <Text path="library.tools.economy.buyForce" />}
                  {buy === 'eco' && <Text path="library.tools.economy.buyEco" />}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Kill counters */}
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="label-dense text-ink-dim">
              <Text path="library.tools.economy.kills" />
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: 'rifles', value: rifles, set: setRifles },
                { label: 'smgs', value: smgs, set: setSmgs },
                { label: 'shotguns', value: shotguns, set: setShotguns },
                { label: 'snipers', value: snipers, set: setSnipers },
                { label: 'knife', value: knife, set: setKnife },
              ].map((k) => (
                <div
                  key={k.label}
                  className="flex items-center justify-between rounded-card bg-surface-2 px-2.5 py-1.5 text-12"
                >
                  <div className="flex flex-col">
                    <span className="font-ui text-12 text-ink">
                      {k.label === 'rifles' && <Text path="library.tools.economy.rifles" />}
                      {k.label === 'smgs' && <Text path="library.tools.economy.smgs" />}
                      {k.label === 'shotguns' && <Text path="library.tools.economy.shotguns" />}
                      {k.label === 'snipers' && <Text path="library.tools.economy.snipers" />}
                      {k.label === 'knife' && <Text path="library.tools.economy.knife" />}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={k.value <= 0}
                      onClick={() => k.set(Math.max(0, k.value - 1))}
                      className="flex size-6 items-center justify-center rounded-chip bg-surface-3 text-ink transition-colors disabled:pointer-events-none disabled:opacity-50"
                      aria-label={t('library.tools.economy.decrease')}
                    >
                      −
                    </button>
                    <span className="numeric w-4 text-center text-13 font-medium text-ink">
                      {k.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => k.set(k.value + 1)}
                      className="flex size-6 items-center justify-center rounded-chip bg-surface-3 text-ink transition-colors"
                      aria-label={t('library.tools.economy.increase')}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4">
          <div className="surface-card flex flex-col gap-4 rounded-card p-5">
            <header className="flex items-center justify-between">
              <span className="label-dense text-ink-dim">
                <Text path="library.tools.economy.output.call" />
              </span>
              <span
                className={`label-dense rounded-full px-2.5 py-0.5 font-medium ${
                  estimate.buyCall === 'full'
                    ? 'bg-primary text-primary-foreground'
                    : estimate.buyCall === 'force'
                      ? 'border border-line-strong bg-surface-2 text-ink'
                      : 'border border-line bg-surface-2 text-ink-dim'
                }`}
              >
                {estimate.buyCall.toUpperCase()}
              </span>
            </header>

            <div className="flex flex-col gap-1">
              <span className="text-12 text-ink-dim">
                <Text path="library.tools.economy.output.estimatedBank" />
              </span>
              <span className="numeric font-medium text-28 text-ink">
                {moneyFormat.format(estimate.estimatedNextRoundPerPlayer)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 [border-block-start:1px_solid_var(--color-line)] pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-11 text-ink-dim">
                  <Text path="library.tools.economy.output.teamTotal" />
                </span>
                <span className="numeric text-16 font-medium text-ink">
                  {moneyFormat.format(estimate.estimatedNextRoundTeamTotal)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-11 text-ink-dim">
                  <Text path="library.tools.economy.output.roundReward" />
                </span>
                <span className="numeric text-16 font-medium text-ink">
                  {moneyFormat.format(estimate.roundRewardPerPlayer)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 [border-block-start:1px_solid_var(--color-line)] pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-11 text-ink-dim">
                  <Text path="library.tools.economy.output.leftover" />
                </span>
                <span className="numeric text-14 text-ink-dim">
                  ~{moneyFormat.format(estimate.estimatedRemainingBank)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-11 text-ink-dim">
                  <Text path="library.tools.economy.output.killRewards" />
                </span>
                <span className="numeric text-14 text-ink-dim">
                  +{moneyFormat.format(estimate.killRewardsTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
