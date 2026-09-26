import type { Lineup } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import {
  getMapOverview,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  radarAssetPath,
  radarToWorld,
} from '@disa/map-data';
import { Minus, Plus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { UnknownMap } from '@/features/radar/components/UnknownMap';
import { radarBackdrop } from '@/features/radar/helpers/backdrop';
import { radarColors } from '@/features/radar/helpers/colors';
import { levelAt } from '@/features/radar/helpers/levels';
import {
  panBy,
  plateView,
  radarPointAt,
  ZOOM_STEP,
  zoomAbout,
  zoomByStep,
} from '@/features/radar/helpers/view';
import { useRadarImage } from '@/features/radar/hooks/use-radar-image';
import { lineupLayer } from '../helpers/lineup-layer';
import { findNearestLineup, groupLineupsByOrigin, lineupPlot } from '../helpers/lineup-plot';

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
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState(1);

  const plot = useMemo(() => lineupPlot(overview, lineups), [overview, lineups]);
  const groups = useMemo(() => groupLineupsByOrigin(lineups), [lineups]);

  const layers = useMemo(() => {
    const layer = lineupLayer({
      lineups,
      plot,
      groups,
      overview,
      colors,
      view: viewRef,
      focused,
      draftOrigin,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), layer] : [layer];
  }, [lineups, plot, groups, overview, colors, image, focused, draftOrigin]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

  const canvasSize = () => {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : null;
  };

  const changeZoom = (factor: number) => {
    const size = canvasSize();
    if (size === null) return;
    zoomByStep(viewRef.current, factor, size);
    setZoom(viewRef.current.zoom);
    repaint();
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.moved) {
      dragRef.current = null;
      return;
    }
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
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;
    if (scale <= 0) return;

    const hit = findNearestLineup(pt, plot, lineups.length, scale, HIT_RADIUS_PX);
    onSelect(hit);
  };

  return (
    <div className="flex w-full min-w-0 items-center justify-center">
      <div className="relative aspect-square w-full overflow-hidden rounded-card">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={handleClick}
          onWheel={(event) => {
            event.preventDefault();
            const size = canvasSize();
            if (size === null) return;
            const box = event.currentTarget.getBoundingClientRect();
            zoomAbout(
              viewRef.current,
              event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
              event.clientX - box.left,
              event.clientY - box.top,
              size,
            );
            setZoom(viewRef.current.zoom);
            repaint();
          }}
          onPointerDown={(event) => {
            if (viewRef.current.zoom <= 1) return;
            dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (drag === null) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            const size = canvasSize();
            if (size === null) return;
            if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
            panBy(viewRef.current, dx, dy, size);
            drag.x = event.clientX;
            drag.y = event.clientY;
            repaint();
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            if (!dragRef.current?.moved) dragRef.current = null;
          }}
          className={`size-full cursor-crosshair bg-surface-0 ${zoom > 1 ? 'touch-none' : 'touch-pan-y'}`}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-card border border-line bg-surface-0/90 p-1">
          <button
            type="button"
            onClick={() => changeZoom(1 / ZOOM_STEP)}
            disabled={zoom <= 1}
            aria-label={t('library.lineups.zoomOut')}
            className="rounded-chip p-1.5 text-ink disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="numeric min-w-10 text-center text-11 text-ink">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoom >= 4}
            aria-label={t('library.lineups.zoomIn')}
            className="rounded-chip p-1.5 text-ink disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
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
      key={map}
      overview={overview}
      lineups={lineups}
      focused={focused}
      onSelect={onSelect}
      onPlace={onPlace}
      draftOrigin={draftOrigin}
    />
  );
}
