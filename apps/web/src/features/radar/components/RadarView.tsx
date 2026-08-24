import {
  type ParsedDemo,
  type PlayerSlot,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import {
  type MapOverview,
  RADAR_IMAGE_SIZE,
  type RadarPoint,
  radarAssetPath,
} from '@disa/map-data';
import { Button } from '@disa/ui';
import { Minus, Plus } from 'lucide-react';
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KillLine } from '@/core/events';
import { type Transport, useFrameReadout, useFrameSink } from '@/core/playback';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { useShortcuts } from '@/core/shortcuts';
import { useFontReady } from '@/shared/hooks';
import { radarColors } from '../helpers/colors';
import { killLineLayer } from '../helpers/kill-line';
import { labelsBySlot, readLabelStyle } from '../helpers/labels';
import { playerTokens, radarBackdrop } from '../helpers/layers';
import { busiestLevelIndex, levelAt } from '../helpers/levels';
import { utilityLayer } from '../helpers/utility-layer';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  plateView,
  resetView,
  ZOOM_STEP,
  zoomAbout,
  zoomByStep,
} from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { RadarDebug } from './RadarDebug';

/** Held outside the component so an unmeasurable font does not remount the layer every render. */
const NO_LABELS: readonly string[] = [];

interface Props {
  demo: ParsedDemo;
  overview: MapOverview;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
  hoveredKill: KillLine | null;
  isSuspended: boolean;
}

