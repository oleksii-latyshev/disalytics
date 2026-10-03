import type { TacticSide } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import { Search } from 'lucide-react';

interface TacticsFilterBarProps {
  readonly selectedMap: string;
  readonly selectedSide: TacticSide | 'ALL';
  readonly searchQuery: string;
  readonly onSelectMap: (map: string) => void;
  readonly onSelectSide: (side: TacticSide | 'ALL') => void;
  readonly onSearch: (query: string) => void;
}

export function TacticsFilterBar({
  selectedMap,
  selectedSide,
  searchQuery,
  onSelectMap,
  onSelectSide,
  onSearch,
}: TacticsFilterBarProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-2 p-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Map Selector */}
        <div
          role="tablist"
          className="flex flex-wrap items-center gap-1 rounded-card bg-surface-1 p-1"
        >
          <button
            type="button"
            onClick={() => onSelectMap('all')}
            className={`h-7 rounded-chip px-2.5 font-ui text-11 font-medium transition-colors ${
              selectedMap === 'all'
                ? 'bg-surface-0 text-ink shadow-xs'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            {t('library.tactics.library.allMaps')}
          </button>

          {MAP_IDS.map((mapId) => (
            <button
              key={mapId}
              type="button"
              onClick={() => onSelectMap(mapId)}
              className={`h-7 rounded-chip px-2.5 font-ui text-11 font-medium transition-colors ${
                selectedMap === mapId
                  ? 'bg-surface-0 text-ink shadow-xs'
                  : 'text-ink-dim hover:text-ink'
              }`}
            >
              {mapId}
            </button>
          ))}
        </div>

        {/* Side Selector */}
        <fieldset
          aria-label={t('library.tactics.library.allSides')}
          className="m-0 flex items-center gap-1 rounded-chip border-none bg-surface-1 p-0.5"
        >
          {(['ALL', 'CT', 'T'] as const).map((sideOption) => (
            <button
              key={sideOption}
              type="button"
              onClick={() => onSelectSide(sideOption)}
              className={`h-7 rounded-chip px-2.5 font-mono text-11 font-medium transition-colors ${
                selectedSide === sideOption
                  ? 'bg-surface-3 text-ink'
                  : 'text-ink-dim hover:text-ink'
              }`}
            >
              {sideOption === 'ALL' ? t('library.tactics.library.allSides') : sideOption}
            </button>
          ))}
        </fieldset>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center min-w-[200px] flex-1 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-faint" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('library.tactics.library.searchPlaceholder')}
          aria-label={t('library.tactics.library.searchPlaceholder')}
          className="h-8 w-full rounded-chip border border-line bg-surface-1 pl-8 pr-3 text-xs text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
        />
      </div>
    </div>
  );
}
