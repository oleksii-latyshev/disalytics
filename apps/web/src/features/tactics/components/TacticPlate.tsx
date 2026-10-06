import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, radarAssetPath } from '@disa/map-data';
import { useReducedMotionConfig } from '@disa/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { type TacticPreview, tacticLayer } from '../helpers/tactic-layer';
import { createMotion, isAnimating, startGlide } from '../helpers/tactic-motion';
import { createScene } from '../helpers/tactic-scene';
import type { SpawnSpots } from '../helpers/tactic-spawn-markers';
import { useTacticPlatePointer } from '../hooks/use-tactic-plate-pointer';
import { TacticZoomControls } from './TacticZoomControls';
import type { TacticPlateProps } from './tactic-plate-props';

const AMBIENT_FRAME_MS = 33;

function TacticCanvas({
  overview,
  ...props
}: Omit<TacticPlateProps, 'map'> & { readonly overview: MapOverview }) {
  const t = useT();
  const { side, schedule, step, stepIndex, selectedSlot, tool, clock, isShown } = props;
  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');
  const isReduced = useReducedMotionConfig() === true;

  const image = useRadarImage(radarAssetPath(levelAt(overview, 0), theme));
  const colors = radarColors(palette);

  const viewRef = useRef(plateView());
  const previewRef = useRef<TacticPreview | null>(null);
  const liveStrokeRef = useRef<readonly { x: number; y: number }[] | null>(null);
  const [hover, setHover] = useState<{ handle: number | null; lineupId: string | null }>({
    handle: null,
    lineupId: null,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: a preview belongs to the player, tool and step it was drawn for
  useEffect(() => {
    previewRef.current = null;
    props.onPreviewReach(null);
  }, [selectedSlot, tool, stepIndex, isShown, props.onPreviewReach]);

  const scene = useMemo(() => createScene(schedule), [schedule]);
  const motion = useMemo(() => createMotion(schedule.slotCount), [schedule.slotCount]);
  motion.isReduced = isReduced;

  const previousStep = useRef(stepIndex);
  useEffect(() => {
    if (previousStep.current === stepIndex) return;
    previousStep.current = stepIndex;
    if (!clock.isShown) startGlide(motion, performance.now());
  }, [stepIndex, motion, clock]);

  const spawnSpots = useMemo((): SpawnSpots | undefined => {
    const points = props.spawnSpots;
    if (points === undefined || isShown) return undefined;
    return {
      points,
      occupied: points.map((spot) =>
        props.spawns.some((spawn) => spawn.x === spot.x && spawn.y === spot.y),
      ),
      labels: points.map((_, index) => String(index + 1)),
    };
  }, [props.spawnSpots, props.spawns, isShown]);

  const layers = useMemo(() => {
    const layer = tacticLayer({
      overview,
      colors,
      view: viewRef,
      side,
      schedule,
      step,
      stepIndex,
      selectedSlot,
      clock,
      scene,
      motion,
      lineups: tool === 'grenade' ? props.lineups : undefined,
      hoveredLineupId: hover.lineupId,
      hoveredHandle: hover.handle,
      spawnSpots,
      preview: previewRef,
      liveStroke: liveStrokeRef,
    });
    return image.status === 'ready' ? [squareBackdrop(image.image, viewRef), layer] : [layer];
  }, [
    overview,
    colors,
    side,
    schedule,
    step,
    stepIndex,
    selectedSlot,
    clock,
    scene,
    motion,
    tool,
    props.lineups,
    hover,
    spawnSpots,
    image,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);
  const { repaintRef } = props;
  useEffect(() => {
    repaintRef.current = repaint;
  }, [repaintRef, repaint]);

  useEffect(() => {
    let handle = 0;
    let lastMs = 0;
    const frame = (nowMs: number) => {
      handle = requestAnimationFrame(frame);
      if (clock.isShown || nowMs - lastMs < AMBIENT_FRAME_MS) return;
      const hasArcs = (schedule.steps[stepIndex]?.throws.length ?? 0) > 0;
      if (isAnimating(motion, nowMs) || previewRef.current !== null || (hasArcs && !isReduced)) {
        lastMs = nowMs;
        repaint();
      }
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [clock, motion, repaint, schedule, stepIndex, isReduced]);

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

  const pointer = useTacticPlatePointer({
    canvasRef,
    repaint,
    overview,
    grid: props.grid,
    viewRef,
    previewRef,
    liveStrokeRef,
    tool,
    selectedSlot,
    step,
    stepSchedule: schedule.steps[stepIndex],
    lineups: tool === 'grenade' ? props.lineups : undefined,
    spawnSpots: props.spawnSpots,
    actions: props.actions,
    isShown,
    onHover: setHover,
    onPreviewReach: props.onPreviewReach,
    onZoomChange: syncZoom,
  });

  const cursor = tool === 'select' ? 'cursor-default' : 'cursor-crosshair';

  return (
    <div className="grid size-full min-h-0 min-w-0 place-items-center [container-type:size]">
      <div className="relative aspect-square w-[min(100cqi,100cqb)]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onPointerDown={pointer.handlePointerDown}
          onPointerMove={pointer.handlePointerMove}
          onPointerUp={pointer.handlePointerUp}
          onPointerCancel={pointer.handlePointerUp}
          onPointerLeave={pointer.handlePointerLeave}
          onWheel={pointer.handleWheel}
          className={`size-full ${cursor} touch-none select-none rounded-card bg-surface-0`}
        />
        <TacticZoomControls
          zoom={zoom}
          canZoomIn={zoom < MAX_ZOOM}
          canZoomOut={zoom > MIN_ZOOM}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        />
      </div>
    </div>
  );
}

export function TacticPlate(props: TacticPlateProps) {
  const overview = getMapOverview(props.map);
  if (overview === undefined) return <UnknownMap map={props.map} />;
  return <TacticCanvas {...props} overview={overview} />;
}
