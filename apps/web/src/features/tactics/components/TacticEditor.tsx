import type { Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ArrowLeft, Check, HelpCircle, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TacticPlate } from '@/features/radar';
import { type TacticTool, useTacticEditor } from '../hooks/use-tactic-editor';
import { TacticStepPanel } from './TacticStepPanel';
import { TacticToolbar } from './TacticToolbar';
import { TacticTransport } from './TacticTransport';

export interface TacticEditorProps {
  readonly initialTactic: Tactic;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly className?: string | undefined;
}

function handleToolShortcut(key: string, onSelectTool: (tool: TacticTool) => void): boolean {
  if (key === '1') {
    onSelectTool('select');
    return true;
  }
  if (key === '2') {
    onSelectTool('pencil');
    return true;
  }
  if (key === '3') {
    onSelectTool('throw');
    return true;
  }
  if (key === '4') {
    onSelectTool('eraser');
    return true;
  }
  return false;
}

function handleNavigationShortcut(
  event: KeyboardEvent,
  togglePlay: () => void,
  jumpStep: (dir: 'prev' | 'next') => void,
): boolean {
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
    return true;
  }
  if (event.key === '[') {
    event.preventDefault();
    jumpStep('prev');
    return true;
  }
  if (event.key === ']') {
    event.preventDefault();
    jumpStep('next');
    return true;
  }
  return false;
}

function handleModifierShortcut(
  event: KeyboardEvent,
  undo: () => void,
  redo: () => void,
  onSave: () => void,
): boolean {
  if (!event.ctrlKey && !event.metaKey) return false;
  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return true;
  }
  if (key === 'y') {
    event.preventDefault();
    redo();
    return true;
  }
  if (key === 's') {
    event.preventDefault();
    onSave();
    return true;
  }
  return false;
}

