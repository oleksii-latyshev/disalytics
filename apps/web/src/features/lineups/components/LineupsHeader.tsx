import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Download, Eye, Pencil, Plus, Upload } from 'lucide-react';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
import type { InteractionMode } from '../hooks/use-lineup-selection';

type Point = { readonly x: number; readonly y: number };

export function LineupsHeader({
  mode,
  count,
  setMode,
  setIsPlacing,
  setOrigin,
  setDraftWaypoints,
  setIsAddingBounce,
  setIsModalOpen,
  setSelectedId,
  setSelectedNodes,
  setNotice,
  fileInputRef,
  handleFileChange,
  exportLineups,
}: {
  readonly mode: InteractionMode;
  readonly count: number;
  readonly setMode: React.Dispatch<React.SetStateAction<InteractionMode>>;
  readonly setIsPlacing: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setOrigin: React.Dispatch<React.SetStateAction<Point | null>>;
  readonly setDraftWaypoints: React.Dispatch<React.SetStateAction<Point[]>>;
  readonly setIsAddingBounce: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedNodes: React.Dispatch<React.SetStateAction<readonly SelectedLineupNode[]>>;
  readonly setNotice: React.Dispatch<React.SetStateAction<string | null>>;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly exportLineups: () => Promise<void>;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-ui font-medium text-[clamp(2rem,3vw,3rem)] tracking-[-0.045em] text-ink leading-[1.05]">
            <Text path="library.lineups.title" />
          </h2>
          <span className="numeric font-mono text-11 text-ink-dim">
            <Text path="library.lineups.count" values={{ count }} />
          </span>
        </div>
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="library.lineups.note" />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-0.5">
        <div className="flex items-center rounded-card border border-line bg-surface-1 p-0.5">
          <button
            type="button"
            aria-pressed={mode === 'view'}
            onClick={() => {
              setMode('view');
              setNotice(null);
              setIsPlacing(false);
              setOrigin(null);
              setDraftWaypoints([]);
              setIsAddingBounce(false);
              setIsModalOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-11 font-medium ${mode === 'view' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'}`}
          >
            <Eye className="size-3.5" />
            <Text path="library.lineups.viewMode" />
          </button>
          <button
            type="button"
            aria-pressed={mode === 'edit'}
            onClick={() => {
              setMode('edit');
              setNotice(null);
            }}
            className={`flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-11 font-medium ${mode === 'edit' ? 'bg-surface-3 text-ink shadow-sm ring-1 ring-line' : 'text-ink-dim hover:text-ink'}`}
          >
            <Pencil className="size-3.5" />
            <Text path="library.lineups.editMode" />
          </button>
        </div>
        {mode === 'edit' && (
          <Button
            onClick={() => {
              setIsPlacing(true);
              setOrigin(null);
              setDraftWaypoints([]);
              setIsAddingBounce(false);
              setSelectedId(null);
              setSelectedNodes([]);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            <Text path="library.lineups.create" />
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5"
        >
          <Upload className="size-3.5" />
          <Text path="library.lineups.import" />
        </Button>
        <Button variant="secondary" onClick={() => void exportLineups()} className="gap-1.5">
          <Download className="size-3.5" />
          <Text path="library.lineups.export" />
        </Button>
      </div>
    </header>
  );
}
