import type { TacticDrawingStroke, TacticThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, radarAssetPath } from '@disa/map-data';
import { useMemo, useRef, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import {
  levelAt,
  plateView,
  radarColors,
  squareBackdrop,
  UnknownMap,
  useRadarImage,
} from '@/features/radar';
import { tacticLayer } from '../helpers/tactic-layer';
import { tacticStateAt } from '../helpers/tactic-step-state';
import { useTacticPlatePointer } from '../hooks/use-tactic-plate-pointer';
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
    image,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

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
      props,
    });

  const cursorClass =
    activeTool === 'pencil' || activeTool === 'throw'
      ? 'cursor-crosshair'
      : activeTool === 'eraser'
        ? 'cursor-pointer'
        : 'cursor-default';

  return (
    <div className="grid size-full min-h-0 min-w-0 place-items-center [container-type:size]">
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
        className={
          className ??
          `aspect-square w-[min(100cqi,100cqb)] ${cursorClass} select-none rounded-card bg-surface-0`
        }
      />
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
