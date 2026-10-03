import type { Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { handleTacticShortcut } from '../helpers/tactic-shortcuts';
import { useTacticEditor } from '../hooks/use-tactic-editor';
import { TacticEditorHeader } from './TacticEditorHeader';
import { TacticPlate } from './TacticPlate';
import { TacticStepPanel } from './TacticStepPanel';
import { TacticToolbar } from './TacticToolbar';
import { TacticTransport } from './TacticTransport';

export interface TacticEditorProps {
  readonly initialTactic: Tactic;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly className?: string | undefined;
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) =>
      handleTacticShortcut(event, {
        undo,
        redo,
        save: handleSave,
        togglePlay,
        jumpStep,
        selectTool: setActiveTool,
      });

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
      <TacticEditorHeader
        tactic={tactic}
        isSaved={isSaved}
        onBack={onBack}
        onUpdateTitle={updateTitle}
        onUpdateDescription={updateDescription}
        onSave={handleSave}
      />

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
        <div className="relative flex min-h-0 w-full min-w-0 flex-1 items-center justify-center [container-type:size]">
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
