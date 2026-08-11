import type { ParsedDemo } from '@disa/demo-core';
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
import { readRadarColors } from '../helpers/colors';
import { playerTokens, radarBackdrop } from '../helpers/layers';
import { busiestLevelIndex, levelAt } from '../helpers/levels';
import { teamsBySlot } from '../helpers/teams';
import { useRadarImage } from '../hooks/use-radar-image';
import { RadarDebug } from './RadarDebug';

interface Props {
  demo: ParsedDemo;
  overview: MapOverview;
  transport: Transport;
}

export function RadarView({ demo, overview, transport }: Props) {
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

  const teamBySlot = useMemo(() => teamsBySlot(demo.header.players), [demo.header.players]);
  const colors = useMemo(readRadarColors, []);

  // The array is what `useCanvasLayers` repaints on, so it holds still until something other than
  // the clock moves. The clock itself is read inside the layer, once per animation frame.
  const layers = useMemo(() => {
    const tokens = playerTokens({
      track: demo.track,
      clock: transport.clock,
      overview,
      levelIndex,
      teamBySlot,
      colors,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image), tokens] : [tokens];
  }, [demo.track, transport, overview, levelIndex, teamBySlot, colors, image]);

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

  return (
    <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
      {/* The radar is never cropped or letterboxed — DESIGN.md §4 — so the canvas takes the smaller
          of the two axes the cell offers it, which is what the container units read. */}
      <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          className="aspect-square w-[min(100cqi,100cqb)] rounded-float bg-surface-0"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setPointer(null)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={handleDebugToggle}>
          <Text path={isDebugOpen ? 'radar.debug.hide' : 'radar.debug.show'} />
        </Button>

        {image.status === 'failed' && (
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="radar.imageUnavailable" />
          </p>
        )}
      </div>

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
  );
}