export function RadarView({
  demo,
  overview,
  transport,
  selectedSlot,
  hoveredKill,
  isSuspended,
}: Props) {
  const t = useT();

  // Everything on the plate the reader gets a say over — DESIGN.md §10.5. These are read here
  // rather than handed down from the stage: the plate is the only consumer of any of them, and a
  // prop per row would be six props that exist only to be passed on.
  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');
  const [isAudibilityShown] = useSetting('isAudibilityShown');
  const [arePlayerNamesShown] = useSetting('arePlayerNamesShown');
  const [trajectories] = useSetting('trajectories');
  const [isDebugShown] = useSetting('isDebugShown');
  const [forcedLevelIndex, setForcedLevelIndex] = useState<number | null>(null);
  const [pointer, setPointer] = useState<RadarPoint | null>(null);

  // Which level is drawn follows the players, but off the 10 Hz readout rather than off the clock —
  // re-deciding it 60 times a second would flicker between floors as players cross the split.
  const frame = useFrameReadout(transport);
  const levelIndex = forcedLevelIndex ?? busiestLevelIndex(overview, demo.track, frame);
  const level = levelAt(overview, levelIndex);
  const image = useRadarImage(radarAssetPath(level, theme));

  // The side a slot holds changes at halftime, so a token's colour follows the round rather than
  // the end-of-match roster — the same reasoning that put `PlayerEconomy.team` in the schema. The
  // rails read this too, and the two disagreeing for half a match is the failure this prevents.
  const roundIndex = roundIndexAtFrame(demo, frame);
  const teamBySlot = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const colors = radarColors(palette);
  const labelStyle = useMemo(readLabelStyle, []);

  // Chip widths are measured once per layer, so a label drawn before its webfont arrives would keep
  // the fallback's width for the whole demo. Waiting costs nothing: by the time a match is open the
  // rails have already asked for the same face.
  const isLabelFontReady = useFontReady(labelStyle.font);
  const labelBySlot = useMemo(
    () =>
      isLabelFontReady && arePlayerNamesShown
        ? labelsBySlot(demo.header.players, demo.track.slotCount)
        : NO_LABELS,
    [demo.header.players, demo.track.slotCount, isLabelFontReady, arePlayerNamesShown],
  );

  // The hovered row reaches the plate through a box rather than through the layer array, so a hover
  // repaints what is already built instead of rebuilding it — see `killLineLayer`.
  const hoveredKillRef = useRef<KillLine | null>(hoveredKill);

  // How the reader is looking at the plate, in a box for the same reason. Zoom is view state and
  // never playback state — DESIGN.md §6.3 — so it survives a scrub, a round jump and a pause, and
  // a drag repaints the layers that exist rather than rebuilding them. `zoom` beside it is a copy
  // the `+`/`−` pair reads to know when it has run out of range; nothing draws from it.
  const viewRef = useRef(plateView());
  const panRef = useRef({ isPanning: false, x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);

  // The array is what `useCanvasLayers` repaints on, so it holds still until something other than
  // the clock moves. The clock itself is read inside the layer, once per animation frame.
  const layers = useMemo(() => {
    const tokens = playerTokens({
      demo,
      clock: transport.clock,
      overview,
      levelIndex,
      teamBySlot,
      labelBySlot,
      selectedSlot,
      isAudibilityShown,
      colors,
      labelStyle,
      view: viewRef,
    });

    const utility = utilityLayer({
      demo,
      clock: transport.clock,
      overview,
      colors,
      trajectories,
      selectedSlot,
      view: viewRef,
    });
    const killLine = killLineLayer({
      demo,
      clock: transport.clock,
      overview,
      levelIndex,
      colors,
      hovered: hoveredKillRef,
      view: viewRef,
    });

    return image.status === 'ready'
      ? [radarBackdrop(image.image, viewRef), utility, killLine, tokens]
      : [utility, killLine, tokens];
  }, [
    demo,
    transport,
    overview,
    levelIndex,
    teamBySlot,
    labelBySlot,
    selectedSlot,
    isAudibilityShown,
    trajectories,
    colors,
    labelStyle,
    image,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);
  useFrameSink(transport, repaint);

  // The one thing that has to repaint off a React state change rather than off the clock: while
  // playback is paused there is no frame to carry the line onto the plate.
  useEffect(() => {
    hoveredKillRef.current = hoveredKill;
    repaint();
  }, [hoveredKill, repaint]);

  // Measured in the handler rather than kept in a ref: a pointer event is not the frame path, and
  // the plate's box is the one thing a resize can change without telling this component.
  const plateBox = useCallback(
    () => canvasRef.current?.getBoundingClientRect() ?? null,
    [canvasRef],
  );

  const zoomStep = useCallback(
    (factor: number) => {
      const box = plateBox();
      if (box === null) return;

      zoomByStep(viewRef.current, factor, box);
      setZoom(viewRef.current.zoom);
      repaint();
    },
    [plateBox, repaint],
  );

  // DESIGN.md §9.1's `+` and `−`, bound here rather than on the stage: the view they move is this
  // component's own box, and reaching it from there would mean a second source of truth for the
  // zoom. What the second call does not get for free is the stage's suspension, which is why that
  // arrives as a prop — a plate that zooms behind an open sheet is the failure this avoids.
  useShortcuts(
    {
      zoomIn: () => zoomStep(ZOOM_STEP),
      zoomOut: () => zoomStep(1 / ZOOM_STEP),
    },
    { isSuspended },
  );

  // Non-passive, because a wheel over the plate zooms instead of scrolling the page and only a
  // `preventDefault` says so. React's own `onWheel` is delegated and cannot promise that.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();

      const box = canvas.getBoundingClientRect();
      if (box.width === 0) return;

      zoomAbout(
        viewRef.current,
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
        event.clientX - box.left,
        event.clientY - box.top,
        box,
      );
      setZoom(viewRef.current.zoom);
      repaint();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, repaint]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (viewRef.current.zoom === MIN_ZOOM) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { isPanning: true, x: event.clientX, y: event.clientY };
    // Written straight onto the element: a state change per drag would render the plate's whole
    // component to change a cursor.
    event.currentTarget.dataset.panning = 'true';
  }

  function endPan(event: PointerEvent<HTMLCanvasElement>): void {
    panRef.current.isPanning = false;
    delete event.currentTarget.dataset.panning;
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;

    const pan = panRef.current;
    if (pan.isPanning) {
      panBy(viewRef.current, event.clientX - pan.x, event.clientY - pan.y, box);
      pan.x = event.clientX;
      pan.y = event.clientY;
      repaint();
      return;
    }

    if (!isDebugShown) return;

    // The readout answers for the world under the pointer, so it reads through the same zoom and
    // pan the layers draw with — DESIGN.md §9.2.
    const { zoom: current, panX, panY } = viewRef.current;
    const pixelsPerRadarPixel = (box.width / RADAR_IMAGE_SIZE) * current;

    setPointer({
      x: (event.clientX - box.left - panX) / pixelsPerRadarPixel,
      y: (event.clientY - box.top - panY) / pixelsPerRadarPixel,
    });
  }

  function handleDoubleClick(): void {
    resetView(viewRef.current);
    setZoom(MIN_ZOOM);
    repaint();
  }

  // The radar is never cropped or letterboxed — DESIGN.md §4 — so the canvas takes the smaller of
  // the two axes the cell offers it, which is what the container units read. Everything else on the
  // stage floats over it: a row of its own would come straight out of the map's short axis, which
  // is the whole thing #110 set out to stop.
  return (
    <div className="relative grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        className={`aspect-square w-[min(100cqi,100cqb)] touch-none bg-surface-0 data-[panning]:cursor-grabbing ${
          zoom > MIN_ZOOM ? 'cursor-grab' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={handleDoubleClick}
        onPointerLeave={() => setPointer(null)}
      />

      {/* DESIGN.md §6.3 puts the pair on the plate's bottom-right, and the plate is not the cell:
          above the split the cell is wider than the square it centres, so the offset is half the
          slack on each axis plus the stage inset. Colour and a hairline, never `.glass-panel` —
          §2.3 grants the one `backdrop-filter` over the live plate to the scoreboard and to nothing
          else. */}
      <div className="absolute right-[calc((100cqi-min(100cqi,100cqb))/2+1rem)] bottom-[calc((100cqb-min(100cqi,100cqb))/2+1rem)] flex flex-col gap-1 rounded-float border border-line bg-glass-panel p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.zoomIn')}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => zoomStep(ZOOM_STEP)}
        >
          <Plus aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.zoomOut')}
          disabled={zoom <= MIN_ZOOM}
          onClick={() => zoomStep(1 / ZOOM_STEP)}
        >
          <Minus aria-hidden="true" />
        </Button>
      </div>

      {/* The two surfaces allowed over the live canvas, and neither is chrome the reader did not
          ask for: the notice speaks only when the image failed, and the overlay only once it is
          switched on off the plate (DESIGN.md §6.3). Both are §2.2's tooltip case — `--ink` and
          alpha alone, no `backdrop-filter`. The strip itself takes no pointer events: it lies over
          the top of the canvas, and swallowing moves there would blank the coordinate readout in
          exactly the band §9.2 asks the overlay to answer. Its inset is margin rather than padding
          so that with both children silent it is a zero-height box and not 32px of nothing over the
          plate — which is what a §5.1 overlap sweep walking every element sees. */}
      <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start gap-3">
        {image.status === 'failed' && (
          <p className="rounded-float border border-line bg-glass-panel px-3 py-2 text-13 text-ink leading-prose shadow-raised">
            <Text path="radar.imageUnavailable" />
          </p>
        )}

        {isDebugShown && (
          <RadarDebug
            overview={overview}
            frame={frame}
            levelIndex={levelIndex}
            isLevelForced={forcedLevelIndex !== null}
            pointer={pointer}
            onLevelChange={setForcedLevelIndex}
          />
        )}
      </div>
    </div>
  );
}
