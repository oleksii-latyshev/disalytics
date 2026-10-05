import { useT } from '@disa/i18n';
import type { MapOverview, PlateLayout } from '@disa/map-data';
import { type ReactNode, useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { plateBox } from '../helpers/plate-box';
import type { PlatePoint } from '../helpers/plate-target';
import { plateView } from '../helpers/view';
import { useRadarPlate } from '../hooks/use-radar-plate';

interface Props {
  overview: MapOverview;
  /** The map recedes behind whatever is picked on it. */
  isDimmed: boolean;
  /** The cursor says the plate is being clicked for a position. */
  isPlacing: boolean;
  /** A press on the map itself, where it fell on the plate; the marks over it are not the map. */
  onPlateClick: (point: PlatePoint) => void;
  /** What sits over the map, positioned in percent of the layout it is given. */
  children: (layout: PlateLayout) => ReactNode;
}

/**
 * A whole map as a plate with nothing drawn on it, sized the way every plate here is, and a place
 * for elements over it. What the screen draws is DOM rather than canvas because each mark is a
 * control a keyboard has to reach.
 *
 * **There is no clock and no transport**: the backdrop paints when its image arrives and when the
 * canvas is resized, so nothing here subscribes to a frame channel.
 */
export function PlateFrame({ overview, isDimmed, isPlacing, onPlateClick, children }: Props) {
  const t = useT();
  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const { layout, images, floorLabels } = useRadarPlate(overview, theme);
  const colors = radarColors(palette);
  const viewRef = useRef(plateView());

  const layers = useMemo(
    () =>
      images.status === 'ready'
        ? [
            radarBackdrop({
              images: images.images,
              layout,
              floorLabels,
              labelColor: colors.dead,
              view: viewRef,
            }),
          ]
        : [],
    [images, layout, floorLabels, colors],
  );

  const { canvasRef } = useCanvasLayers(layers);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    onPlateClick({
      x: ((event.clientX - box.left) / box.width) * layout.width,
      y: ((event.clientY - box.top) / box.height) * layout.height,
    });
  };

  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <div className="relative" style={plateBox(layout).style}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={handleClick}
          className={`size-full rounded-card bg-surface-0 transition-opacity duration-(--duration-base) ease-out ${isDimmed ? 'opacity-60' : 'opacity-85'} ${isPlacing ? 'cursor-crosshair' : ''}`}
        />

        {children(layout)}
      </div>
    </div>
  );
}
