import type { Lineup } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import {
  getMapOverview,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  radarAssetPath,
  radarToWorld,
} from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { UnknownMap } from '@/features/radar/components/UnknownMap';
import { radarBackdrop } from '@/features/radar/helpers/backdrop';
import { radarColors } from '@/features/radar/helpers/colors';
import { levelAt } from '@/features/radar/helpers/levels';
import { plateView, radarPointAt } from '@/features/radar/helpers/view';
import { useRadarImage } from '@/features/radar/hooks/use-radar-image';
import { lineupLayer } from '../helpers/lineup-layer';
import { findNearestLineup, lineupPlot } from '../helpers/lineup-plot';

const HIT_RADIUS_PX = 20;

interface Props {
  readonly map: string;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly onSelect: (index: number | null) => void;
  readonly onPlace?: ((point: { x: number; y: number }) => void) | undefined;
  readonly draftOrigin?: { x: number; y: number } | null | undefined;
}

function LineupCanvas({
  overview,
  lineups,
  focused,
  onSelect,
  onPlace,
  draftOrigin,
}: {
  readonly overview: MapOverview;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly onSelect: (index: number | null) => void;
  readonly onPlace?: ((point: { x: number; y: number }) => void) | undefined;
  readonly draftOrigin?: { x: number; y: number } | null | undefined;
}) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, 0), theme));
  const colors = radarColors(palette);

  const viewRef = useRef(plateView());

  const plot = useMemo(() => lineupPlot(overview, lineups), [overview, lineups]);

  const layers = useMemo(() => {
    const layer = lineupLayer({
      lineups,
      plot,
      overview,
      colors,
      view: viewRef,
      focused,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), layer] : [layer];
  }, [lineups, plot, overview, colors, image, focused]);

  const { canvasRef } = useCanvasLayers(layers);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const pt = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      RADAR_IMAGE_SIZE,
    );
    if (onPlace !== undefined) {
      if (pt.x < 0 || pt.y < 0 || pt.x > RADAR_IMAGE_SIZE || pt.y > RADAR_IMAGE_SIZE) return;
      onPlace(radarToWorld(overview, pt));
      return;
    }
    const extent = Math.min(box.width, box.height);
    const scale = extent / RADAR_IMAGE_SIZE;
    if (scale <= 0) return;

    const hit = findNearestLineup(pt, plot, lineups.length, scale, HIT_RADIUS_PX);
    onSelect(hit);
  };

  return (
    <div className="flex w-full min-w-0 items-center justify-center">
      <div className="relative aspect-square w-full max-w-[42rem]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={handleClick}
          className="size-full cursor-crosshair rounded-card bg-surface-0"
        />
        {draftOrigin && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface-0 shadow-lg"
            style={{
              left: `${((draftOrigin.x - overview.posX) / overview.scale / RADAR_IMAGE_SIZE) * 100}%`,
              top: `${((overview.posY - draftOrigin.y) / overview.scale / RADAR_IMAGE_SIZE) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function LineupPlate({ map, lineups, focused, onSelect, onPlace, draftOrigin }: Props) {
  const overview = getMapOverview(map);

  return overview === undefined ? (
    <UnknownMap map={map} />
  ) : (
    <LineupCanvas
      overview={overview}
      lineups={lineups}
      focused={focused}
      onSelect={onSelect}
      onPlace={onPlace}
      draftOrigin={draftOrigin}
    />
  );
}
