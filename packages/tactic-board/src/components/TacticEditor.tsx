import type { Lineup, Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import { UnknownMap } from '@disa/plate';
import { cn } from '@disa/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { enemiesOf, oppositeSide } from '../helpers/tactic-enemies';
import { hasEditorWork } from '../helpers/tactic-setup';
import { handleTacticShortcut } from '../helpers/tactic-shortcuts';
import { originIndexOf, throwOrigins } from '../helpers/tactic-throw-origins';
import { useTacticBoard } from '../hooks/use-tactic-board';
import { useTacticPlans } from '../hooks/use-tactic-plans';
import { TacticBranchActions } from './TacticBranchActions';
import { TacticBranchPanel } from './TacticBranchPanel';
import { TacticEditorHeader } from './TacticEditorHeader';
import { TacticEnemySection } from './TacticEnemySection';
import { TacticEnemyToolButton } from './TacticEnemyToolButton';
import { TacticPlanStrip } from './TacticPlanStrip';
import { TacticPlate } from './TacticPlate';
import { TacticPlayerSection } from './TacticPlayerSection';
import { TacticProperties } from './TacticProperties';
import { TacticRoster } from './TacticRoster';
import { TacticStepSection } from './TacticStepSection';
import { TacticThrowList } from './TacticThrowList';
import { TacticHint, TacticToolbar } from './TacticToolbar';
import { TacticTransport } from './TacticTransport';
import { TacticTreeDialog } from './TacticTreeDialog';

/** What the host's transfer dialog is given: the tactic open, and a way to hand back an import. */
export interface TacticTransferSlot {
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly tactic: Tactic;
  /** The imported version of the open tactic, when the import replaced it. */
  readonly onReplaced: (tactic: Tactic) => void;
}

export interface TacticEditorProps {
  readonly initialTactic: Tactic;
  /** The lineups of a map that a throw can be taken from; a stable hook, called with the map being edited. */
  readonly useLineups: (map: string) => readonly Lineup[];
  /** Whether the tactic is already kept by the host: `null` while that is looked up, or unknown. */
  readonly isStored?: boolean | null | undefined;
  /** The host's file out and in; the editor shows its Transfer button only when this is given. */
  readonly renderTransfer?: ((slot: TacticTransferSlot) => ReactNode) | undefined;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
  readonly onBack?: (() => void) | undefined;
  /** Fired whenever the editor's own unsaved indicator changes. */
  readonly onDirtyChange?: ((isDirty: boolean) => void) | undefined;
  readonly className?: string | undefined;
}

export function TacticEditor(props: TacticEditorProps) {
  const overview = getMapOverview(props.initialTactic.map);
  if (overview === undefined) return <UnknownMap map={props.initialTactic.map} />;
  return <TacticBoard {...props} overview={overview} />;
}

function TacticBoard({
  initialTactic,
  onSave,
  onBack,
  onDirtyChange,
  className,
  overview,
  useLineups,
  isStored = null,
  renderTransfer,
}: TacticEditorProps & { readonly overview: NonNullable<ReturnType<typeof getMapOverview>> }) {
  const t = useT();
  const board = useTacticBoard({ initialTactic, overview, onSave, useLineups });
  const { editor, playback, schedule, stepSchedule, step } = board;
  const { tactic, stepIndex, selectedSlot, selectedEnemyId, tool, throwKind } = editor;
  const enemySide = oppositeSide(tactic.side);

  const [savedTactic, setSavedTactic] = useState(initialTactic);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const plans = useTacticPlans({
    editor,
    overview,
    grid: board.grid,
    schedule,
    stop: playback.stop,
  });
  const [hasSaved, setHasSaved] = useState(false);
  const isDirty = tactic !== savedTactic || (isStored === false && !hasSaved);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = useCallback(() => {
    editor.save();
    setSavedTactic(tactic);
    setHasSaved(true);
  }, [editor, tactic]);

  const handleReplaced = (imported: Tactic) => {
    editor.replaceTactic(imported);
    setSavedTactic(imported);
    setHasSaved(true);
  };

  const handleChangeMap = (map: string) => {
    if (map === tactic.map) return;
    if (hasEditorWork(tactic) && !window.confirm(t('library.tactics.editor.mapChangeConfirm'))) {
      return;
    }
    editor.changeMap(map);
  };

  const { shortcuts } = board;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) =>
      handleTacticShortcut(event, { ...shortcuts, save: handleSave });
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const selectedLeg = selectedSlot === null ? undefined : stepSchedule?.legs[selectedSlot];
  const spotsAreOffered =
    stepIndex === 0 && tool === 'select' && !playback.isShown && board.spawnSpots.length > 0;

  return (
    <section
      className={cn(
        'flex h-full w-full flex-col overflow-y-auto bg-surface-0 font-sans text-ink selection:bg-white/20 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:overflow-hidden xl:grid-cols-[17rem_minmax(0,1fr)_20rem]',
        className,
      )}
      aria-label={t('library.tactics.editor.title')}
    >
      <div className="lg:col-span-3">
        <TacticEditorHeader
          tactic={tactic}
          isDirty={isDirty}
          onBack={onBack}
          onUpdateTitle={editor.updateTitle}
          onUpdateDescription={editor.updateDescription}
          onChangeMap={handleChangeMap}
          onChangeSide={editor.changeSide}
          onToggleRound={editor.toggleRound}
          onTransfer={renderTransfer === undefined ? undefined : () => setIsTransferring(true)}
          onSave={handleSave}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
        />
      </div>

      <TacticRoster
        side={tactic.side}
        loadout={board.loadout}
        weapons={tactic.weapons}
        step={step}
        stepIndex={stepIndex}
        stepSchedule={stepSchedule}
        selectedSlot={selectedSlot}
        onSelect={(slot) => {
          playback.stop();
          editor.select(slot);
        }}
      />

      <div className="@container relative aspect-square w-full shrink-0 lg:aspect-auto lg:h-full lg:min-h-0 lg:min-w-0">
        <TacticPlate
          map={tactic.map}
          side={tactic.side}
          grid={board.grid}
          schedule={schedule}
          step={step}
          stepIndex={stepIndex}
          selectedSlot={selectedSlot}
          enemyMarks={board.enemyMarks}
          selectedEnemyId={selectedEnemyId}
          tool={tool}
          clock={playback.clock}
          isShown={playback.isShown}
          lineups={board.pickableLineups}
          spawns={tactic.spawns}
          spawnSpots={spotsAreOffered ? board.spawnSpots : undefined}
          actions={board.plateActions}
          repaintRef={board.repaintRef}
          onPreviewReach={board.onPreviewReach}
        />
        <TacticToolbar
          tool={tool}
          throwKind={throwKind}
          onTool={board.chooseTool}
          onThrowKind={board.chooseThrowKind}
          extra={
            <TacticEnemyToolButton
              isOn={tool === 'enemy'}
              enemySide={enemySide}
              onPick={() => board.chooseTool('enemy')}
            />
          }
        />
        <TacticHint>
          {t(`library.tactics.board.hint.${board.hint.key}`, { slot: board.hint.slot })}
        </TacticHint>
      </div>

      {step !== undefined && (
        <TacticProperties
          label={t('library.tactics.board.step.eyebrow', {
            index: stepIndex + 1,
            total: board.steps.length,
          })}
          beforeStep={
            plans.isBranch && (
              <TacticBranchPanel
                key={editor.planId}
                forkNumber={plans.forkNumber}
                condition={plans.condition}
                parentName={plans.parentName}
                shouldFocus={editor.conditionFocus === editor.planId}
                sharedOwnerName={plans.sharedOwnerName}
                onCondition={editor.setCondition}
                onCommit={editor.endGesture}
                onFocused={editor.conditionSeen}
              />
            )
          }
          afterStep={
            <TacticBranchActions
              onBranch={plans.branchFromHere}
              diesSlot={
                selectedSlot !== null && selectedLeg?.isDead === false ? selectedSlot + 1 : null
              }
              canDie={stepIndex > 0}
              onDies={() => selectedSlot !== null && plans.dieHere(selectedSlot)}
            />
          }
          step={
            <TacticStepSection
              step={step}
              stepIndex={stepIndex}
              stepCount={board.steps.length}
              stepSchedule={stepSchedule}
              deleteBlock={board.deleteBlock}
              onRename={editor.rename}
              onIdea={editor.setIdea}
              onStart={editor.setStart}
              onDelete={editor.deleteStep}
              onCommit={editor.endGesture}
            />
          }
          player={
            selectedSlot !== null && (
              <TacticPlayerSection
                slot={selectedSlot}
                step={step}
                leg={selectedLeg}
                isOpeningStep={stepIndex === 0}
                spawn={tactic.spawns[selectedSlot]}
                spawnSpots={board.spawnSpots}
                side={tactic.side}
                weapon={tactic.weapons?.[selectedSlot]}
                onMode={(mode) => {
                  editor.setRouteMode(selectedSlot, mode);
                  board.chooseTool(mode === 'pen' ? 'pen' : 'route');
                }}
                onTask={(task) => editor.setTask(selectedSlot, task)}
                onDelay={(seconds) => editor.setDelay(selectedSlot, seconds)}
                onClearRoute={() => editor.clearRoute(selectedSlot)}
                onRemovePoint={() => editor.removeWaypoint(selectedSlot)}
                onSpawn={(spot) => {
                  const point = board.spawnSpots[spot];
                  if (point !== undefined) editor.setSpawn(selectedSlot, point);
                }}
                onWeapon={(weapon) => editor.setWeapon(selectedSlot, weapon)}
                onCommit={editor.endGesture}
              />
            )
          }
          afterPlayer={
            <TacticEnemySection
              enemies={enemiesOf(step)}
              pickedId={selectedEnemyId}
              stepNumber={stepIndex + 1}
              slotCount={schedule.slotCount}
              enemySide={enemySide}
              isToolInHand={tool === 'enemy'}
              onPick={(id) => {
                playback.stop();
                editor.selectEnemy(id);
              }}
              onNote={editor.setEnemyNote}
              onRole={editor.setEnemyRole}
              onTaker={editor.setEnemyTaker}
              onDead={editor.setEnemyDead}
              onRemove={(id) => {
                editor.removeEnemy(id);
                editor.selectEnemy(null);
              }}
              onCommit={editor.endGesture}
            />
          }
          throws={
            <TacticThrowList
              throws={stepSchedule?.throws ?? []}
              lineups={board.lineups}
              originsOf={(thrown) => {
                const origins = throwOrigins(step, stepSchedule?.legs[thrown.slot], overview);
                return { origins, chosen: originIndexOf(origins, thrown, overview) };
              }}
              onRemove={editor.removeThrow}
              onFrom={(throwId, origin) => editor.setThrowFrom(throwId, origin.at)}
            />
          }
        />
      )}

      <footer className="flex flex-col [border-block-start:1px_solid_var(--color-line)] lg:col-span-3">
        <TacticTransport
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          seconds={board.clockSeconds}
          canPrev={stepIndex > 0}
          canNext={stepIndex < board.steps.length - 1}
          onPrev={() => board.jump('prev')}
          onNext={() => board.jump('next')}
          onToggle={playback.toggle}
          onSpeed={playback.setSpeed}
        />
        <TacticPlanStrip
          graph={plans.graph}
          schedules={plans.schedules}
          selected={plans.selected}
          onOpen={plans.open}
          onLane={plans.openLane}
          onBranch={plans.branchAfter}
          onAddStep={plans.addStep}
          onDelete={plans.deleteStep}
          deleteBlockOf={plans.deleteBlockOf}
          onOpenTree={() => setIsTreeOpen(true)}
        />
      </footer>

      <TacticTreeDialog
        isOpen={isTreeOpen}
        onDismiss={() => setIsTreeOpen(false)}
        tactic={tactic}
        graph={plans.graph}
        schedules={plans.schedules}
        selected={plans.selected}
        canUndo={editor.canUndo}
        deleteBlockOf={plans.deleteBlockOf}
        onUndo={editor.undo}
        onOpenStep={(key) => {
          setIsTreeOpen(false);
          plans.open(key);
        }}
        onBranch={(key) => {
          setIsTreeOpen(false);
          plans.branchAfter(key);
        }}
        onDeleteStep={plans.deleteStep}
        onDeletePlan={plans.deletePlan}
      />

      {renderTransfer?.({
        isOpen: isTransferring,
        onDismiss: () => setIsTransferring(false),
        tactic,
        onReplaced: handleReplaced,
      })}
    </section>
  );
}
