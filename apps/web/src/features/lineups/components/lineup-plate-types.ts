import type { Lineup } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import type { MutableRefObject } from 'react';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
import type { LineupHit, LineupNode } from '../helpers/lineup-plot';

export interface LineupPlateProps {
  readonly map: string;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly mode?: 'view' | 'edit' | undefined;
  readonly selectedNodes?: readonly SelectedLineupNode[] | undefined;
  readonly onSelect: (hit: LineupHit | null, modifierKey?: boolean) => void;
  readonly onSelectNode?: ((node: LineupNode | null, modifierKey?: boolean) => void) | undefined;
  readonly onPlacePoint?:
    | ((point: { readonly x: number; readonly y: number }, isBounce?: boolean) => void)
    | undefined;
  readonly isPlacing?: boolean | undefined;
  readonly isAddingBounce?: boolean | undefined;
  readonly onToggleAddBounce?: (() => void) | undefined;
  readonly onCancelPlacement?: (() => void) | undefined;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly onUpdatePoint?:
    | ((
        lineupId: string,
        target: 'origin' | 'landing' | 'waypoint',
        point: { readonly x: number; readonly y: number },
        waypointIndex?: number,
      ) => void)
    | undefined;
  readonly onMergeSelected?: (() => void) | undefined;
  readonly onMergeLandings?: (() => void) | undefined;
  readonly onMergeOrigins?: (() => void) | undefined;
  readonly onUnmergeLineup?: ((lineupId: string) => void) | undefined;
  readonly onAddBounceToLineup?: ((lineupId: string) => void) | undefined;
  readonly onDeleteBounceFromLineup?:
    | ((lineupId: string, waypointIndex: number) => void)
    | undefined;
  readonly onEditLineup?: ((lineup: Lineup) => void) | undefined;
  readonly onDeleteLineup?: ((lineupId: string) => void) | undefined;
  readonly onDeleteSelected?: (() => void) | undefined;
}

export interface LineupCanvasProps extends LineupPlateProps {
  readonly overview: MapOverview;
}

export interface ContextMenuData {
  readonly x: number;
  readonly y: number;
  readonly hitLineup: Lineup | null;
  readonly hitWaypointIndex: number | null;
}

export interface CanvasPanDrag {
  x: number;
  y: number;
  moved: boolean;
}

export interface CanvasNodeDrag {
  target: 'origin' | 'landing' | 'waypoint';
  waypointIndex?: number | undefined;
  moved: boolean;
  lineupId: string;
}

export interface LineupCanvasDragRefs {
  readonly dragRef: MutableRefObject<CanvasPanDrag | null>;
  readonly pointDragRef: MutableRefObject<CanvasNodeDrag | null>;
  readonly suppressClickRef: MutableRefObject<boolean>;
}
