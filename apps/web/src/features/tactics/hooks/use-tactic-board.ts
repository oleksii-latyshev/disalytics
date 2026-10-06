import {
  canRemoveStep,
  type Lineup,
  type Tactic,
  type TacticPoint,
  tacticLoadout,
} from '@disa/demo-core';
import { type MapOverview, mapSpawns } from '@disa/map-data';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLineupCatalog } from '@/core/lineup-catalog';
import { selectableLineups, throwFromLineup } from '../helpers/lineup-throw';
import type { TacticTool } from '../helpers/tactic-editor-state';
import { type BoardHint, boardHint } from '../helpers/tactic-hint';
import { generateId } from '../helpers/tactic-ids';
import { toWorld } from '../helpers/tactic-route';
import { buildSchedule } from '../helpers/tactic-schedule';
import type { TacticShortcutActions } from '../helpers/tactic-shortcuts';
import type { PlateActions } from '../hooks/use-tactic-plate-pointer';
import { useTacticEditor } from './use-tactic-editor';
import { useTacticNavGrid } from './use-tactic-nav-grid';
import { useClockReadout, useTacticPlayback } from './use-tactic-playback';

export interface UseTacticBoardOptions {
  readonly initialTactic: Tactic;
  readonly overview: MapOverview;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
}

/** The editor, the schedule it implies and the playback over it, wired to what the board draws. */
export function useTacticBoard({ initialTactic, overview, onSave }: UseTacticBoardOptions) {
  const editor = useTacticEditor({ initialTactic, onSave });
  const { tactic, planId, stepIndex, steps, step, selectedSlot, tool, throwKind } = editor;

  const grid = useTacticNavGrid(tactic.map);
  const schedule = useMemo(
    () => buildSchedule({ overview, grid, tactic, planId }),
    [overview, grid, tactic, planId],
  );
  const stepSchedule = schedule.steps[stepIndex];

  const repaintRef = useRef<() => void>(() => undefined);
  const repaint = useCallback(() => repaintRef.current(), []);
  const playback = useTacticPlayback({
    schedule,
    stepIndex,
    onStepChange: editor.goToStep,
    repaint,
  });
  const { stop } = playback;

  const shownTactic = useRef(tactic);
  useEffect(() => {
    if (shownTactic.current === tactic) return;
    shownTactic.current = tactic;
    stop();
  }, [tactic, stop]);

  const { lineups } = useLineupCatalog(tactic.map);
  const pickableLineups = useMemo(
    () => selectableLineups(lineups, tactic.side, throwKind),
    [lineups, tactic.side, throwKind],
  );
  const spawnSpots = useMemo(() => {
    const spots = mapSpawns(tactic.map, tactic.side);
    return spots.map((spot): TacticPoint => ({ x: spot.x, y: spot.y }));
  }, [tactic.map, tactic.side]);
  const loadout = useMemo(() => tacticLoadout(tactic), [tactic]);

  const [previewUnreachable, setPreviewUnreachable] = useState<boolean | null>(null);
  const onPreviewReach = useCallback(
    (isReachable: boolean | null) =>
      setPreviewUnreachable(isReachable === null ? null : !isReachable),
    [],
  );

  const chooseTool = useCallback(
    (next: TacticTool) => {
      stop();
      editor.setTool(next);
      if (next !== 'select' && selectedSlot === null) editor.select(0);
    },
    [editor, selectedSlot, stop],
  );
  const chooseThrowKind = useCallback(
    (kind: Parameters<typeof editor.setThrowKind>[0]) => {
      stop();
      editor.setThrowKind(kind);
      if (selectedSlot === null) editor.select(0);
    },
    [editor, selectedSlot, stop],
  );

  const jump = useCallback(
    (direction: 'prev' | 'next') => {
      stop();
      editor.goToStep(stepIndex + (direction === 'next' ? 1 : -1));
    },
    [editor, stepIndex, stop],
  );

  const plateActions = useMemo((): PlateActions => {
    const endOfSelected = (): TacticPoint => {
      const leg = selectedSlot === null ? undefined : stepSchedule?.legs[selectedSlot];
      const last = (leg?.xs.length ?? 1) - 1;
      return toWorld(overview, { x: leg?.xs[last] ?? 0, y: leg?.ys[last] ?? 0 });
    };
    return {
      onSelect: editor.select,
      onAddWaypoint: editor.addWaypoint,
      onMoveWaypoint: editor.moveWaypoint,
      onPenStroke: editor.setPenRoute,
      onLineup: (lineup: Lineup) => {
        if (selectedSlot === null) return;
        const thrown = { ...throwFromLineup(lineup, selectedSlot), id: generateId('throw') };
        editor.addLineupThrow(thrown, { x: lineup.origin.x, y: lineup.origin.y });
      },
      onHandThrow: (to) => {
        if (selectedSlot === null) return;
        editor.addThrow({
          id: generateId('throw'),
          throwerSlot: selectedSlot,
          kind: throwKind,
          from: endOfSelected(),
          to,
          releaseTime: 0,
        });
      },
      onPickSpawn: (spot) => {
        const point = spawnSpots[spot];
        if (selectedSlot !== null && point !== undefined) editor.setSpawn(selectedSlot, point);
      },
      onEndGesture: editor.endGesture,
      onInteract: stop,
    };
  }, [editor, overview, selectedSlot, spawnSpots, stepSchedule, stop, throwKind]);

  const hint: BoardHint = boardHint({
    tool,
    selectedSlot,
    isDead: selectedSlot !== null && stepSchedule?.legs[selectedSlot]?.isDead === true,
    isShown: playback.isShown,
    isPreviewUnreachable: previewUnreachable,
    lineupCount: pickableLineups.length,
  });

  const readout = useClockReadout(playback.clock, playback.isPlaying);
  const clockSeconds = playback.isShown ? readout : (stepSchedule?.startSeconds ?? 0);
  const deleteCheck = canRemoveStep(tactic, planId, stepIndex);

  const shortcuts: TacticShortcutActions = {
    undo: editor.undo,
    redo: editor.redo,
    save: editor.save,
    play: playback.toggle,
    step: ({ direction }) => jump(direction),
    tool: ({ tool: next }) => chooseTool(next),
    grenade: ({ kind }) => chooseThrowKind(kind),
    player: ({ slot }) => {
      if (slot < schedule.slotCount) editor.select(slot);
    },
    removePoint: () => {
      if (selectedSlot !== null) editor.removeWaypoint(selectedSlot);
    },
  };

  return {
    editor,
    steps,
    step,
    grid,
    schedule,
    stepSchedule,
    playback,
    repaintRef,
    pickableLineups,
    lineups,
    spawnSpots,
    loadout,
    hint,
    onPreviewReach,
    chooseTool,
    chooseThrowKind,
    jump,
    plateActions,
    clockSeconds,
    deleteBlock: deleteCheck.ok ? null : deleteCheck.reason,
    shortcuts,
  };
}
