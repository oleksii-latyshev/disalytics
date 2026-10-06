import {
  type CarryWarning,
  type TacticLoadout,
  type TacticSide,
  UTILITY_NAMES,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import type { EditorPlayer } from '../helpers/editor-tactic';
import { GrenadeTally } from './GrenadeTally';

export interface TacticLoadoutPanelProps {
  readonly side: TacticSide;
  readonly loadout: TacticLoadout;
  readonly players: readonly EditorPlayer[];
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slot: number) => void;
  /** Below the desktop breakpoint the rail is one tab of two and shows only when it is the open one. */
  readonly isOpenOnPhone: boolean;
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

export function TacticLoadoutPanel({
  side,
  loadout,
  players,
  selectedSlot,
  onSelectSlot,
  isOpenOnPhone,
}: TacticLoadoutPanelProps) {
  const t = useT();
  const warnedSlots = new Set(loadout.warnings.map((warning) => warning.slot));

  return (
    <section
      aria-label={t('library.tactics.loadout.utility')}
      className={cn(
        'order-5 min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 pb-20 text-ink lg:order-none lg:col-start-1 lg:row-start-2 lg:flex lg:flex-none lg:pr-0 lg:pb-3',
        isOpenOnPhone ? 'flex' : 'hidden',
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-1 font-mono text-11 uppercase tracking-[0.12em]">
        <span className={side === 'CT' ? 'text-ct' : 'text-t'}>
          {t('library.tactics.loadout.rail', { side, count: loadout.players.length })}
        </span>
        <span className="text-ink-dim">
          {t('library.tactics.loadout.utility')}{' '}
          <span className="text-ink tabular-nums">
            {t('library.tactics.loadout.cost', { amount: loadout.teamCost })}
          </span>
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {loadout.players.map((player) => {
          const label = players.find((entry) => entry.slot === player.slot)?.label?.trim();
          const role = label === undefined || label === '' ? undefined : label;
          const isSelected = player.slot === selectedSlot;
          return (
            <li key={player.slot}>
              <button
                type="button"
                onClick={() => onSelectSlot(player.slot)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-line-strong bg-surface-2'
                    : 'border-line bg-surface-1 hover:bg-hover',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full font-mono text-12 font-semibold text-surface-0',
                    side === 'CT' ? 'bg-ct' : 'bg-t',
                  )}
                >
                  {player.slot + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-14 font-semibold">
                    {role ?? t('library.tactics.loadout.player', { slot: player.slot + 1 })}
                  </span>
                  {player.total > 0 ? (
                    <GrenadeTally counts={player.counts} />
                  ) : (
                    <span className="text-12 text-ink-dim">
                      {t('library.tactics.loadout.noUtility')}
                    </span>
                  )}
                  {player.drops.map((drop) => (
                    <span
                      key={`${drop.toSlot}-${drop.kind}`}
                      className="truncate text-11 text-ink-dim"
                    >
                      {t('library.tactics.loadout.drops', {
                        count: drop.count,
                        kind: t(`library.tactics.tools.utilityKinds.${drop.kind}`),
                        slot: drop.toSlot + 1,
                      })}
                    </span>
                  ))}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-12 tabular-nums',
                    warnedSlots.has(player.slot) ? 'text-damage' : 'text-ink-dim',
                  )}
                >
                  {player.total > 0
                    ? t('library.tactics.loadout.cost', { amount: player.cost })
                    : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {loadout.teamTotal === 0 && (
        <p className="px-1 text-12 text-ink-dim leading-prose">
          {t('library.tactics.loadout.empty')}
        </p>
      )}

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
