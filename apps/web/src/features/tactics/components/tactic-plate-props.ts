import type { Lineup, TacticPoint, TacticSide, TacticStep } from '@disa/demo-core';
import type { NavGrid } from '@disa/map-data';
import type { RefObject } from 'react';
import type { TacticClock } from '../helpers/tactic-clock';
import type { TacticTool } from '../helpers/tactic-editor-state';
import type { EnemyMarks } from '../helpers/tactic-enemies';
import type { TacticSchedule } from '../helpers/tactic-schedule';
import type { PlateActions } from '../hooks/use-tactic-plate-pointer';

export interface TacticPlateProps {
  readonly map: string;
  readonly side: TacticSide;
  readonly grid: NavGrid | undefined;
  readonly schedule: TacticSchedule;
  readonly step: TacticStep | undefined;
  readonly stepIndex: number;
  readonly selectedSlot: number | null;
  /** What each step expects of the other side, by step index. */
  readonly enemyMarks: readonly EnemyMarks[];
  readonly selectedEnemyId: string | null;
  readonly tool: TacticTool;
  readonly clock: TacticClock;
  readonly isShown: boolean;
  /** Lineups of the kind being placed, shown only with the grenade tool. */
  readonly lineups: readonly Lineup[];
  /** Spawn spots a click can take, set only on the opening step with the select tool. */
  /** Where each slot starts the round. */
  readonly spawns: readonly TacticPoint[];
  readonly spawnSpots: readonly TacticPoint[] | undefined;
  readonly actions: PlateActions;
  /** Set by the plate to its own repaint, so the playback loop can paint without React. */
  readonly repaintRef: RefObject<() => void>;
  readonly onPreviewReach: (isReachable: boolean | null) => void;
}
