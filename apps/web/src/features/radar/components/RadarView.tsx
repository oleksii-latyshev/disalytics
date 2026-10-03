import {
  type ParsedDemo,
  type PlayerSlot,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import { Button } from '@disa/ui';
import { GraduationCap, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KillLine, RowFocus } from '@/core/events';
import { type Transport, useFrameReadout, useFrameSink } from '@/core/playback';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { useFontReady } from '@/shared/hooks';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { killLineLayer } from '../helpers/kill-line';
import { labelsBySlot, readLabelStyle } from '../helpers/labels';
import { plateBox } from '../helpers/plate-box';
import { playerTokens } from '../helpers/token-layer';
import { utilityLayer } from '../helpers/utility-layer';
import { MAX_ZOOM, MIN_ZOOM, plateView, ZOOM_STEP } from '../helpers/view';
import { useCoachMode } from '../hooks/use-coach-mode';
import { usePlateNavigation } from '../hooks/use-plate-navigation';
import { useRadarPlate } from '../hooks/use-radar-plate';
import { CoachCanvas } from './CoachCanvas';
import { CoachToolbar } from './CoachToolbar';
import { RadarDebug } from './RadarDebug';

/** Held outside the component so an unmeasurable font does not remount the layer every render. */
const NO_LABELS: readonly string[] = [];

interface Props {
  demo: ParsedDemo;
  overview: MapOverview;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
  focus: RowFocus | null;
  isSuspended: boolean;
  isCoachMode: boolean;
  onCoachModeChange: (active: boolean) => void;
  /** That the reader has zoomed in, which is the stage's business rather than the plate's — #315. */
  onExpandedChange: (isExpanded: boolean) => void;
}

export function RadarView({
  demo,
  overview,
  transport,
  selectedSlot,
  focus,
  isSuspended,
  isCoachMode,
  onCoachModeChange,
  onExpandedChange,
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
  const [isPlayerKeysShown] = useSetting('isPlayerKeysShown');
  const [isPlayerCrosshairShown] = useSetting('isPlayerCrosshairShown');
  const [pointer, setPointer] = useState<RadarPoint | null>(null);

  const frame = useFrameReadout(transport);
  const { layout, images, floorLabels } = useRadarPlate(overview, theme);
  const box = plateBox(layout);

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
  // repaints what is already built instead of rebuilding it — see `killLineLayer`. Two boxes rather
  // than one union, because the two are read by two layers and neither has anything to say about the
  // other's kind.
  const hoveredKillRef = useRef<KillLine | null>(null);
  const hoveredGrenadeRef = useRef<number | null>(null);

  // How the reader is looking at the plate, in a box for the same reason. Zoom is view state and
  // never playback state — DESIGN.md §6.3 — so it survives a scrub, a round jump and a pause. The
  // box is created here rather than inside `usePlateNavigation` because the layers below read it
  // too, and it has to exist before they are built.
  const viewRef = useRef(plateView());

  // Resolved to a string here rather than passed as `t`: `useT` returns a fresh function every
  // render, so a translator in the dependency list below would rebuild all four layers — and every
  // grenade's body with them — on every render. A string compares by value and holds still until
  // the locale actually moves.
  const secondsUnit = t('radar.utility.secondsUnit');

  // The array is what `useCanvasLayers` repaints on, so it holds still until something other than
  // the clock moves. The clock itself is read inside the layer, once per animation frame.
  const layers = useMemo(() => {
    const tokens = playerTokens({
      demo,
      clock: transport.clock,
      overview,
      teamBySlot,
      labelBySlot,
      selectedSlot,
      isAudibilityShown,
      isPlayerKeysShown,
      isPlayerCrosshairShown,
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
      hovered: hoveredGrenadeRef,
      view: viewRef,
      secondsUnit,
    });
    const killLine = killLineLayer({
      demo,
      clock: transport.clock,
      overview,
      colors,
      hovered: hoveredKillRef,
      view: viewRef,
    });

    return images.status === 'ready'
      ? [
          radarBackdrop({
            images: images.images,
            layout,
            floorLabels,
            labelColor: colors.dead,
            view: viewRef,
          }),
          utility,
          killLine,
          tokens,
        ]
      : [utility, killLine, tokens];
  }, [
    demo,
    transport,
    overview,
    teamBySlot,
    labelBySlot,
    selectedSlot,
    secondsUnit,
    isAudibilityShown,
    isPlayerKeysShown,
    isPlayerCrosshairShown,
    trajectories,
    colors,
    labelStyle,
    images,
    layout,
    floorLabels,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);
  useFrameSink(transport, repaint);

  // The one thing that has to repaint off a React state change rather than off the clock: while
  // playback is paused there is no frame to carry the line onto the plate.
  useEffect(() => {
    hoveredKillRef.current = focus?.kind === 'kill' ? focus.line : null;
    hoveredGrenadeRef.current = focus?.kind === 'grenade' ? focus.index : null;
    repaint();
  }, [focus, repaint]);

  const coachCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coachRepaintKey, setCoachRepaintKey] = useState(0);

  const triggerRepaint = useCallback(() => {
    repaint();
    setCoachRepaintKey((k) => k + 1);
  }, [repaint]);

  const coach = useCoachMode({
    demo,
    overview,
    view: viewRef,
    canvasRef: coachCanvasRef,
    teamBySlot,
    colors,
    frame,
  });

  const prevCoachModeRef = useRef(isCoachMode);
  useEffect(() => {
    if (prevCoachModeRef.current && !isCoachMode) {
      coach.resetAll();
    }
    prevCoachModeRef.current = isCoachMode;
  }, [isCoachMode, coach.resetAll]);

  const handleCoachToggle = useCallback(() => {
    if (isCoachMode) {
      onCoachModeChange(false);
    } else {
      transport.pause();
      onCoachModeChange(true);
    }
  }, [isCoachMode, onCoachModeChange, transport]);

  // Everything the reader can do to move the plate. The coordinate readout is the only consumer of
  // a hover, so the callback is handed over only while the overlay is on — DESIGN.md §9.2. Leaving
  // the plate stays here rather than going with it: the readout has to be cleared whether or not it
  // was being fed, or switching the overlay back on would show the point the pointer left from.
  const navigation = usePlateNavigation({
    view: viewRef,
    canvasRef,
    overlayCanvasRef: coachCanvasRef,
    repaint: triggerRepaint,
    isSuspended,
    plate: layout,
    onHover: isDebugShown ? setPointer : undefined,
  });

  const isExpanded = navigation.zoom > MIN_ZOOM;

  useEffect(() => {
    onExpandedChange(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // The radar is never cropped or letterboxed — DESIGN.md §4 — so at rest the canvas takes the
  // largest box of the plate's own shape the cell offers it, which is what the container units read. Everything
  // else on the stage floats over it: a row of its own would come straight out of the map's short
  // axis, which is the whole thing #110 set out to stop.
  //
  // Zoomed it fills the cell the stage has grown for it (#315), and it leaves the flow to do that.
  // A canvas carries an intrinsic size from its backing store, and that is a trap at both ends: in
  // the grid it sized the row `height: 100%` then resolved against, giving a 1392×1392 canvas in a
  // 1392×657 cell; out of it, `inset: 0` alone leaves a replaced element at its intrinsic width.
  return (
    <div className="relative grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        className={`touch-none bg-surface-0 data-[panning]:cursor-grabbing ${
          isExpanded ? 'absolute inset-0 size-full cursor-grab' : ''
        }`}
        style={isExpanded ? undefined : box.style}
        {...navigation.canvasProps}
        onPointerLeave={() => setPointer(null)}
      />

      {isCoachMode && (
        <CoachCanvas
          canvasRef={coachCanvasRef}
          isExpanded={isExpanded}
          annotations={coach.annotations}
          originalPlayerPoints={coach.originalPlayerPoints}
          teamBySlot={teamBySlot}
          overview={overview}
          colors={colors}
          view={viewRef}
          hoveredUtilityId={coach.hoveredUtilityId}
          hoveredPlayerSlot={coach.hoveredPlayerSlot}
          tool={coach.tool}
          repaintTrigger={coachRepaintKey}
          {...coach.canvasProps}
        />
      )}

      {/* DESIGN.md §6.3 puts the pair on the plate's bottom-right, and the plate is not the cell:
          the cell is wider than the box it centres, so the offset is half the slack on each axis
          plus the stage inset. **Written against the cell instead, it lands under the CT card when
          the plate is expanded** (#315) — the plate's own box is the map's either way, which is
          what keeps the pair on the map in both states. Colour and a hairline, never
          `.glass-panel` — §2.3 grants the one `backdrop-filter` over the live plate to the
          scoreboard and to nothing else. */}
      <div
        className="absolute flex flex-col gap-1 rounded-float border border-line bg-surface-1 p-1"
        style={{
          right: `calc((100cqi - ${box.width}) / 2 + 1rem)`,
          bottom: `calc((100cqb - ${box.height}) / 2 + 1rem)`,
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.zoomIn')}
          disabled={navigation.zoom >= MAX_ZOOM}
          onClick={() => navigation.zoomBy(ZOOM_STEP)}
        >
          <Plus aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.zoomOut')}
          disabled={navigation.zoom <= MIN_ZOOM}
          onClick={() => navigation.zoomBy(1 / ZOOM_STEP)}
        >
          <Minus aria-hidden="true" />
        </Button>

        <div className="my-0.5 h-px bg-line" />

        <Button
          type="button"
          variant={isCoachMode ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t(isCoachMode ? 'radar.coach.exit' : 'radar.coach.enter')}
          aria-pressed={isCoachMode}
          onClick={handleCoachToggle}
        >
          <GraduationCap aria-hidden="true" />
        </Button>
      </div>

      {isCoachMode && (
        <div
          className="pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2"
          style={{ bottom: `calc((100cqb - ${box.height}) / 2 + 1rem)` }}
        >
          <CoachToolbar
            tool={coach.tool}
            colorName={coach.colorName}
            canUndo={coach.canUndo}
            canRedo={coach.canRedo}
            onSelectTool={coach.setTool}
            onSelectColor={coach.setColorName}
            onUndo={coach.undo}
            onRedo={coach.redo}
            onClear={coach.clear}
            onExit={() => onCoachModeChange(false)}
          />
        </div>
      )}

      {/* The two surfaces allowed over the live canvas, and neither is chrome the reader did not
          ask for: the notice speaks only when the image failed, and the overlay only once it is
          switched on off the plate (DESIGN.md §6.3). Both are §2.2's tooltip case — `--ink` and
          alpha alone, no `backdrop-filter`. The strip itself takes no pointer events: it lies over
          the top of the canvas, and swallowing moves there would blank the coordinate readout in
          exactly the band §9.2 asks the overlay to answer. Its inset is margin rather than padding
          so that with both children silent it is a zero-height box and not 32px of nothing over the
          plate — which is what a §5.1 overlap sweep walking every element sees. */}
      <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start gap-3">
        {images.status === 'failed' && (
          <p className="rounded-float border border-line bg-surface-1 px-3 py-2 text-13 text-ink leading-prose">
            <Text path="radar.imageUnavailable" />
          </p>
        )}

        {isDebugShown && <RadarDebug overview={overview} frame={frame} pointer={pointer} />}
      </div>
    </div>
  );
}
