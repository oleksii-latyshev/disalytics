import { TACTIC_ROUNDS, type TacticRound, type TacticSide } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Search } from 'lucide-react';

interface TacticsFilterBarProps {
  readonly selectedMap: string;
  readonly selectedSide: TacticSide | 'ALL';
  readonly selectedRound: TacticRound | 'ALL';
  readonly searchQuery: string;
  readonly maps: readonly { readonly id: string; readonly count: number }[];
  readonly total: number;
  readonly onSelectRound: (round: TacticRound | 'ALL') => void;
  readonly onSelectMap: (map: string) => void;
  readonly onSelectSide: (side: TacticSide | 'ALL') => void;
  readonly onSearch: (query: string) => void;
}

const GROUP =
  'flex max-w-full items-center gap-1 overflow-x-auto rounded-card border border-line bg-surface-1 p-1';
const OPTION =
  'h-8 flex-none cursor-pointer rounded-chip px-3 font-mono text-12 whitespace-nowrap transition-colors';
const ON = 'bg-surface-3 text-ink';
const OFF = 'text-ink-dim hover:text-ink';

function sideTone(side: TacticSide | 'ALL', selected: boolean): string {
  if (selected) return ON;
  if (side === 'CT') return 'text-ct';
  if (side === 'T') return 'text-t';
  return OFF;
}

export function TacticsFilterBar({
  selectedMap,
  selectedSide,
  selectedRound,
  searchQuery,
  maps,
  total,
  onSelectRound,
  onSelectMap,
  onSelectSide,
  onSearch,
}: TacticsFilterBarProps) {
  const t = useT();

  const mapTabs = [{ id: 'all', count: total }, ...maps];

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div role="tablist" aria-label={t('library.tactics.library.mapFilter')} className={GROUP}>
        {mapTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedMap === tab.id}
            onClick={() => onSelectMap(tab.id)}
            className={`${OPTION} flex items-center gap-1.5 ${selectedMap === tab.id ? ON : OFF}`}
          >
            {tab.id === 'all' ? t('library.tactics.library.allMaps') : tab.id}
            <span className="text-11 text-ink-faint tabular-nums">{tab.count}</span>
          </button>
        ))}
      </div>

      <fieldset aria-label={t('library.tactics.library.sideFilter')} className={`m-0 ${GROUP}`}>
        {(['ALL', 'CT', 'T'] as const).map((side) => (
          <button
            key={side}
            type="button"
            aria-pressed={selectedSide === side}
            onClick={() => onSelectSide(side)}
            className={`${OPTION} ${sideTone(side, selectedSide === side)}`}
          >
            {side === 'ALL' ? t('library.tactics.library.allSides') : side}
          </button>
        ))}
      </fieldset>

      <fieldset aria-label={t('library.tactics.library.roundFilter')} className={`m-0 ${GROUP}`}>
        {(['ALL', ...TACTIC_ROUNDS] as const).map((round) => (
          <button
            key={round}
            type="button"
            aria-pressed={selectedRound === round}
            onClick={() => onSelectRound(round)}
            className={`${OPTION} ${selectedRound === round ? ON : OFF}`}
          >
            {round === 'ALL' ? t('library.tactics.library.anyRound') : round}
          </button>
        ))}
      </fieldset>

      <div className="relative flex min-w-48 flex-1 items-center sm:ms-auto sm:max-w-65 sm:flex-none sm:basis-65">
        <Search className="pointer-events-none absolute start-3 size-4 text-ink-faint" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('library.tactics.library.searchPlaceholder')}
          aria-label={t('library.tactics.library.searchLabel')}
          className="h-10 w-full rounded-card border border-line bg-surface-1 ps-9 pe-3 text-14 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
      </div>
    </div>
  );
}
