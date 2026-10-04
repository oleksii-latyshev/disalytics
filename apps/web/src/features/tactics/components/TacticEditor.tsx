import { type Tactic, tacticLoadout } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLineupCatalog } from '@/core/lineup-catalog';
import { selectableLineups } from '../helpers/lineup-throw';
import { hasEditorWork } from '../helpers/tactic-setup';
import { handleTacticShortcut } from '../helpers/tactic-shortcuts';
import { spawnSpotOf } from '../helpers/tactic-spawns';
import { stepThrowRows } from '../helpers/tactic-step-throws';
import { useTacticEditor } from '../hooks/use-tactic-editor';
import { useTacticStored } from '../hooks/use-tactic-stored';
import { TacticEditorHeader } from './TacticEditorHeader';
import { TacticLoadoutPanel } from './TacticLoadoutPanel';
import { TacticPlate } from './TacticPlate';
import { TacticShareModal } from './TacticShareModal';
import { TacticStepRail } from './TacticStepRail';
import { TacticTimeline } from './TacticTimeline';
import { TacticToolStrip } from './TacticToolStrip';

const PHONE_TABS = ['step', 'loadout'] as const;

export interface TacticEditorProps {
  readonly initialTactic: Tactic;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly className?: string | undefined;
}

export function TacticEditor({ initialTactic, onSave, onBack, className }: TacticEditorProps) {
  const t = useT();

  const editor = useTacticEditor({
    initialTactic,
    onSave,
  });

  const {
    tactic,
    activeStepIndex,
    activeStep,
    spawns,
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
    placePlayerOnSpawn,
    snapPlayerToSpawnSpot,
    updatePlayerYaw,
    updatePlayerLabel,
    addThrow,
    addLineupThrow,
    updateThrowPosition,
    updateThrowDroppedBy,
    deleteThrow,
    addDrawingStroke,
    deleteDrawingStroke,
    clearDrawings,
    changeMap,
    changeSide,
    toggleRound,
    updateTitle,
    updateDescription,
    save,
    togglePlay,
    seek,
    jumpStep,
    selectStep,
  } = editor;

  const { lineups } = useLineupCatalog(tactic.map);
  const loadout = useMemo(() => tacticLoadout(tactic), [tactic]);
  const pickableLineups = useMemo(
    () => selectableLineups(lineups, tactic.side, newThrowKind),
    [lineups, tactic.side, newThrowKind],
  );

  const handleChangeMap = (map: string) => {
    if (map === tactic.map) return;
    if (hasEditorWork(tactic) && !window.confirm(t('library.tactics.editor.mapChangeConfirm'))) {
      return;
    }
    changeMap(map);
  };

  const throwHint =
    selectedSlot === null
      ? t('library.tactics.throw.pickPlayer')
      : pickableLineups.length === 0
        ? t('library.tactics.throw.noLineups')
        : t('library.tactics.throw.pickLineup', { slot: selectedSlot + 1 });

  const [savedTactic, setSavedTactic] = useState(initialTactic);
  const [isSharing, setIsSharing] = useState(false);
  const [phoneTab, setPhoneTab] = useState<'step' | 'loadout'>('step');
  const isStored = useTacticStored(initialTactic.id);
  const [hasSaved, setHasSaved] = useState(false);
  const isDirty = tactic !== savedTactic || (isStored === false && !hasSaved);

  const handleSave = useCallback(() => {
    save();
    setSavedTactic(tactic);
    setHasSaved(true);
  }, [save, tactic]);

  const selectedPlayer = useMemo(() => {
    if (selectedSlot === null || activeTool !== 'select') return undefined;
    return activeStep?.players.find((p) => p.slot === selectedSlot);
  }, [activeStep, selectedSlot, activeTool]);

  const selectedSpawnSpot = useMemo(
    () => (selectedPlayer === undefined ? null : spawnSpotOf(spawns, selectedPlayer)),
    [selectedPlayer, spawns],
  );

  const handlePickSpawn = (spot: number) => {
    if (selectedSlot !== null) placePlayerOnSpawn(selectedSlot, spot);
  };

  const throwRows = useMemo(() => stepThrowRows(activeStep, lineups), [activeStep, lineups]);

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
      className={cn(
        'flex h-full w-full flex-col overflow-hidden bg-surface-0 font-sans text-ink selection:bg-white/20 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)_18.75rem] lg:grid-rows-[auto_minmax(0,1fr)_auto]',
        className,
      )}
      aria-label={t('library.tactics.editor.title')}
    >
      <TacticEditorHeader
        tactic={tactic}
        isDirty={isDirty}
        onBack={onBack}
        onUpdateTitle={updateTitle}
        onUpdateDescription={updateDescription}
        onChangeMap={handleChangeMap}
        onChangeSide={changeSide}
        onToggleRound={toggleRound}
        onShare={() => setIsSharing(true)}
        onSave={handleSave}
      />

      <div className="relative order-2 aspect-square w-full shrink-0 lg:order-none lg:col-start-2 lg:row-start-2 lg:aspect-auto lg:h-full lg:min-h-0 lg:min-w-0">
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
          onPlayerDragEnd={snapPlayerToSpawnSpot}
          onPickSpawn={handlePickSpawn}
          onThrowDrag={updateThrowPosition}
          isEditable={!isPlaying}
          activeTool={isPlaying ? 'select' : activeTool}
          pencilColor={pencilColor}
          newThrowKind={newThrowKind}
          lineups={pickableLineups}
          onPickLineup={addLineupThrow}
          onAddDrawingStroke={addDrawingStroke}
          onAddThrow={addThrow}
          onDeleteThrow={deleteThrow}
          onDeleteDrawingStroke={deleteDrawingStroke}
          hasZoomControls
        />
      </div>

      <TacticTimeline
        side={tactic.side}
        steps={tactic.steps}
        activeStepIndex={activeStepIndex}
        isPlaying={isPlaying}
        playbackTime={playbackTime}
        totalDuration={totalDuration}
        playbackSpeed={playbackSpeed}
        onSelectStep={selectStep}
        onAddStep={addStep}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onJumpStep={jumpStep}
        onSpeedChange={setPlaybackSpeed}
      />

      <div
        role="tablist"
        aria-label={t('library.tactics.tabs.label')}
        className="order-4 flex shrink-0 gap-1 px-3 pt-2 lg:hidden"
      >
        {PHONE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={phoneTab === tab}
            onClick={() => setPhoneTab(tab)}
            className={cn(
              'h-8 flex-1 rounded-chip font-mono text-12 font-medium transition-colors',
              phoneTab === tab ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-hover',
            )}
          >
            {t(`library.tactics.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <TacticLoadoutPanel
        side={tactic.side}
        loadout={loadout}
        players={activeStep?.players ?? []}
        selectedSlot={selectedSlot}
        onSelectSlot={setSelectedSlot}
        isOpenOnPhone={phoneTab === 'loadout'}
      />

      <TacticStepRail
        step={activeStep}
        stepIndex={activeStepIndex}
        stepCount={tactic.steps.length}
        throwRows={throwRows}
        selectedThrowId={selectedThrowId}
        selectedPlayer={selectedPlayer}
        spawnCount={spawns.length}
        selectedSpawnSpot={selectedSpawnSpot}
        throwHint={activeTool === 'throw' ? throwHint : undefined}
        isOpenOnPhone={phoneTab === 'step'}
        onSelectThrow={setSelectedThrowId}
        onDeleteThrow={deleteThrow}
        onUpdateThrowDroppedBy={updateThrowDroppedBy}
        onAddStep={addStep}
        onDuplicateStep={duplicateStep}
        onDeleteStep={deleteStep}
        onMoveStep={moveStep}
        onUpdateName={updateStepName}
        onUpdateOffset={updateStepOffset}
        onUpdateNotes={updateStepNotes}
        onSelectSpawn={placePlayerOnSpawn}
        onUpdatePlayerYaw={updatePlayerYaw}
        onUpdatePlayerLabel={updatePlayerLabel}
      />

      <TacticToolStrip
        activeTool={activeTool}
        pencilColor={pencilColor}
        newThrowKind={newThrowKind}
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectTool={setActiveTool}
        onSelectColor={setPencilColor}
        onSelectThrowKind={setNewThrowKind}
        onUndo={undo}
        onRedo={redo}
        onClearDrawings={clearDrawings}
      />

      <TacticShareModal isOpen={isSharing} onClose={() => setIsSharing(false)} tactic={tactic} />
    </section>
  );
}
