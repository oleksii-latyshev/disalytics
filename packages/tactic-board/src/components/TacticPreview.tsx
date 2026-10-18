import { type Tactic, tacticLoadout } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, mapFloors } from '@disa/map-data';
import { UnknownMap } from '@disa/plate';
import { cn } from '@disa/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { enemyMarksByStep } from '../helpers/tactic-enemies';
import { planGraph } from '../helpers/tactic-plan-graph';
import { previewPlanId, previewSteps, readOnlyActions } from '../helpers/tactic-preview';
import { buildSchedule, formatRoundClock } from '../helpers/tactic-schedule';
import { useTacticNavGrid } from '../hooks/use-tactic-nav-grid';
import { useClockReadout, useTacticPlayback } from '../hooks/use-tactic-playback';
import { TacticPlanStrip } from './TacticPlanStrip';
import { TacticPlate } from './TacticPlate';
import { TacticRoster } from './TacticRoster';
import { TacticStepReadout } from './TacticStepReadout';
import { TacticTransport } from './TacticTransport';

export interface TacticPreviewProps {
  /** The tactic to play. Read-only: nothing on the plate or the roster edits it. */
  readonly tactic: Tactic;
  /** The row across the top. */
  readonly header: ReactNode;
  /** Under the step readout in the right column, where the editor has the step's fields. */
  readonly detail?: ReactNode;
  /** Under the transport and the step row, across the bottom. */
  readonly footer?: ReactNode;
  /** Seconds the tactic's own zero lies after the round's freeze end, for a window that starts later. */
  readonly roundOffsetSeconds?: number | undefined;
  readonly className?: string | undefined;
}

export function TacticPreview(props: TacticPreviewProps) {
  const overview = getMapOverview(props.tactic.map);
  if (overview === undefined) return <UnknownMap map={props.tactic.map} />;
  return <PreviewBoard {...props} overview={overview} />;
}

function PreviewBoard({
  tactic,
  header,
  detail,
  footer,
  roundOffsetSeconds = 0,
  className,
  overview,
}: TacticPreviewProps & { readonly overview: NonNullable<ReturnType<typeof getMapOverview>> }) {
  const t = useT();
  const planId = previewPlanId(tactic);
  const steps = useMemo(() => previewSteps(tactic), [tactic]);
  const grid = useTacticNavGrid(tactic.map);
  const schedule = useMemo(
    () => buildSchedule({ overview, grid, tactic, planId }),
    [overview, grid, tactic, planId],
  );
  const graph = useMemo(() => planGraph(tactic, planId), [tactic, planId]);
  const schedules = useMemo(() => new Map([[planId, schedule]]), [planId, schedule]);
  const formatSeconds = useCallback(
    (seconds: number) => formatRoundClock(seconds + roundOffsetSeconds),
    [roundOffsetSeconds],
  );
  const loadout = useMemo(() => tacticLoadout(tactic), [tactic]);
  const enemyMarks = useMemo(() => enemyMarksByStep(steps), [steps]);

  const [requestedStep, setRequestedStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [requestedFloor, setFloor] = useState(0);
  const floor = Math.min(requestedFloor, mapFloors(overview).length - 1);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new map starts on its first floor
  useEffect(() => setFloor(0), [tactic.map]);
  const stepIndex = Math.min(requestedStep, Math.max(0, steps.length - 1));
  const step = steps[stepIndex];
  const stepSchedule = schedule.steps[stepIndex];

  const repaintRef = useRef<() => void>(() => undefined);
  const playback = useTacticPlayback({
    schedule,
    stepIndex,
    onStepChange: setRequestedStep,
    repaint: () => repaintRef.current(),
  });
  const { stop } = playback;

  const shownTactic = useRef(tactic);
  useEffect(() => {
    if (shownTactic.current === tactic) return;
    shownTactic.current = tactic;
    stop();
  }, [tactic, stop]);

  const actions = useMemo(() => readOnlyActions(setSelectedSlot, stop), [stop]);
  const readout = useClockReadout(playback.clock, playback.isPlaying);
  const clockSeconds = playback.isShown ? readout : (stepSchedule?.startSeconds ?? 0);

  const jump = (direction: -1 | 1) => {
    stop();
    setRequestedStep(stepIndex + direction);
  };

  return (
    <section
      className={cn(
        'flex h-full w-full flex-col overflow-y-auto bg-surface-0 font-sans text-ink selection:bg-white/20 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:overflow-hidden xl:grid-cols-[17rem_minmax(0,1fr)_20rem]',
        className,
      )}
      aria-label={t('library.tactics.preview.label')}
    >
      <div className="lg:col-span-3">{header}</div>

      <TacticRoster
        side={tactic.side}
        loadout={loadout}
        weapons={tactic.weapons}
        step={step}
        stepIndex={stepIndex}
        stepSchedule={stepSchedule}
        selectedSlot={selectedSlot}
        onSelect={(slot) => {
          stop();
          setSelectedSlot(slot);
        }}
      />

      <div className="@container relative aspect-square w-full shrink-0 lg:aspect-auto lg:h-full lg:min-h-0 lg:min-w-0">
        <TacticPlate
          map={tactic.map}
          side={tactic.side}
          grid={grid}
          schedule={schedule}
          step={step}
          stepIndex={stepIndex}
          selectedSlot={selectedSlot}
          enemyMarks={enemyMarks}
          selectedEnemyId={null}
          tool="select"
          clock={playback.clock}
          isShown={playback.isShown}
          floor={floor}
          onFloor={setFloor}
          lineups={[]}
          spawns={tactic.spawns}
          spawnSpots={undefined}
          actions={actions}
          repaintRef={repaintRef}
          onPreviewReach={() => undefined}
          isReadOnly
        />
      </div>

      <aside className="flex min-h-0 flex-col overflow-y-auto">
        <TacticStepReadout
          step={step}
          stepIndex={stepIndex}
          stepCount={steps.length}
          stepSchedule={stepSchedule}
          formatSeconds={formatSeconds}
        />
        {detail}
      </aside>

      <footer className="flex flex-col [border-block-start:1px_solid_var(--color-line)] lg:col-span-3">
        <TacticTransport
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          seconds={clockSeconds}
          canPrev={stepIndex > 0}
          canNext={stepIndex < steps.length - 1}
          onPrev={() => jump(-1)}
          onNext={() => jump(1)}
          onToggle={playback.toggle}
          onSpeed={playback.setSpeed}
          formatSeconds={formatSeconds}
          hint={null}
        />
        <TacticPlanStrip
          graph={graph}
          schedules={schedules}
          formatSeconds={formatSeconds}
          selected={{ planId, index: stepIndex }}
          onOpen={(key) => {
            stop();
            setRequestedStep(key.index);
          }}
        />
        {footer}
      </footer>
    </section>
  );
}
