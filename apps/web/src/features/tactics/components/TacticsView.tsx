import type { Tactic, TacticRound, TacticSide } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import { createNewTactic, nameOrFallback } from '@disa/tactic-board';
import { Button } from '@disa/ui';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { saveDownload } from '../helpers/save-download';
import { copiedTactic } from '../helpers/tactic-copy';
import { tacticDownload } from '../helpers/tactic-transfer';
import { countByMap, filterTactics } from '../helpers/tactics-filter';
import { useTactics } from '../hooks/use-tactics';
import { SharedTacticBanner } from './SharedTacticBanner';
import { TacticCard } from './TacticCard';
import { TacticEditorScreen } from './TacticEditorScreen';
import { TacticsFilterBar } from './TacticsFilterBar';
import { TacticTransferDialog } from './TacticTransferDialog';

const DEFAULT_NEW_TACTIC_MAP = 'de_mirage';

export interface TacticsViewProps {
  readonly initialTactic?: Tactic | null | undefined;
  readonly onClearInitialTactic?: (() => void) | undefined;
}

export function TacticsView({ initialTactic, onClearInitialTactic }: TacticsViewProps) {
  const t = useT();
  const { tactics, builtIns, saveTactic, deleteTactic, duplicateTactic, reload } = useTactics();

  const [editingTactic, setEditingTactic] = useState<Tactic | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [selectedSide, setSelectedSide] = useState<TacticSide | 'ALL'>('ALL');
  const [selectedRound, setSelectedRound] = useState<TacticRound | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const shownTactics = useMemo(() => [...tactics, ...builtIns], [tactics, builtIns]);
  const builtInIds = useMemo(() => new Set(builtIns.map(({ id }) => id)), [builtIns]);

  const filteredTactics = useMemo(() => {
    return filterTactics(shownTactics, {
      map: selectedMap,
      side: selectedSide,
      round: selectedRound,
      search: searchQuery,
    });
  }, [shownTactics, selectedMap, selectedSide, selectedRound, searchQuery]);

  const mapCounts = useMemo(() => countByMap(shownTactics), [shownTactics]);
  const mapTabs = useMemo(
    () =>
      MAP_IDS.filter((id) => (mapCounts.get(id) ?? 0) > 0 || id === selectedMap).map((id) => ({
        id,
        count: mapCounts.get(id) ?? 0,
      })),
    [mapCounts, selectedMap],
  );
  const newTacticMap = selectedMap !== 'all' ? selectedMap : DEFAULT_NEW_TACTIC_MAP;

  const clearFilters = () => {
    setSelectedMap('all');
    setSelectedSide('ALL');
    setSelectedRound('ALL');
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    const map = newTacticMap;
    const side = selectedSide !== 'ALL' ? selectedSide : 'T';
    const newTactic = createNewTactic(map, side);
    setEditingTactic(newTactic);
  };

  const handleDuplicate = (source: Tactic) =>
    duplicateTactic(
      source,
      t('library.tactics.library.copyTitle', {
        title: nameOrFallback(source.title, t('library.tactics.untitled')),
      }),
    );

  /** A built-in is never written over: saving one in the editor keeps the reader's copy of it. */
  const handleSaveTactic = async (tacticToSave: Tactic) => {
    if (!builtInIds.has(tacticToSave.id)) {
      await saveTactic(tacticToSave);
      return;
    }
    const copy = copiedTactic(tacticToSave);
    await saveTactic(copy);
    setEditingTactic(copy);
  };

  const handleSaveBuiltIn = async (source: Tactic) => {
    await saveTactic(copiedTactic(source));
    setNotice({
      message: t('library.tactics.library.savedToPlaybook', {
        title: nameOrFallback(source.title, t('library.tactics.untitled')),
      }),
      isError: false,
    });
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveInitialShared = async () => {
    if (!initialTactic) return;
    await saveTactic(initialTactic);
    if (onClearInitialTactic) onClearInitialTactic();
    setNotice({
      message: t('library.tactics.library.importSuccess', { count: 1 }),
      isError: false,
    });
    setTimeout(() => setNotice(null), 3000);
  };

  // If in editor mode, display the full TacticEditor component
  if (editingTactic !== null) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-0">
        <TacticEditorScreen
          key={editingTactic.id}
          initialTactic={editingTactic}
          onSave={handleSaveTactic}
          onBack={() => setEditingTactic(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 py-4">
      {/* Status Notice Toast */}
      {notice !== null && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-card border border-line bg-surface-2 p-3 text-13 text-ink"
        >
          {notice.message}
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-ui text-28 font-semibold text-ink leading-dense sm:text-44">
            <Text path="library.tactics.library.playbookTitle" />
          </h2>
          <p className="text-14 text-ink-dim leading-prose">
            <Text path="library.tactics.library.playbookNote" />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setIsTransferring(true)}>
            <Text path="library.tactics.transfer.open" />
          </Button>
          <Button variant="primary" onClick={handleCreateNew}>
            <Plus />
            <span>{t('library.tactics.library.newTactic')}</span>
          </Button>
        </div>
      </header>

      {/* Shared banner sits under the header */}
      {initialTactic !== null && initialTactic !== undefined && (
        <SharedTacticBanner
          tactic={initialTactic}
          onSave={handleSaveInitialShared}
          onOpen={() => setEditingTactic(initialTactic)}
          onDismiss={onClearInitialTactic}
        />
      )}

      <TacticsFilterBar
        selectedMap={selectedMap}
        selectedSide={selectedSide}
        selectedRound={selectedRound}
        searchQuery={searchQuery}
        maps={mapTabs}
        total={shownTactics.length}
        onSelectMap={setSelectedMap}
        onSelectSide={setSelectedSide}
        onSelectRound={setSelectedRound}
        onSearch={setSearchQuery}
      />

      {filteredTactics.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface-1/40 px-4 py-12 text-center">
          <div className="rounded-full bg-surface-2 p-3 text-ink-dim">
            <Search className="size-6" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h3 className="font-ui text-16 font-semibold text-ink">
              {shownTactics.length === 0
                ? t('library.tactics.library.empty')
                : t('library.tactics.library.noMatch')}
            </h3>
            <p className="text-13 text-ink-dim leading-prose">
              {shownTactics.length === 0
                ? t('library.tactics.library.emptyHint')
                : t('library.tactics.library.noMatchHint')}
            </p>
          </div>
          {shownTactics.length > 0 && (
            <Button variant="secondary" onClick={clearFilters}>
              <Text path="library.tactics.library.clearFilters" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,25rem),1fr))] gap-4">
        {filteredTactics.map((tactic) => (
          <TacticCard
            key={tactic.id}
            tactic={tactic}
            isBuiltIn={builtInIds.has(tactic.id)}
            onOpen={setEditingTactic}
            onDuplicate={builtInIds.has(tactic.id) ? handleSaveBuiltIn : handleDuplicate}
            onExport={(tactic) => saveDownload(tacticDownload(tactic))}
            onDelete={deleteTactic}
          />
        ))}
        <button
          type="button"
          onClick={handleCreateNew}
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-line-strong p-6 text-center text-ink-dim transition-colors hover:text-ink"
        >
          <Plus className="size-6" aria-hidden />
          <span className="font-ui text-14 font-medium text-ink">
            {t('library.tactics.library.newOnMap', { map: newTacticMap })}
          </span>
          <span className="text-12">{t('library.tactics.library.newOnMapHint')}</span>
        </button>
      </div>

      <TacticTransferDialog
        isOpen={isTransferring}
        onDismiss={() => setIsTransferring(false)}
        onImported={() => void reload()}
      />
    </div>
  );
}
