import type { TacticPoint, TacticRouteMode, TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { Minus, Pencil, Plus, Route } from 'lucide-react';
import { useId } from 'react';
import type { PlayerLeg } from '../helpers/tactic-schedule';
import { nearestSpawnIndex } from '../helpers/tactic-spawns';

export interface TacticPlayerSectionProps {
  readonly slot: number;
  readonly step: TacticStep;
  readonly leg: PlayerLeg | undefined;
  readonly isOpeningStep: boolean;
  readonly spawn: TacticPoint | undefined;
  readonly spawnSpots: readonly TacticPoint[];
  readonly onMode: (mode: TacticRouteMode) => void;
  readonly onTask: (task: string) => void;
  readonly onDelay: (seconds: number) => void;
  readonly onClearRoute: () => void;
  readonly onRemovePoint: () => void;
  readonly onSpawn: (spot: number) => void;
  readonly onCommit: () => void;
}

const DELAY_STEP_SECONDS = 0.5;
const FIELD =
  'w-full rounded-chip border border-line bg-surface-0 px-2.5 text-13 text-ink placeholder:text-ink-faint focus-visible:border-line-strong';
const SEGMENT =
  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-chip text-12 transition-colors';

export function TacticPlayerSection({
  slot,
  step,
  leg,
  isOpeningStep,
  spawn,
  spawnSpots,
  onMode,
  onTask,
  onDelay,
  onClearRoute,
  onRemovePoint,
  onSpawn,
  onCommit,
}: TacticPlayerSectionProps) {
  const t = useT();
  const taskId = useId();
  const spawnId = useId();
  const entry = step.players.find((player) => player.slot === slot);
  const mode = entry?.route.mode ?? 'points';
  const delay = entry?.delaySeconds ?? 0;
  const label = entry?.label?.trim();
  const spot = spawn === undefined ? null : spawnSpotIndex(spawnSpots, spawn);
  const hasRoute = (entry?.route.points.length ?? 0) > 0;

  const modes = [
    { id: 'points', icon: <Route className="size-3.5" />, key: 'points' },
    { id: 'pen', icon: <Pencil className="size-3.5" />, key: 'pen' },
  ] as const;

  return (
    <section
      aria-label={t('library.tactics.board.player.title', { slot: slot + 1 })}
      className="flex flex-col gap-3 p-3 [border-block-start:1px_solid_var(--color-line)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-12 font-semibold text-surface-0">
          {slot + 1}
        </span>
        <span className="text-14 font-semibold">
          {label !== undefined && label !== ''
            ? label
            : t('library.tactics.board.player.title', { slot: slot + 1 })}
        </span>
      </div>

      {leg?.isDead === true ? (
        <p className="text-12 text-ink-dim">{t('library.tactics.board.player.isOut')}</p>
      ) : (
        <>
          {isOpeningStep && spawnSpots.length > 0 && (
            <label htmlFor={spawnId} className="flex flex-col gap-1 text-12 text-ink-dim">
              {t('library.tactics.board.player.spawn')}
              <select
                id={spawnId}
                value={spot ?? 'custom'}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isInteger(next)) onSpawn(next);
                }}
                className={cn(FIELD, 'h-9')}
              >
                {spot === null && (
                  <option value="custom">{t('library.tactics.board.player.spawnCustom')}</option>
                )}
                {spawnSpots.map((spot, index) => (
                  <option key={`${spot.x},${spot.y}`} value={index}>
                    {t('library.tactics.board.player.spawnSpot', { number: index + 1 })}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset
            aria-label={t('library.tactics.board.player.move')}
            className="m-0 flex min-w-0 gap-1 rounded-card border-none bg-surface-0 p-1"
          >
            {modes.map(({ id, icon, key }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => onMode(id)}
                className={cn(
                  SEGMENT,
                  mode === id
                    ? 'bg-surface-3 font-semibold text-ink'
                    : 'text-ink-dim hover:bg-hover',
                )}
              >
                {icon}
                {t(`library.tactics.board.player.${key}`)}
              </button>
            ))}
          </fieldset>

          <label htmlFor={taskId} className="flex flex-col gap-1 text-12 text-ink-dim">
            {t('library.tactics.board.player.task')}
            <textarea
              id={taskId}
              rows={2}
              value={entry?.task ?? ''}
              onChange={(event) => onTask(event.target.value)}
              onBlur={onCommit}
              placeholder={t('library.tactics.board.player.taskPlaceholder')}
              className={cn(FIELD, 'resize-none py-2 leading-prose')}
            />
          </label>

          <dl className="flex items-center justify-between gap-2 text-12">
            <dt className="text-ink-dim">{t('library.tactics.board.player.arrives')}</dt>
            <dd className="font-mono text-ink tabular-nums">
              {t('library.tactics.board.player.delay', { seconds: leg?.arriveSeconds ?? 0 })}
            </dd>
          </dl>

          <div className="flex items-center justify-between gap-2 text-12">
            <span className="text-ink-dim">{t('library.tactics.board.player.leaves')}</span>
            <span className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label={t('library.tactics.board.player.earlier')}
                disabled={delay <= 0}
                onClick={() => onDelay(delay - DELAY_STEP_SECONDS)}
              >
                <Minus />
              </Button>
              <span className="min-w-12 text-center font-mono text-13 tabular-nums">
                {t('library.tactics.board.player.delay', { seconds: delay })}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label={t('library.tactics.board.player.later')}
                onClick={() => onDelay(delay + DELAY_STEP_SECONDS)}
              >
                <Plus />
              </Button>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearRoute}
              disabled={!hasRoute}
              className="flex-1"
            >
              {t('library.tactics.board.player.standStill')}
            </Button>
            <Button
              variant="outline"
              onClick={onRemovePoint}
              disabled={!hasRoute}
              className="flex-1"
            >
              {t('library.tactics.board.player.removePoint')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function spawnSpotIndex(spots: readonly TacticPoint[], spawn: TacticPoint): number | null {
  return nearestSpawnIndex(spots, spawn, 2);
}
