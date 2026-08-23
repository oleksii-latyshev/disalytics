import {
  type ParsedDemo,
  type PlayerSlot,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import {
  DEFAULT_RADAR_THEME,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  type RadarPoint,
  radarAssetPath,
} from '@disa/map-data';
import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { KillLine } from '@/core/events';
import { type Transport, useFrameReadout, useFrameSink } from '@/core/playback';
import { useCanvasLayers } from '@/core/renderer';
import { useFontReady } from '@/shared/hooks';
import { readRadarColors } from '../helpers/colors';
import { killLineLayer } from '../helpers/kill-line';
import { labelsBySlot, readLabelStyle } from '../helpers/labels';
import { playerTokens, radarBackdrop } from '../helpers/layers';
import { busiestLevelIndex, levelAt } from '../helpers/levels';
import { utilityLayer } from '../helpers/utility-layer';
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
  isAudibilityShown: boolean;
  isDebugShown: boolean;
}

export function RadarView({
  demo,
  overview,
  transport,
  selectedSlot,
  hoveredKill,
  isAudibilityShown,
  isDebugShown,
}: Props) {
  const t = useT();
  const [forcedLevelIndex, setForcedLevelIndex] = useState<number | null>(null);
  const [pointer, setPointer] = useState<RadarPoint | null>(null);

  // Which level is drawn follows the players, but off the 10 Hz readout rather than off the clock —
  // re-deciding it 60 times a second would flicker between floors as players cross the split.
  const frame = useFrameReadout(transport);
  const levelIndex = forcedLevelIndex ?? busiestLevelIndex(overview, demo.track, frame);
  const level = levelAt(overview, levelIndex);
  const image = useRadarImage(radarAssetPath(level, DEFAULT_RADAR_THEME));

  // The side a slot holds changes at halftime, so a token's colour follows the round rather than
  // the end-of-match roster — the same reasoning that put `PlayerEconomy.team` in the schema. The
  // rails read this too, and the two disagreeing for half a match is the failure this prevents.
  const roundIndex = roundIndexAtFrame(demo, frame);
  const teamBySlot = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const colors = useMemo(readRadarColors, []);
  const labelStyle = useMemo(readLabelStyle, []);

  // Chip widths are measured once per layer, so a label drawn before its webfont arrives would keep
  // the fallback's width for the whole demo. Waiting costs nothing: by the time a match is open the
  // rails have already asked for the same face.
  const isLabelFontReady = useFontReady(labelStyle.font);
  const labelBySlot = useMemo(
    () => (isLabelFontReady ? labelsBySlot(demo.header.players, demo.track.slotCount) : NO_LABELS),
    [demo.header.players, demo.track.slotCount, isLabelFontReady],
  );

  // The hovered row reaches the plate through a box rather than through the layer array, so a hover
  // repaints what is already built instead of rebuilding it — see `killLineLayer`.
  const hoveredKillRef = useRef<KillLine | null>(hoveredKill);

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
    });

    const utility = utilityLayer({ demo, clock: transport.clock, overview, colors });
    const killLine = killLineLayer({
      demo,
      clock: transport.clock,
      overview,
      levelIndex,
      colors,
      hovered: hoveredKillRef,
    });

    return image.status === 'ready'
      ? [radarBackdrop(image.image), utility, killLine, tokens]
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

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (!isDebugShown) return;

    const { left, top, width } = event.currentTarget.getBoundingClientRect();
    if (width === 0) return;

    const pixelsPerRadarPixel = width / RADAR_IMAGE_SIZE;

    setPointer({
      x: (event.clientX - left) / pixelsPerRadarPixel,
      y: (event.clientY - top) / pixelsPerRadarPixel,
    });
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
        className="aspect-square w-[min(100cqi,100cqb)] bg-surface-0"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setPointer(null)}
      />

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
