import type { Lineup } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import {
  type PlateView,
  plateGeometry,
  type RadarColors,
  readPlateGeometry,
  SQUARE_PLATE,
} from '@/features/radar';
import { drawDraftPlacement } from './lineup-layer-drawing';
import { drawGroupBadges } from './lineup-layer-markers';
import { createLineupPainter } from './lineup-layer-painter';
import type { ActiveDragPoint, SelectedLineupNode } from './lineup-nodes';
import type { LineupGroup } from './lineup-plot';

const UNFOCUSED_ALPHA = 0.15;
const DEFAULT_ALPHA = 0.75;
const FOCUSED_ALPHA = 1.0;

export interface LineupLayerOptions {
  readonly lineups: readonly Lineup[];
  readonly plot: Float32Array;
  readonly groups: readonly LineupGroup[];
  readonly landingGroups?: readonly LineupGroup[] | undefined;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly focused: number | null;
  readonly mode?: 'view' | 'edit' | undefined;
  readonly selectedNodes?: readonly SelectedLineupNode[] | undefined;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly hoverPoint?: { readonly x: number; readonly y: number } | null | undefined;
  readonly hideLineups?: boolean | undefined;
  readonly activeDrag?: ActiveDragPoint | null | undefined;
}

/**
 * Draws grenade lineups across the radar map:
 * - An origin marker where the player stands (color-coded by side).
 * - A curved trajectory flight arc from origin to landing (with optional bounce waypoints).
 * - A landing marker with the grenade's effect radius ring.
 *
 * Lineups are drawn deterministically with zero allocations during paint.
 */
export function lineupLayer(options: LineupLayerOptions): Layer {
  const {
    lineups,
    plot,
    groups,
    landingGroups,
    overview,
    colors,
    view,
    focused,
    mode = 'view',
    selectedNodes,
    draftOrigin,
    draftWaypoints,
    hoverPoint,
    hideLineups,
    activeDrag,
  } = options;
  const geometry = plateGeometry();
  const drawLineup = createLineupPainter({
    lineups,
    plot,
    overview,
    colors,
    geometry,
    isEditing: mode === 'edit',
    selectedNodes,
    activeDrag,
  });

  const drawLineups = (context: CanvasRenderingContext2D) => {
    const isAnyFocused = focused !== null;
    const baseAlpha = isAnyFocused ? UNFOCUSED_ALPHA : DEFAULT_ALPHA;
    const baseWidth = isAnyFocused ? 1 : 1.5;

    for (let i = 0; i < lineups.length; i++) {
      if (i !== focused) drawLineup(context, i, baseAlpha, baseWidth * geometry.scale, false);
    }
    if (focused !== null) {
      drawLineup(context, focused, FOCUSED_ALPHA, 2.5 * geometry.scale, true);
    }

    drawGroupBadges(
      context,
      groups,
      plot,
      'origin',
      geometry.scale,
      colors.selectionRing,
      colors.selectionEdge,
    );
    if (landingGroups && landingGroups.length > 0) {
      drawGroupBadges(
        context,
        landingGroups,
        plot,
        'landing',
        geometry.scale,
        colors.selectionRing,
        colors.selectionEdge,
      );
    }
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, SQUARE_PLATE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    if (!hideLineups) drawLineups(context);

    drawDraftPlacement(
      context,
      draftOrigin,
      draftWaypoints,
      hoverPoint,
      overview,
      geometry.scale,
      colors,
    );
  };
}
