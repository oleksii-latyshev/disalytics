import type { TacticDrawingStroke, TacticThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, mapSpawns, radarAssetPath } from '@disa/map-data';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import {
  levelAt,
  MAX_ZOOM,
  MIN_ZOOM,
  plateView,
  radarColors,
  SQUARE_PLATE,
  squareBackdrop,
  UnknownMap,
  useRadarImage,
  ZOOM_STEP,
  zoomByStep,
} from '@/features/radar';
import { tacticLayer } from '../helpers/tactic-layer';
import { occupiedSpots } from '../helpers/tactic-spawns';
import { tacticStateAt } from '../helpers/tactic-step-state';
import { useTacticPlatePointer } from '../hooks/use-tactic-plate-pointer';
import { TacticZoomControls } from './TacticZoomControls';
import type { TacticPlateProps } from './tactic-plate-props';

function TacticCanvas({
  overview,
  ...props
}: Omit<TacticPlateProps, 'map'> & { readonly overview: MapOverview }) {
  const t = useT();
  const {
    side,
    steps,
    activeStepIndex = 0,
    currentTime,
    selectedSlot = null,
    selectedThrowId = null,
    levelIndex = 0,
    className,
    activeTool = 'select',
    lineups,
    hasZoomControls = false,
  } = props;

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, levelIndex), theme));
  const colors = radarColors(palette);

  const viewRef = useRef(plateView());
  const liveStrokeRef = useRef<TacticDrawingStroke | null>(null);
  const liveThrowRef = useRef<TacticThrow | null>(null);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [hoveredThrowId, setHoveredThrowId] = useState<string | null>(null);
  const [hoveredLineupId, setHoveredLineupId] = useState<string | null>(null);
  const shownLineups = activeTool === 'throw' ? lineups : undefined;

  const interpolated = useMemo(
    () => tacticStateAt(steps, activeStepIndex, currentTime),
    [steps, activeStepIndex, currentTime],
  );

  const spawns = useMemo(() => mapSpawns(overview.id, side ?? 'CT'), [overview.id, side]);
  const showsSpawns =
    props.isEditable === true &&
    activeStepIndex === 0 &&
    currentTime === undefined &&
    activeTool === 'select' &&
    spawns.length > 0;
  const spawnSpots = useMemo(
    () =>
      showsSpawns
        ? {
            points: spawns,
            occupied: occupiedSpots(spawns, interpolated.players),
            labels: spawns.map((_, index) => String(index + 1)),
          }
        : undefined,
    [showsSpawns, spawns, interpolated.players],
  );

  const layers = useMemo(() => {
    const layer = tacticLayer({
      overview,
      colors,
      view: viewRef,
      side,
      players: interpolated.players,
      throws: interpolated.visibleThrows,
      flyingGrenades: interpolated.flyingGrenades,
      activeUtilities: interpolated.activeUtilities,
      drawings: interpolated.drawings,
      selectedSlot,
      selectedThrowId,
      hoveredSlot,
      hoveredThrowId,
      lineups: shownLineups,
      hoveredLineupId,
      spawnSpots,
      liveStroke: liveStrokeRef,
      liveThrow: liveThrowRef,
    });

    return image.status === 'ready' ? [squareBackdrop(image.image, viewRef), layer] : [layer];
  }, [
    overview,
    colors,
    side,
    interpolated,
    selectedSlot,
    selectedThrowId,
    hoveredSlot,
    hoveredThrowId,
    shownLineups,
    hoveredLineupId,
    spawnSpots,
    image,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

  const [zoom, setZoom] = useState(MIN_ZOOM);
  const syncZoom = useCallback((next: number) => setZoom(Math.round(next * 10) / 10), []);
  const zoomBy = useCallback(
    (factor: number) => {
      const box = canvasRef.current?.getBoundingClientRect();
      if (box === undefined || box.width === 0) return;
      zoomByStep(viewRef.current, factor, box, SQUARE_PLATE);
      syncZoom(viewRef.current.zoom);
      repaint();
    },
    [canvasRef, repaint, syncZoom],
  );

  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleWheel } =
    useTacticPlatePointer({
      canvasRef,
      repaint,
      overview,
      interpolated,
      viewRef,
      liveStrokeRef,
      liveThrowRef,
      hover: {
        hoveredSlot,
        hoveredThrowId,
        hoveredLineupId,
        setHoveredSlot,
        setHoveredThrowId,
        setHoveredLineupId,
      },
      lineups: shownLineups,
      spawns: showsSpawns ? spawns : undefined,
      props,
      onZoomChange: syncZoom,
    });

  const cursorClass =
    activeTool === 'pencil' || activeTool === 'throw'
      ? 'cursor-crosshair'
      : activeTool === 'eraser'
        ? 'cursor-pointer'
        : 'cursor-default';

  return (
    <div className="grid size-full min-h-0 min-w-0 place-items-center [container-type:size]">
      <div className={className ?? 'relative aspect-square w-[min(100cqi,100cqb)]'}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onWheel={handleWheel}
          className={`size-full ${cursorClass} touch-none select-none rounded-card bg-surface-0`}
        />
        {hasZoomControls && (
          <TacticZoomControls
            zoom={zoom}
            canZoomIn={zoom < MAX_ZOOM}
            canZoomOut={zoom > MIN_ZOOM}
            onZoomIn={() => zoomBy(ZOOM_STEP)}
            onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          />
        )}
      </div>
    </div>
  );
}

export function TacticPlate(props: TacticPlateProps) {
  const overview = getMapOverview(props.map);

  if (overview === undefined) {
    return <UnknownMap map={props.map} />;
  }

  return <TacticCanvas {...props} overview={overview} />;
}
