import type { Tactic, TacticRound, TacticSide } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Download, Plus, Search, Upload } from 'lucide-react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { nameOrFallback } from '../helpers/tactic-names';
import { createNewTactic } from '../helpers/tactic-setup';
import { filterTactics } from '../helpers/tactics-filter';
import { useTactics } from '../hooks/use-tactics';
import { SharedTacticBanner } from './SharedTacticBanner';
import { TacticCard } from './TacticCard';
import { TacticEditor } from './TacticEditor';
import { TacticShareModal } from './TacticShareModal';
import { TacticsFilterBar } from './TacticsFilterBar';

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
  const [selectedRound, setSelectedRound] = useState<TacticRound | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const filteredTactics = useMemo(() => {
    return filterTactics(tactics, {
      map: selectedMap,
      side: selectedSide,
      round: selectedRound,
      search: searchQuery,
    });
  }, [tactics, selectedMap, selectedSide, selectedRound, searchQuery]);

  const handleCreateNew = () => {
    const map = selectedMap !== 'all' ? selectedMap : 'de_mirage';
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

      {initialTactic !== null && initialTactic !== undefined && (
        <SharedTacticBanner
          tactic={initialTactic}
          onSave={handleSaveInitialShared}
          onOpen={() => setEditingTactic(initialTactic)}
          onDismiss={onClearInitialTactic}
        />
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
          <Button variant="primary" onClick={handleCreateNew}>
            <Plus />
            <span>{t('library.tactics.library.newTactic')}</span>
          </Button>

          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            <span>{t('library.tactics.library.import')}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => exportTactics(filteredTactics)}
            disabled={filteredTactics.length === 0}
          >
            <Download />
            <span>{t('library.tactics.library.export')}</span>
          </Button>
        </div>
      </header>

      <TacticsFilterBar
        selectedMap={selectedMap}
        selectedSide={selectedSide}
        selectedRound={selectedRound}
        searchQuery={searchQuery}
        onSelectMap={setSelectedMap}
        onSelectSide={setSelectedSide}
        onSelectRound={setSelectedRound}
        onSearch={setSearchQuery}
      />

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
          <Button variant="secondary" onClick={handleCreateNew} className="mt-2">
            <Plus />
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
              onDuplicate={handleDuplicate}
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
