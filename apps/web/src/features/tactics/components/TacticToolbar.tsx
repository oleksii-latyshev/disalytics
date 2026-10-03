import type { TacticPlayerPosition, TacticThrow, UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Bomb, Compass, Eraser, MousePointer, Pencil, Redo2, Trash2, Undo2 } from 'lucide-react';
import type { TacticTool } from '../hooks/use-tactic-editor';

export interface TacticToolbarProps {
  readonly activeTool: TacticTool;
  readonly pencilColor: string;
  readonly newThrowKind: UtilityKind;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly selectedPlayer?: TacticPlayerPosition | undefined;
  readonly selectedThrow?: TacticThrow | undefined;
  readonly onSelectTool: (tool: TacticTool) => void;
  readonly onSelectColor: (color: string) => void;
  readonly onSelectThrowKind: (kind: UtilityKind) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onClearDrawings: () => void;
  readonly onUpdatePlayerYaw: (slot: number, yaw: number) => void;
  readonly onUpdatePlayerLabel: (slot: number, label: string) => void;
  readonly onDeleteThrow: (throwId: string) => void;
}

const PENCIL_COLORS = [
  { id: 'ct', value: 'var(--color-ct)', labelKey: 'library.tactics.tools.colors.ct' },
  { id: 't', value: 'var(--color-t)', labelKey: 'library.tactics.tools.colors.t' },
  {
    id: 'objective',
    value: 'var(--color-objective)',
    labelKey: 'library.tactics.tools.colors.objective',
  },
  { id: 'damage', value: 'var(--color-damage)', labelKey: 'library.tactics.tools.colors.damage' },
  { id: 'ink', value: 'var(--color-ink)', labelKey: 'library.tactics.tools.colors.ink' },
] as const;

const THROW_KINDS = ['smoke', 'flash', 'fire', 'he', 'decoy'] as const;

