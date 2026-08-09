import { openingFrame, type ParsedDemo } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import {
  DEFAULT_RADAR_THEME,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  type RadarPoint,
  radarAssetPath,
} from '@disa/map-data';
import { type PointerEvent, useMemo, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { Button } from '@/shared/components/ui/button';
import { readRadarColors } from '../helpers/colors';
import { playerTokens, radarBackdrop } from '../helpers/layers';
import { busiestLevelIndex, levelAt } from '../helpers/levels';
import { teamsBySlot } from '../helpers/teams';
import { useRadarImage } from '../hooks/use-radar-image';
import { RadarDebug } from './RadarDebug';

interface Props {
  demo: ParsedDemo;
  overview: MapOverview;
}

export function RadarView({ demo, overview }: Props) {
  const t = useT();
  const [forcedLevelIndex, setForcedLevelIndex] = useState<number | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [pointer, setPointer] = useState<RadarPoint | null>(null);

  const frame = openingFrame(demo);
  const levelIndex = forcedLevelIndex ?? busiestLevelIndex(overview, demo.track, frame);
  const level = levelAt(overview, levelIndex);
  const image = useRadarImage(radarAssetPath(level, DEFAULT_RADAR_THEME));

  const teamBySlot = useMemo(() => teamsBySlot(demo.header.players), [demo.header.players]);
  const colors = useMemo(readRadarColors, []);

  // The array is what `useCanvasLayers` repaints on, so it holds still until something drawn moves.
  const layers = useMemo(() => {
    const tokens = playerTokens({
      track: demo.track,
      frame,
      overview,
      levelIndex,
      teamBySlot,
      colors,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image), tokens] : [tokens];
  }, [demo.track, frame, overview, levelIndex, teamBySlot, colors, image]);

  const canvasRef = useCanvasLayers(layers);

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
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        className="aspect-square w-full rounded-instrument bg-surface-0"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setPointer(null)}
      />

      {image.status === 'failed' && (
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="radar.imageUnavailable" />
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="xs"
        className="self-start"
        onClick={handleDebugToggle}
      >
        <Text path={isDebugOpen ? 'radar.debug.hide' : 'radar.debug.show'} />
      </Button>

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
