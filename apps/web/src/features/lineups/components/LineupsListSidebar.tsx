import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Input } from '@disa/ui';
import { Search } from 'lucide-react';
import type { InteractionMode } from '../hooks/use-lineup-selection';
import { LineupList } from './LineupList';

export function LineupsListSidebar({
  filteredLineups,
  hoveredIndex,
  selectedIndex,
  selectedIds,
  mergeTarget,
  mode,
  search,
  setSearch,
  setHoveredId,
  setSelectedId,
  setDetailLineup,
  handleToggleSelectId,
  handleMergeSelected,
  handleUnmergeSelected,
  handleDeleteSelected,
  handleClearSelection,
}: {
  readonly filteredLineups: readonly Lineup[];
  readonly hoveredIndex: number;
  readonly selectedIndex: number | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly mergeTarget: 'origin' | 'landing' | undefined;
  readonly mode: InteractionMode;
  readonly search: string;
  readonly setSearch: React.Dispatch<React.SetStateAction<string>>;
  readonly setHoveredId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setDetailLineup: React.Dispatch<React.SetStateAction<Lineup | null>>;
  readonly handleToggleSelectId: (id: string) => void;
  readonly handleMergeSelected: (() => void) | undefined;
  readonly handleUnmergeSelected: () => void;
  readonly handleDeleteSelected: () => void;
  readonly handleClearSelection: () => void;
}) {
  const t = useT();
  return (
    <aside
      aria-label={t('library.lineups.title')}
      className="surface-card z-10 flex min-w-0 flex-col gap-2.5 rounded-float p-3 lg:min-h-0 lg:overflow-hidden xl:absolute xl:inset-y-3 xl:right-3 xl:w-[21rem]"
    >
      <div className="flex items-center justify-between">
        <span className="font-ui text-13 font-medium text-ink">
          <Text path="library.lineups.title" />
        </span>
      </div>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-ink-dim" />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedId(null);
          }}
          aria-label={t('library.lineups.searchPlaceholder')}
          placeholder={t('library.lineups.searchPlaceholder')}
          className="h-8 pl-8 pr-2 text-12"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <LineupList
          lineups={filteredLineups}
          focused={hoveredIndex}
          selectedIndex={selectedIndex !== null && selectedIndex >= 0 ? selectedIndex : null}
          selectedIds={selectedIds}
          mergeTarget={mergeTarget}
          mode={mode}
          onHover={(index) => {
            setHoveredId(index === null ? null : (filteredLineups[index]?.id ?? null));
          }}
          onSelect={(index) => {
            const item = filteredLineups[index];
            if (item) {
              setSelectedId(item.id);
              setDetailLineup(item);
            }
          }}
          onToggleSelectId={handleToggleSelectId}
          onMergeSelected={mode === 'edit' ? handleMergeSelected : undefined}
          onUnmergeSelected={mode === 'edit' ? handleUnmergeSelected : undefined}
          onDeleteSelected={mode === 'edit' ? handleDeleteSelected : undefined}
          onClearSelection={handleClearSelection}
          onContextMenu={(_e, lineup) => {
            setSelectedId(lineup.id);
            setDetailLineup(lineup);
          }}
        />
      </div>
    </aside>
  );
}
