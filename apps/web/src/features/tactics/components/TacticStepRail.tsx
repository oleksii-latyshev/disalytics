import { type TacticPlayerPosition, type TacticStep, UTILITY_NAMES } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { ArrowLeft, ArrowRight, Clock, Compass, Copy, Plus, Trash2 } from 'lucide-react';
import { UTILITY_INK, UtilityGlyph } from '@/core/glyphs';
import type { StepThrowRow } from '../helpers/tactic-step-throws';

export interface TacticStepRailProps {
  readonly step: TacticStep | undefined;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly throwRows: readonly StepThrowRow[];
  readonly selectedThrowId: string | null;
  readonly selectedPlayer: TacticPlayerPosition | undefined;
  /** How many spawn spots the side has on this map; 0 hides the spawn controls. */
  readonly spawnCount: number;
  /** The spot the selected player stands on, or null for a position of their own. */
  readonly selectedSpawnSpot: number | null;
  /** Shown while the throw tool is open, since that is when the reader needs to be told what to click. */
  readonly throwHint: string | undefined;
  readonly isOpenOnPhone: boolean;
  readonly onSelectThrow: (throwId: string | null) => void;
  readonly onDeleteThrow: (throwId: string) => void;
  readonly onUpdateThrowDroppedBy: (throwId: string, droppedBy: number | undefined) => void;
  readonly onAddStep: () => void;
  readonly onDuplicateStep: (index: number) => void;
  readonly onDeleteStep: (index: number) => void;
  readonly onMoveStep: (index: number, direction: 'earlier' | 'later') => void;
  readonly onUpdateName: (index: number, name: string) => void;
  readonly onUpdateOffset: (index: number, offset: number) => void;
  readonly onUpdateNotes: (index: number, notes: string) => void;
  readonly onSelectSpawn: (slot: number, spot: number) => void;
  readonly onUpdatePlayerYaw: (slot: number, yaw: number) => void;
  readonly onUpdatePlayerLabel: (slot: number, label: string) => void;
}

const FIELD =
  'rounded-chip border border-line bg-surface-2 text-ink placeholder:text-ink-faint hover:border-line-strong';

function DroppedByField({
  row,
  players,
  onChange,
}: {
  readonly row: StepThrowRow;
  readonly players: readonly TacticPlayerPosition[];
  readonly onChange: (droppedBy: number | undefined) => void;
}) {
  const t = useT();
  const label = t('library.tactics.throw.droppedBy');
  return (
    <label className="flex items-center gap-2 px-2.5 pb-2.5 text-12 text-ink-dim">
      <span className="shrink-0">{label}</span>
      <select
        value={row.droppedBy ?? ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
        aria-label={label}
        className={cn(FIELD, 'h-8 min-w-0 flex-1 px-2 text-12')}
      >
        <option value="">{t('library.tactics.throw.droppedByNone')}</option>
        {players
          .filter((player) => player.slot !== row.slot)
          .map((player) => (
            <option key={player.slot} value={player.slot}>
              {`${player.slot + 1} ${player.label?.trim() ?? ''}`.trim()}
            </option>
          ))}
      </select>
    </label>
  );
}

function ThrowRow({
  row,
  players,
  isSelected,
  onSelect,
  onDelete,
  onUpdateDroppedBy,
}: {
  readonly row: StepThrowRow;
  readonly players: readonly TacticPlayerPosition[];
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly onDelete: () => void;
  readonly onUpdateDroppedBy: (droppedBy: number | undefined) => void;
}) {
  const t = useT();
  const kindName =
    row.kind === 'kit' ? UTILITY_NAMES.kit : t(`library.tactics.tools.utilityKinds.${row.kind}`);
  const player = `${row.slot + 1} ${row.label}`.trim();

  return (
    <li
      className={cn(
        'flex flex-col rounded-card border transition-colors',
        isSelected ? 'border-line-strong bg-surface-2' : 'border-line bg-surface-1',
      )}
    >
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-card p-2.5 text-left hover:bg-hover"
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-chip bg-surface-2',
              UTILITY_INK[row.kind],
            )}
          >
            <UtilityGlyph kind={row.kind} size="control" />
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-13 font-medium">
              {row.lineupTitle === undefined
                ? kindName
                : t('library.tactics.steps.throwFromLineup', {
                    kind: kindName,
                    lineup: row.lineupTitle,
                  })}
            </span>
            <span className="truncate font-mono text-11 text-ink-dim">
              {t('library.tactics.steps.throwMeta', { player, seconds: row.releaseTime })}
            </span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={t('library.tactics.throw.delete')}
          title={t('library.tactics.throw.delete')}
          className="text-ink-dim hover:bg-damage/20 hover:text-damage"
        >
          <Trash2 />
        </Button>
      </div>
      <DroppedByField row={row} players={players} onChange={onUpdateDroppedBy} />
    </li>
  );
}

