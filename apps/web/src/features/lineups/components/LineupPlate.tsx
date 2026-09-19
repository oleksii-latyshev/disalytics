import type { Lineup } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, RADAR_IMAGE_SIZE, radarAssetPath } from '@disa/map-data';
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
}

function LineupCanvas({
  overview,
  lineups,
  focused,
  onSelect,
}: {
  readonly overview: MapOverview;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly onSelect: (index: number | null) => void;
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
    const extent = Math.min(box.width, box.height);
    const scale = extent / RADAR_IMAGE_SIZE;
    if (scale <= 0) return;

    const hit = findNearestLineup(pt, plot, lineups.length, scale, HIT_RADIUS_PX);
    onSelect(hit);
  };

  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        onClick={handleClick}
        className="aspect-square w-[min(100cqi,100cqb)] cursor-pointer rounded-card bg-surface-0"
      />
    </div>
  );
}

export function LineupPlate({ map, lineups, focused, onSelect }: Props) {
  const overview = getMapOverview(map);

  return overview === undefined ? (
    <UnknownMap map={map} />
  ) : (
    <LineupCanvas overview={overview} lineups={lineups} focused={focused} onSelect={onSelect} />
  );
}
