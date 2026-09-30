import { useT } from '@disa/i18n';
import { radarAssetPath } from '@disa/map-data';
import { useMemo, useRef, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '@/features/radar/helpers/backdrop';
import { radarColors } from '@/features/radar/helpers/colors';
import { levelAt } from '@/features/radar/helpers/levels';
import { plateView } from '@/features/radar/helpers/view';
import { useRadarImage } from '@/features/radar/hooks/use-radar-image';
import { type ActiveDragPoint, lineupLayer } from '../helpers/lineup-layer';
import { groupLineupsByLanding, groupLineupsByOrigin, lineupPlot } from '../helpers/lineup-plot';
import { useLineupCanvasInteractions } from '../hooks/use-lineup-canvas-interactions';
import { LineupPlateContextMenu } from './LineupPlateContextMenu';
import { LineupPlateHud } from './LineupPlateHud';
import { LineupPlateZoomControls } from './LineupPlateZoomControls';
import type { ContextMenuData, LineupCanvasProps } from './lineup-plate-types';

export function LineupCanvas(props: LineupCanvasProps) {
  const {
    overview,
    lineups,
    focused,
    mode = 'view',
    selectedNodes,
    draftOrigin,
    draftWaypoints,
    isPlacing = false,
  } = props;
  const t = useT();
  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, 0), theme));
  const colors = radarColors(palette);
  const viewRef = useRef(plateView());

  const [zoom, setZoom] = useState(1);
  const [activeDrag, setActiveDrag] = useState<ActiveDragPoint | null>(null);
  const [hoverWorldPoint, setHoverWorldPoint] = useState<{ x: number; y: number } | null>(null);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing' | 'crosshair' | 'default'>(
    isPlacing ? 'crosshair' : mode === 'view' ? 'default' : 'crosshair',
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);

  const plot = useMemo(() => lineupPlot(overview, lineups), [overview, lineups]);
  const groups = useMemo(() => groupLineupsByOrigin(lineups), [lineups]);
  const landingGroups = useMemo(() => groupLineupsByLanding(lineups), [lineups]);

  const layers = useMemo(() => {
    const layer = lineupLayer({
      lineups,
      plot,
      groups,
      landingGroups,
      overview,
      colors,
      view: viewRef,
      focused,
      mode,
      selectedNodes,
      draftOrigin,
      draftWaypoints,
      hoverPoint: hoverWorldPoint,
      hideLineups: isPlacing,
      activeDrag,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), layer] : [layer];
  }, [
    lineups,
    plot,
    groups,
    landingGroups,
    overview,
    colors,
    image,
    focused,
    mode,
    selectedNodes,
    draftOrigin,
    draftWaypoints,
    hoverWorldPoint,
    isPlacing,
    activeDrag,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);
  const interactions = useLineupCanvasInteractions(props, {
    viewRef,
    canvasRef,
    repaint,
    plot,
    setActiveDrag,
    setHoverWorldPoint,
    setZoom,
    setCursorStyle,
    contextMenu,
    setContextMenu,
  });

  return (
    <div className="relative grid size-full min-h-0 min-w-0 place-items-center">
      <div className="relative aspect-square w-full max-w-[calc(100dvh-10rem)] overflow-hidden rounded-card lg:w-[min(100cqi,100cqb)] lg:max-w-none">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={interactions.handleClick}
          onAuxClick={interactions.handleAuxClick}
          onContextMenu={interactions.handleContextMenu}
          onWheel={interactions.handleWheel}
          onPointerDown={interactions.handlePointerDown}
          onPointerMove={interactions.handlePointerMove}
          onPointerUp={interactions.handlePointerUp}
          onPointerCancel={interactions.handlePointerCancel}
          className={`size-full bg-surface-0 ${
            cursorStyle === 'grab'
              ? 'cursor-grab'
              : cursorStyle === 'grabbing'
                ? 'cursor-grabbing'
                : cursorStyle === 'default'
                  ? 'cursor-default'
                  : 'cursor-crosshair'
          } ${zoom > 1 || (mode === 'edit' && !isPlacing) ? 'touch-none' : 'touch-pan-y'}`}
        />

        <LineupPlateHud plateProps={props} />
        <LineupPlateZoomControls zoom={zoom} onZoomChange={interactions.changeZoom} />
      </div>

      <LineupPlateContextMenu
        contextMenu={contextMenu}
        plateProps={props}
        onDismiss={() => setContextMenu(null)}
      />
    </div>
  );
}