export function TacticToolbar({
  activeTool,
  pencilColor,
  newThrowKind,
  canUndo,
  canRedo,
  selectedPlayer,
  selectedThrow,
  onSelectTool,
  onSelectColor,
  onSelectThrowKind,
  onUndo,
  onRedo,
  onClearDrawings,
  onUpdatePlayerYaw,
  onUpdatePlayerLabel,
  onDeleteThrow,
}: TacticToolbarProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface-1 px-3 py-2 text-ink">
      {/* Primary Tool Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === 'select' ? 'secondary' : 'ghost'}
          onClick={() => onSelectTool('select')}
          title={t('library.tactics.tools.select')}
        >
          <MousePointer />
          <span>{t('library.tactics.tools.select')}</span>
        </Button>

        <Button
          variant={activeTool === 'pencil' ? 'secondary' : 'ghost'}
          onClick={() => onSelectTool('pencil')}
          title={t('library.tactics.tools.pencil')}
        >
          <Pencil />
          <span>{t('library.tactics.tools.pencil')}</span>
        </Button>

        <Button
          variant={activeTool === 'throw' ? 'secondary' : 'ghost'}
          onClick={() => onSelectTool('throw')}
          title={t('library.tactics.tools.throw')}
        >
          <Bomb />
          <span>{t('library.tactics.tools.throw')}</span>
        </Button>

        <Button
          variant={activeTool === 'eraser' ? 'secondary' : 'ghost'}
          onClick={() => onSelectTool('eraser')}
          title={t('library.tactics.tools.eraser')}
        >
          <Eraser />
          <span>{t('library.tactics.tools.eraser')}</span>
        </Button>
      </div>

      {/* Tool Context Controls: Color Swatches for Pencil */}
      {activeTool === 'pencil' && (
        <div className="flex items-center gap-1.5 border-x border-line px-3">
          {PENCIL_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectColor(c.value)}
              title={t(c.labelKey)}
              aria-label={t(c.labelKey)}
              className={`h-5 w-5 rounded-full transition-transform ${
                pencilColor === c.value
                  ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-surface-1'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      )}

      {/* Tool Context Controls: Utility Kind Selector for Throw */}
      {activeTool === 'throw' && (
        <div className="flex items-center gap-1 border-x border-line px-3">
          {THROW_KINDS.map((kind) => {
            const isSelected = newThrowKind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onSelectThrowKind(kind)}
                className={`rounded-full px-2 py-0.5 text-12 font-medium uppercase transition-colors ${
                  isSelected
                    ? 'border border-white/40 bg-surface-2 text-ink shadow-sm'
                    : 'bg-surface-0 text-ink-dim hover:text-ink'
                }`}
              >
                {t(`library.tactics.tools.utilityKinds.${kind}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Player Properties Panel */}
      {selectedPlayer !== undefined && activeTool === 'select' && (
        <div className="flex items-center gap-3 border-x border-line px-3 text-12">
          <span className="font-semibold text-ink">
            {t('library.tactics.player.selected', { slot: selectedPlayer.slot + 1 })}
          </span>

          <label className="flex items-center gap-1 text-ink-dim">
            <span>{t('library.tactics.player.label')}:</span>
            <input
              type="text"
              value={selectedPlayer.label ?? ''}
              onChange={(e) => onUpdatePlayerLabel(selectedPlayer.slot, e.target.value)}
              placeholder={t('library.tactics.player.labelPlaceholder')}
              className="w-24 rounded-chip border border-line bg-surface-0 px-2 py-0.5 text-12 text-ink focus:border-white focus:outline-none"
            />
          </label>

          <label
            aria-label={t('library.tactics.player.yaw')}
            title={t('library.tactics.player.yaw')}
            className="flex items-center gap-1.5 text-ink-dim"
          >
            <Compass className="h-3.5 w-3.5" />
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={selectedPlayer.yaw ?? 0}
              onChange={(e) => onUpdatePlayerYaw(selectedPlayer.slot, Number(e.target.value))}
              aria-label={t('library.tactics.player.yaw')}
              className="h-1.5 w-20 cursor-pointer accent-white"
            />
            <span className="w-8 font-mono text-11 tabular-nums">
              {Math.round(selectedPlayer.yaw ?? 0)}°
            </span>
          </label>
        </div>
      )}

      {/* Selected Throw Properties */}
      {selectedThrow !== undefined && activeTool === 'select' && (
        <div className="flex items-center gap-2 border-x border-line px-3 text-12">
          <span className="text-ink-dim">{t('library.tactics.throw.selected')}:</span>
          <span className="font-semibold text-ink" title={t('library.tactics.throw.kind')}>
            {selectedThrow.kind !== 'kit'
              ? t(`library.tactics.tools.utilityKinds.${selectedThrow.kind}`)
              : selectedThrow.kind}
          </span>
          {selectedThrow.throwerSlot !== undefined && (
            <span className="text-ink-dim">
              {t('library.tactics.throw.thrower')}: {selectedThrow.throwerSlot + 1}
            </span>
          )}
          {selectedThrow.releaseTime !== undefined && (
            <span className="text-ink-dim">
              {t('library.tactics.throw.releaseTime', { seconds: selectedThrow.releaseTime })}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => onDeleteThrow(selectedThrow.id)}
            title={t('library.tactics.throw.delete')}
            aria-label={t('library.tactics.throw.delete')}
            className="text-damage hover:bg-damage/20 hover:text-damage"
          >
            <Trash2 />
            <span>{t('library.tactics.throw.delete')}</span>
          </Button>
        </div>
      )}

      {/* Action Buttons: Undo, Redo, Clear */}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title={t('library.tactics.tools.undo')}
          aria-label={t('library.tactics.tools.undo')}
          className="text-ink-dim hover:text-ink"
        >
          <Undo2 />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title={t('library.tactics.tools.redo')}
          aria-label={t('library.tactics.tools.redo')}
          className="text-ink-dim hover:text-ink"
        >
          <Redo2 />
        </Button>

        <Button
          variant="ghost"
          onClick={onClearDrawings}
          title={t('library.tactics.tools.clearDrawings')}
          className="text-ink-dim hover:text-damage"
        >
          <Trash2 />
          <span>{t('library.tactics.tools.clearDrawings')}</span>
        </Button>
      </div>
    </div>
  );
}
