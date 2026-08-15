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
import { Button } from '@disa/ui';
import { type PointerEvent, useMemo, useState } from 'react';
import { type Transport, useFrameReadout, useFrameSink } from '@/core/playback';
import { useCanvasLayers } from '@/core/renderer';
import { useFontReady } from '@/shared/hooks';
import { readRadarColors } from '../helpers/colors';
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
  isAudibilityShown: boolean;
}

export function RadarView({ demo, overview, transport, selectedSlot, isAudibilityShown }: Props) {
  const t = useT();
  const [forcedLevelIndex, setForcedLevelIndex] = useState<number | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
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

    return image.status === 'ready'
      ? [radarBackdrop(image.image), utility, tokens]
      : [utility, tokens];
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

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (!isDebugOpen) return;

    const { left, top, width } = event.currentTarget.getBoundingClientRect();
    if (width === 0) return;

    const pixelsPerRadarPixel = width / RADAR_IMAGE_SIZE;

    setPointer({
      x: (event.clientX - left) / pixelsPerRadarPixel,
      y: (event.clientY - top) / pixelsPerRadarPixel,
    });
  }

  function handleDebugToggle(): void {
    setIsDebugOpen(!isDebugOpen);
    setPointer(null);
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

      <div className="absolute inset-x-0 top-0 flex flex-wrap items-start gap-3 p-4">
        <Button type="button" variant="outline" onClick={handleDebugToggle}>
          <Text path={isDebugOpen ? 'radar.debug.hide' : 'radar.debug.show'} />
        </Button>

        {image.status === 'failed' && (
          <p className="rounded-float border border-line bg-glass-panel px-3 py-2 text-13 leading-prose shadow-raised">
            <Text path="radar.imageUnavailable" />
          </p>
        )}

        {isDebugOpen && (
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
