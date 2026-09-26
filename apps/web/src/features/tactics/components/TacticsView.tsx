import type { Tactic, TacticSide } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import { Button } from '@disa/ui';
import { Download, Plus, Search, Share2, Upload, X } from 'lucide-react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { createNewTactic } from '../helpers/editor-actions';
import { filterTactics } from '../helpers/tactics-filter';
import { useTactics } from '../hooks/use-tactics';
import { TacticCard } from './TacticCard';
import { TacticEditor } from './TacticEditor';
import { TacticShareModal } from './TacticShareModal';

export interface TacticsViewProps {
  readonly initialTactic?: Tactic | null | undefined;
  readonly onClearInitialTactic?: (() => void) | undefined;
}

export function TacticsView({ initialTactic, onClearInitialTactic }: TacticsViewProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    tactics,
    saveTactic,
    deleteTactic,
    duplicateTactic,
    importTactics,
    exportSingleTactic,
    exportTactics,
  } = useTactics();

  const [editingTactic, setEditingTactic] = useState<Tactic | null>(null);
  const [sharingTactic, setSharingTactic] = useState<Tactic | null>(null);

  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [selectedSide, setSelectedSide] = useState<TacticSide | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const filteredTactics = useMemo(() => {
    return filterTactics(tactics, {
      map: selectedMap,
      side: selectedSide,
      search: searchQuery,
    });
  }, [tactics, selectedMap, selectedSide, searchQuery]);

  const handleCreateNew = () => {
    const map = selectedMap !== 'all' ? selectedMap : 'de_mirage';
    const side = selectedSide !== 'ALL' ? selectedSide : 'T';
    const newTactic = createNewTactic(map, side);
    setEditingTactic(newTactic);
  };

  const handleSaveTactic = async (tacticToSave: Tactic) => {
    await saveTactic(tacticToSave);
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importTactics(file);
      setNotice({
        message: t('library.tactics.library.importSuccess', { count }),
        isError: false,
      });
    } catch {
      setNotice({
        message: t('library.tactics.library.importError'),
        isError: true,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setNotice(null), 4000);
    }
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
        <TacticEditor
          initialTactic={editingTactic}
          onSave={handleSaveTactic}
          onBack={() => setEditingTactic(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 py-4">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Shared Tactic Notification Banner */}
      {initialTactic !== null && initialTactic !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/20 bg-surface-2 p-4 text-ink shadow-float">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-5 w-5 text-ink-dim" />
            <div className="flex flex-col">
              <span className="text-14 font-medium">
                {t('library.tactics.library.sharedBanner', {
                  title: initialTactic.title,
                })}
              </span>
              <span className="font-mono text-12 text-ink-dim">
                {initialTactic.map} · {initialTactic.side}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleSaveInitialShared}
              className="h-8 px-3 text-xs"
            >
              <Text path="library.tactics.library.saveToLibrary" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditingTactic(initialTactic)}
              className="h-8 px-3 text-xs"
            >
              <Text path="library.tactics.library.openWithoutSaving" />
            </Button>
            {onClearInitialTactic && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearInitialTactic}
                aria-label={t('library.tactics.library.dismiss')}
                className="h-8 w-8 text-ink-dim hover:text-ink"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

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

      {/* Header with Title and Action Buttons */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-ui text-28 font-medium text-ink leading-dense">
            <Text path="library.tactics.title" />
          </h2>
          <p className="text-14 text-ink-dim leading-prose">
            <Text path="library.tactics.note" />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={handleCreateNew} className="h-8 gap-1.5 px-3 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>{t('library.tactics.library.newTactic')}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{t('library.tactics.library.import')}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => exportTactics(filteredTactics)}
            disabled={filteredTactics.length === 0}
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t('library.tactics.library.export')}</span>
          </Button>
        </div>
      </header>

      {/* Filter Bar: Maps, Sides, and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Selector */}
          <div
            role="tablist"
            className="flex flex-wrap items-center gap-1 rounded-card bg-surface-1 p-1"
          >
            <button
              type="button"
              onClick={() => setSelectedMap('all')}
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
                onClick={() => setSelectedMap(mapId)}
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
                onClick={() => setSelectedSide(sideOption)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('library.tactics.library.searchPlaceholder')}
            aria-label={t('library.tactics.library.searchPlaceholder')}
            className="h-8 w-full rounded-chip border border-line bg-surface-1 pl-8 pr-3 text-xs text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
          />
        </div>
      </div>

      {/* Tactics Cards Grid or Empty State */}
      {filteredTactics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface-1/40 py-16 px-4 text-center">
          <div className="rounded-full bg-surface-2 p-3 text-ink-dim">
            <Search className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="font-ui text-16 font-semibold text-ink">
              {t('library.tactics.library.empty')}
            </h3>
            <p className="text-13 text-ink-dim leading-prose">
              {t('library.tactics.library.emptyHint')}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleCreateNew}
            className="mt-2 h-8 gap-1.5 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('library.tactics.library.newTactic')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTactics.map((tactic) => (
            <TacticCard
              key={tactic.id}
              tactic={tactic}
              onOpen={setEditingTactic}
              onShare={setSharingTactic}
              onDuplicate={duplicateTactic}
              onExport={exportSingleTactic}
              onDelete={deleteTactic}
            />
          ))}
        </div>
      )}

      {/* Share Modal */}
      {sharingTactic !== null && (
        <TacticShareModal
          isOpen={true}
          tactic={sharingTactic}
          onClose={() => setSharingTactic(null)}
          onExportFile={() => exportSingleTactic(sharingTactic)}
        />
      )}
    </div>
  );
}
