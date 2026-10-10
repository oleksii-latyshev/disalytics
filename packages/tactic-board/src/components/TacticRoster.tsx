import {
  type CarryWarning,
  type GrenadeCounts,
  type TacticLoadout,
  type TacticSide,
  type TacticStep,
  UTILITY_NAMES,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { slotVar } from '../helpers/tactic-colors';
import type { StepSchedule } from '../helpers/tactic-schedule';
import { stepGrenadeCounts } from '../helpers/tactic-step-counts';
import { GrenadeTally } from './GrenadeTally';

export interface TacticRosterProps {
  readonly side: TacticSide;
  readonly loadout: TacticLoadout;
  readonly weapons: Readonly<Record<number, string>> | undefined;
  readonly step: TacticStep | undefined;
  readonly stepIndex: number;
  readonly stepSchedule: StepSchedule | undefined;
  readonly selectedSlot: number | null;
  readonly onSelect: (slot: number) => void;
}

function WarningLine({ warning }: { readonly warning: CarryWarning }) {
  const t = useT();
  const slot = warning.slot + 1;
  switch (warning.code) {
    case 'flashLimit':
      return <>{t('library.tactics.loadout.warn.flashLimit', { slot, count: warning.count })}</>;
    case 'kindLimit':
      return (
        <>
          {t('library.tactics.loadout.warn.kindLimit', {
            slot,
            count: warning.count,
            kind: UTILITY_NAMES[warning.kind],
          })}
        </>
      );
    case 'totalLimit':
      return <>{t('library.tactics.loadout.warn.totalLimit', { slot, count: warning.count })}</>;
  }
}

/** What a roster row carries: the gun the tactic names, if any, and the step's grenades. */
function RowLoadout({
  weapon,
  counts,
}: {
  readonly weapon: string | undefined;
  readonly counts: GrenadeCounts;
}) {
  const hasGrenades = Object.values(counts).some((count) => count > 0);
  return (
    <>
      {weapon !== undefined && (
        <span className="shrink-0 font-mono text-12 text-ink">{weapon}</span>
      )}
      {hasGrenades && <GrenadeTally counts={counts} />}
    </>
  );
}

/** The five players of the step: their number, role, task and grenades, and who is picked. */
export function TacticRoster({
  side,
  loadout,
  weapons,
  step,
  stepIndex,
  stepSchedule,
  selectedSlot,
  onSelect,
}: TacticRosterProps) {
  const t = useT();

  return (
    <section
      aria-label={t('library.tactics.board.roster.title', { index: stepIndex + 1 })}
      className="flex min-h-0 flex-col gap-2 overflow-y-auto p-3 lg:pr-0"
    >
      <div className="flex items-baseline justify-between gap-2 px-1 font-mono text-11 uppercase tracking-[0.12em]">
        <span className={side === 'CT' ? 'text-ct' : 'text-t'}>
          {t('library.tactics.board.roster.title', { index: stepIndex + 1 })}
        </span>
        <span className="text-ink-dim">
          {t('library.tactics.board.roster.buy')}{' '}
          <span className="text-ink tabular-nums">
            {t('library.tactics.loadout.cost', { amount: loadout.teamCost })}
          </span>
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {stepSchedule?.legs.map((leg) => {
          const entry = step?.players.find((player) => player.slot === leg.slot);
          const label = entry?.label?.trim();
          const isSelected = leg.slot === selectedSlot;
          const task = entry?.task?.trim();
          return (
            <li key={leg.slot}>
              <button
                type="button"
                onClick={() => onSelect(leg.slot)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border p-2.5 text-left transition-colors',
                  isSelected
                    ? 'border-line-strong bg-surface-2'
                    : 'border-line bg-surface-1 hover:bg-hover',
                  leg.isDead && 'opacity-60',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full font-mono text-12 font-semibold text-surface-0',
                    leg.isDead && 'bg-ink-faint',
                  )}
                  style={leg.isDead ? undefined : { background: slotVar(leg.slot) }}
                >
                  {leg.isDead ? '✕' : leg.slot + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-14 font-semibold">
                    {label !== undefined && label !== ''
                      ? label
                      : t('library.tactics.board.roster.player', { slot: leg.slot + 1 })}
                  </span>
                  <span className="line-clamp-2 text-12 text-ink-dim leading-dense">
                    {leg.isDead
                      ? t('library.tactics.board.roster.dead')
                      : task || t('library.tactics.board.roster.stands')}
                  </span>
                </span>
                <RowLoadout
                  weapon={weapons?.[leg.slot]}
                  counts={stepGrenadeCounts(step, leg.slot)}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {loadout.warnings.length > 0 && (
        <ul role="status" className="flex flex-col gap-1 px-1 text-12 text-damage leading-prose">
          {loadout.warnings.map((warning) => (
            <li key={`${warning.code}-${warning.slot}-${'kind' in warning ? warning.kind : ''}`}>
              <WarningLine warning={warning} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