function StepActions({
  index,
  count,
  offset,
  onDuplicate,
  onDelete,
  onMove,
  onUpdateOffset,
}: {
  readonly index: number;
  readonly count: number;
  readonly offset: number;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onMove: (direction: 'earlier' | 'later') => void;
  readonly onUpdateOffset: (offset: number) => void;
}) {
  const t = useT();
  const offsetLabel = t('library.tactics.steps.offset', { seconds: offset });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
      <label title={offsetLabel} className="flex items-center gap-1 font-mono text-12 text-ink-dim">
        <Clock className="size-3.5" />
        <input
          type="number"
          min={0}
          step={1}
          value={offset}
          onChange={(event) => onUpdateOffset(Number(event.target.value))}
          aria-label={offsetLabel}
          className={cn(FIELD, 'h-8 w-16 px-1.5 text-center font-mono text-12')}
        />
        <span>{t('library.tactics.steps.secondsUnit')}</span>
      </label>
      <div className="ml-auto flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove('earlier')}
          disabled={index === 0}
          aria-label={t('library.tactics.steps.moveEarlier')}
          title={t('library.tactics.steps.moveEarlier')}
          className="text-ink-dim hover:text-ink"
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove('later')}
          disabled={index === count - 1}
          aria-label={t('library.tactics.steps.moveLater')}
          title={t('library.tactics.steps.moveLater')}
          className="text-ink-dim hover:text-ink"
        >
          <ArrowRight />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          aria-label={t('library.tactics.steps.duplicate')}
          title={t('library.tactics.steps.duplicate')}
          className="text-ink-dim hover:text-ink"
        >
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={count <= 1}
          aria-label={t('library.tactics.steps.delete')}
          title={
            count <= 1
              ? t('library.tactics.steps.cannotDeleteLast')
              : t('library.tactics.steps.delete')
          }
          className="text-damage/80 hover:bg-damage/20 hover:text-damage"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function SpawnField({
  player,
  count,
  spot,
  onSelect,
}: {
  readonly player: TacticPlayerPosition;
  readonly count: number;
  readonly spot: number | null;
  readonly onSelect: (slot: number, spot: number) => void;
}) {
  const t = useT();
  const label = t('library.tactics.player.spawn');
  return (
    <label className="flex items-center gap-2 text-12 text-ink-dim">
      <span className="shrink-0">{label}</span>
      <select
        value={spot ?? ''}
        onChange={(event) => {
          if (event.target.value !== '') onSelect(player.slot, Number(event.target.value));
        }}
        aria-label={label}
        className={cn(FIELD, 'h-8 min-w-0 flex-1 px-2 text-12')}
      >
        {spot === null && <option value="">{t('library.tactics.player.spawnCustom')}</option>}
        {Array.from({ length: count }, (_, index) => index).map((index) => (
          <option key={`spot-${index}`} value={index}>
            {t('library.tactics.player.spawnSpot', { number: index + 1 })}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlayerEditor({
  player,
  spawnCount,
  spawnSpot,
  onSelectSpawn,
  onUpdateYaw,
  onUpdateLabel,
}: {
  readonly player: TacticPlayerPosition;
  readonly spawnCount: number;
  readonly spawnSpot: number | null;
  readonly onSelectSpawn: (slot: number, spot: number) => void;
  readonly onUpdateYaw: (slot: number, yaw: number) => void;
  readonly onUpdateLabel: (slot: number, label: string) => void;
}) {
  const t = useT();
  const yawLabel = t('library.tactics.player.yaw');

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-1 p-3">
      <span className="font-mono text-11 uppercase tracking-[0.12em] text-ink-dim">
        {t('library.tactics.player.selected', { slot: player.slot + 1 })}
      </span>
      <input
        type="text"
        value={player.label ?? ''}
        onChange={(event) => onUpdateLabel(player.slot, event.target.value)}
        aria-label={t('library.tactics.player.label')}
        placeholder={t('library.tactics.player.labelPlaceholder')}
        className={cn(FIELD, 'h-8 w-full px-2.5 text-12')}
      />
      {spawnCount > 0 && (
        <SpawnField player={player} count={spawnCount} spot={spawnSpot} onSelect={onSelectSpawn} />
      )}
      <label title={yawLabel} className="flex items-center gap-2 text-ink-dim">
        <Compass className="size-3.5 shrink-0" />
        <input
          type="range"
          min={-180}
          max={180}
          step={5}
          value={player.yaw ?? 0}
          onChange={(event) => onUpdateYaw(player.slot, Number(event.target.value))}
          aria-label={yawLabel}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white"
        />
        <span className="w-10 text-right font-mono text-11 tabular-nums">
          {Math.round(player.yaw ?? 0)}°
        </span>
      </label>
    </div>
  );
}

/** The current step: what it is called and when it starts, what is thrown in it, and its notes. */
export function TacticStepRail({
  step,
  stepIndex,
  stepCount,
  throwRows,
  selectedThrowId,
  selectedPlayer,
  spawnCount,
  selectedSpawnSpot,
  throwHint,
  isOpenOnPhone,
  onSelectThrow,
  onDeleteThrow,
  onUpdateThrowDroppedBy,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onMoveStep,
  onUpdateName,
  onUpdateOffset,
  onUpdateNotes,
  onSelectSpawn,
  onUpdatePlayerYaw,
  onUpdatePlayerLabel,
}: TacticStepRailProps) {
  const t = useT();
  if (step === undefined) return null;

  return (
    <section
      aria-label={t('library.tactics.steps.step', { index: stepIndex + 1 })}
      className={cn(
        'order-5 min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pb-20 text-ink lg:order-none lg:col-start-3 lg:row-start-2 lg:flex lg:flex-none lg:pl-0 lg:pb-3',
        isOpenOnPhone ? 'flex' : 'hidden',
      )}
    >
      <div className="flex flex-col gap-1 px-1">
        <span className="font-mono text-11 uppercase tracking-[0.12em] text-ink-dim">
          {t('library.tactics.steps.eyebrow', {
            index: stepIndex + 1,
            total: stepCount,
            seconds: step.timeOffsetSeconds,
          })}
        </span>
        <input
          type="text"
          value={step.name}
          onChange={(event) => onUpdateName(stepIndex, event.target.value)}
          aria-label={t('library.tactics.steps.name')}
          placeholder={
            stepIndex === 0
              ? t('library.tactics.steps.spawn')
              : t('library.tactics.steps.namePlaceholder')
          }
          className="w-full min-w-0 rounded-chip bg-transparent text-20 font-semibold text-ink placeholder:text-ink-faint hover:bg-hover"
        />
      </div>

      <StepActions
        index={stepIndex}
        count={stepCount}
        offset={step.timeOffsetSeconds}
        onDuplicate={() => onDuplicateStep(stepIndex)}
        onDelete={() => onDeleteStep(stepIndex)}
        onMove={(direction) => onMoveStep(stepIndex, direction)}
        onUpdateOffset={(offset) => onUpdateOffset(stepIndex, offset)}
      />

      {throwRows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-3 py-2.5 text-13 text-ink-dim">
          {t('library.tactics.steps.noThrows')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {throwRows.map((row) => (
            <ThrowRow
              key={row.id}
              row={row}
              players={step.players}
              isSelected={row.id === selectedThrowId}
              onSelect={() => onSelectThrow(row.id === selectedThrowId ? null : row.id)}
              onDelete={() => onDeleteThrow(row.id)}
              onUpdateDroppedBy={(droppedBy) => onUpdateThrowDroppedBy(row.id, droppedBy)}
            />
          ))}
        </ul>
      )}

      {throwHint !== undefined && (
        <p role="status" className="px-1 text-12 text-ink-dim leading-prose">
          {throwHint}
        </p>
      )}

      {stepIndex === 0 && spawnCount > 0 && throwHint === undefined && (
        <p className="px-1 text-12 text-ink-dim leading-prose">
          {t('library.tactics.steps.pickSpawn')}
        </p>
      )}

      {selectedPlayer !== undefined && (
        <PlayerEditor
          player={selectedPlayer}
          spawnCount={stepIndex === 0 ? spawnCount : 0}
          spawnSpot={selectedSpawnSpot}
          onSelectSpawn={onSelectSpawn}
          onUpdateYaw={onUpdatePlayerYaw}
          onUpdateLabel={onUpdatePlayerLabel}
        />
      )}

      {stepIndex === stepCount - 1 && (
        <div className="flex flex-col gap-2">
          {stepCount === 1 && (
            <p className="px-1 text-12 text-ink-dim leading-prose">
              {t('library.tactics.steps.addHint')}
            </p>
          )}
          <Button variant={stepCount === 1 ? 'primary' : 'outline'} onClick={onAddStep}>
            <Plus />
            {t('library.tactics.steps.addNext')}
          </Button>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="px-1 font-mono text-11 uppercase tracking-[0.12em] text-ink-dim">
          {t('library.tactics.steps.notesHeading')}
        </span>
        <textarea
          rows={5}
          value={step.notes ?? ''}
          onChange={(event) => onUpdateNotes(stepIndex, event.target.value)}
          aria-label={t('library.tactics.steps.notes')}
          placeholder={t('library.tactics.steps.notesPlaceholder')}
          className={cn(FIELD, 'min-h-24 w-full resize-y p-3 text-14 leading-prose')}
        />
      </label>
    </section>
  );
}
