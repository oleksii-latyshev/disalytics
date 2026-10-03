import type { CarryWarning, TacticLoadout, TacticPlayerPosition } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { GrenadeTally } from './GrenadeTally';

export interface TacticLoadoutPanelProps {
  readonly loadout: TacticLoadout;
  readonly players: readonly TacticPlayerPosition[];
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slot: number) => void;
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
  loadout,
  players,
  selectedSlot,
  onSelectSlot,
}: TacticLoadoutPanelProps) {
  const t = useT();
  const warnedSlots = new Set(loadout.warnings.map((warning) => warning.slot));

  return (
    <section
      aria-label={t('library.tactics.loadout.title')}
      className="flex min-h-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-3 text-ink"
    >
      <h3 className="font-ui text-13 font-semibold">{t('library.tactics.loadout.title')}</h3>

      <ul className="flex flex-col gap-1">
        {loadout.players.map((player) => {
          const label = players.find((entry) => entry.slot === player.slot)?.label;
          const isSelected = player.slot === selectedSlot;
          return (
            <li key={player.slot}>
              <button
                type="button"
                onClick={() => onSelectSlot(player.slot)}
                aria-pressed={isSelected}
                className={`flex w-full items-center justify-between gap-2 rounded-chip px-2 py-1.5 text-left transition-colors ${
                  isSelected ? 'bg-surface-3' : 'hover:bg-hover'
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-12 font-medium">
                    {t('library.tactics.loadout.player', { slot: player.slot + 1 })}
                  </span>
                  {label !== undefined && label !== '' && (
                    <span className="truncate text-11 text-ink-dim">{label}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <GrenadeTally counts={player.counts} />
                  {player.total > 0 && (
                    <span
                      className={`font-mono text-12 tabular-nums ${
                        warnedSlots.has(player.slot) ? 'text-damage' : 'text-ink-dim'
                      }`}
                    >
                      {t('library.tactics.loadout.cost', { amount: player.cost })}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {loadout.teamTotal === 0 ? (
        <p className="text-12 text-ink-dim leading-prose">{t('library.tactics.loadout.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2 [border-block-start:1px_solid_var(--color-line)] pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-12 text-ink-dim">{t('library.tactics.loadout.total')}</span>
            <span className="font-mono text-13 font-semibold tabular-nums">
              {t('library.tactics.loadout.cost', { amount: loadout.teamCost })}
            </span>
          </div>
          <GrenadeTally counts={loadout.teamCounts} />
        </div>
      )}

      {loadout.warnings.length > 0 && (
        <ul role="status" className="flex flex-col gap-1 text-12 text-damage leading-prose">
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