export function TacticEditor({ initialTactic, onSave, onBack, className }: TacticEditorProps) {
  const t = useT();
  const [isSaved, setIsSaved] = useState(false);

  const editor = useTacticEditor({
    initialTactic,
    onSave,
  });

  const {
    tactic,
    activeStepIndex,
    activeStep,
    selectedSlot,
    selectedThrowId,
    activeTool,
    pencilColor,
    newThrowKind,
    canUndo,
    canRedo,
    isPlaying,
    playbackTime,
    playbackSpeed,
    totalDuration,
    setActiveStepIndex,
    setSelectedSlot,
    setSelectedThrowId,
    setActiveTool,
    setPencilColor,
    setNewThrowKind,
    setPlaybackSpeed,
    undo,
    redo,
    addStep,
    duplicateStep,
    deleteStep,
    moveStep,
    updateStepName,
    updateStepOffset,
    updateStepNotes,
    updatePlayerPosition,
    updatePlayerYaw,
    updatePlayerLabel,
    addThrow,
    updateThrowPosition,
    deleteThrow,
    addDrawingStroke,
    deleteDrawingStroke,
    clearDrawings,
    updateTitle,
    updateDescription,
    save,
    togglePlay,
    seek,
    jumpStep,
  } = editor;

  const handleSave = useCallback(() => {
    save();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [save]);

  const selectedPlayer = useMemo(() => {
    if (selectedSlot === null) return undefined;
    return activeStep?.players.find((p) => p.slot === selectedSlot);
  }, [activeStep, selectedSlot]);

  const selectedThrow = useMemo(() => {
    if (selectedThrowId === null) return undefined;
    return activeStep?.throws.find((t) => t.id === selectedThrowId);
  }, [activeStep, selectedThrowId]);

  const stepOffsets = useMemo(() => {
    return tactic.steps.map((s) => s.timeOffsetSeconds);
  }, [tactic.steps]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (handleModifierShortcut(event, undo, redo, handleSave)) return;
      if (handleNavigationShortcut(event, togglePlay, jumpStep)) return;
      handleToolShortcut(event.key, setActiveTool);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, jumpStep, setActiveTool, undo, redo, handleSave]);

  return (
    <section
      className={
        className ??
        'flex h-full w-full flex-col bg-surface-0 font-sans text-ink selection:bg-white/20'
      }
      aria-label={t('library.tactics.editor.title')}
    >
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-3">
          {onBack !== undefined && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              title={t('library.tactics.editor.exit')}
              aria-label={t('library.tactics.editor.exit')}
              className="h-8 w-8 text-ink-dim hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-dim" title={t('library.tactics.note')}>
              {t('library.tactics.title')}
            </span>
            <span className="text-ink-faint">/</span>
            <input
              type="text"
              value={tactic.title}
              onChange={(e) => updateTitle(e.target.value)}
              aria-label={t('library.tactics.editor.tacticTitle')}
              placeholder={t('library.tactics.editor.tacticTitle')}
              className="rounded-chip border border-transparent bg-transparent px-2 py-0.5 text-sm font-semibold text-ink transition-colors hover:border-line focus:border-white focus:bg-surface-1 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full border border-line bg-surface-1 px-2.5 py-0.5 font-mono text-[11px] text-ink-dim"
              title={t('library.tactics.editor.map')}
            >
              {tactic.map}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                tactic.side === 'CT'
                  ? 'border-ct/40 bg-ct/10 text-ct'
                  : 'border-t/40 bg-t/10 text-t'
              }`}
              title={t('library.tactics.editor.side')}
            >
              {tactic.side}
            </span>
            {tactic.author !== undefined && tactic.author.length > 0 && (
              <span
                className="font-mono text-[11px] text-ink-faint"
                title={t('library.tactics.editor.author')}
              >
                {tactic.author}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={tactic.description ?? ''}
            onChange={(e) => updateDescription(e.target.value)}
            aria-label={t('library.tactics.editor.description')}
            placeholder={t('library.tactics.editor.descriptionPlaceholder')}
            className="w-48 rounded-chip border border-line/60 bg-surface-1 px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
          />

          <span
            className="cursor-help text-ink-faint hover:text-ink-dim"
            title={t('library.tactics.note')}
          >
            <HelpCircle className="h-4 w-4" />
          </span>

          <Button
            variant={isSaved ? 'outline' : 'primary'}
            onClick={handleSave}
            aria-label={
              isSaved ? t('library.tactics.editor.saved') : t('library.tactics.editor.save')
            }
            className="h-8 gap-1.5 px-3 text-xs"
          >
            {isSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-ink" />
                <span className="text-ink">{t('library.tactics.editor.saved')}</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{t('library.tactics.editor.save')}</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Board Work Area */}
      <main className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 overflow-hidden p-3">
        {/* Floating / Docked Toolbar */}
        <div className="z-10 w-full max-w-4xl">
          <TacticToolbar
            activeTool={activeTool}
            pencilColor={pencilColor}
            newThrowKind={newThrowKind}
            canUndo={canUndo}
            canRedo={canRedo}
            selectedPlayer={selectedPlayer}
            selectedThrow={selectedThrow}
            onSelectTool={setActiveTool}
            onSelectColor={setPencilColor}
            onSelectThrowKind={setNewThrowKind}
            onUndo={undo}
            onRedo={redo}
            onClearDrawings={clearDrawings}
            onUpdatePlayerYaw={updatePlayerYaw}
            onUpdatePlayerLabel={updatePlayerLabel}
            onDeleteThrow={deleteThrow}
          />
        </div>

        {/* Tactical Radar Canvas Plate */}
        <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center [container-type:size]">
          <TacticPlate
            map={tactic.map}
            side={tactic.side}
            steps={tactic.steps}
            activeStepIndex={activeStepIndex}
            currentTime={isPlaying ? playbackTime : undefined}
            selectedSlot={selectedSlot}
            selectedThrowId={selectedThrowId}
            onSelectSlot={setSelectedSlot}
            onSelectThrow={setSelectedThrowId}
            onPlayerDrag={updatePlayerPosition}
            onThrowDrag={updateThrowPosition}
            isEditable={!isPlaying}
            activeTool={activeTool}
            pencilColor={pencilColor}
            newThrowKind={newThrowKind}
            onAddDrawingStroke={addDrawingStroke}
            onAddThrow={addThrow}
            onDeleteThrow={deleteThrow}
            onDeleteDrawingStroke={deleteDrawingStroke}
            className="aspect-square h-[min(100cqi,100cqb)] max-h-[720px] max-w-[720px] select-none rounded-card border border-line bg-surface-0 shadow-lg"
          />
        </div>

        {/* Playback Transport Controls */}
        <div className="z-10 w-full max-w-3xl">
          <TacticTransport
            isPlaying={isPlaying}
            playbackTime={playbackTime}
            totalDuration={totalDuration}
            playbackSpeed={playbackSpeed}
            stepOffsets={stepOffsets}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onJumpStep={jumpStep}
            onSpeedChange={setPlaybackSpeed}
          />
        </div>
      </main>

      {/* Bottom Step Strip Panel */}
      <footer className="shrink-0 [border-block-start:1px_solid_var(--color-line)] bg-surface-0 p-3">
        <TacticStepPanel
          steps={tactic.steps}
          activeStepIndex={activeStepIndex}
          onSelectStep={setActiveStepIndex}
          onAddStep={addStep}
          onDuplicateStep={duplicateStep}
          onDeleteStep={deleteStep}
          onMoveStep={moveStep}
          onUpdateName={updateStepName}
          onUpdateOffset={updateStepOffset}
          onUpdateNotes={updateStepNotes}
        />
      </footer>
    </section>
  );
}
