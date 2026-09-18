import type { ParsedDemo, UtilityThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, RADAR_IMAGE_SIZE, radarAssetPath } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { levelAt } from '../helpers/levels';
import { throwLayer, throwPlot } from '../helpers/throw-layer';
import { plateView, radarPointAt } from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { UnknownMap } from './UnknownMap';

/**
 * The level the map is drawn at — `DuelPlate`'s own answer and for its own reason: a whole match has
 * no single level to choose, so the map shows its default and an end standing on another is drawn at
 * `OTHER_LEVEL_ALPHA`. Giving the reader the choice is #86's, and that row waits on a Nuke demo.
 */
const LEVEL_INDEX = 0;

/** Maximum distance in screen pixels to register a click on a throw's origin or landing. */
const HIT_RADIUS_PX = 16;

/** Finds the nearest throw origin or landing within `maxDistPx` of the click point, or `null`. */
function findNearestThrow(
  pt: { x: number; y: number },
  plot: Float32Array,
  throwsCount: number,
  scale: number,
  maxDistPx: number,
): number | null {
  const maxRadarDist = maxDistPx / scale;
  const maxRadarDistSq = maxRadarDist * maxRadarDist;
  let bestIndex: number | null = null;
  let bestDistSq = maxRadarDistSq;

  for (let i = 0; i < throwsCount; i++) {
    const at = i * 6;
    const ox = plot[at];
    const oy = plot[at + 1];
    const lx = plot[at + 3];
    const ly = plot[at + 4];
    if (ox === undefined || oy === undefined || lx === undefined || ly === undefined) continue;

    const dOx = ox - pt.x;
    const dOy = oy - pt.y;
    const dLx = lx - pt.x;
    const dLy = ly - pt.y;

    const minDistSq = Math.min(dOx * dOx + dOy * dOy, dLx * dLx + dLy * dLy);
    if (minDistSq < bestDistSq) {
      bestDistSq = minDistSq;
      bestIndex = i;
    }
  }

  return bestIndex;
}

interface Props {
  demo: ParsedDemo;
  /** Already narrowed by whatever the screen above is narrowing by. */
  throws: readonly UtilityThrow[];
  /** The index into `throws` of the one mark isolated from the list beside the map, or `null`. */
  focused: number | null;
  /** Invoked when a throw mark or empty plate is clicked. */
  onSelect?: ((index: number | null) => void) | undefined;
}

function UtilityCanvas({
  demo,
  throws,
  focused,
  overview,
  onSelect,
}: Props & { overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, LEVEL_INDEX), theme));
  const colors = radarColors(palette);

  // Fixed, the way the duel map's is: §6.3's zoom is a gesture on a match the reader is inside.
  const viewRef = useRef(plateView());

  const plot = useMemo(
    () => throwPlot(demo.track, overview, LEVEL_INDEX, throws),
    [demo.track, overview, throws],
  );

  const layers = useMemo(() => {
    const utility = throwLayer({
      throws,
      plot,
      overview,
      tickRate: demo.header.tickRate,
      colors,
      view: viewRef,
      focused,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), utility] : [utility];
  }, [throws, plot, overview, demo.header.tickRate, colors, image, focused]);

  const { canvasRef } = useCanvasLayers(layers);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (onSelect === undefined) return;
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

    const hit = findNearestThrow(pt, plot, throws.length, scale, HIT_RADIUS_PX);
    onSelect(hit);
  };

  // Sized from the cell rather than capped against it — a canvas carries an intrinsic ratio from its
  // backing store, so `aspect-square max-h-full` measures the backing store's own width (#315).
  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        onClick={handleClick}
        className={`aspect-square w-[min(100cqi,100cqb)] rounded-card bg-surface-0 ${
          onSelect !== undefined ? 'cursor-pointer' : ''
        }`}
      />
    </div>
  );
}

/**
 * A match's utility on the map it was thrown across — `ROADMAP.md` M5's utility map.
 *
 * **There is no clock and no transport**, the way the duel map and the heat map have none:
 * `useCanvasLayers` paints when its layers change and when the element is resized, so nothing here
 * subscribes to a frame channel.
 */
export function UtilityPlate({ demo, throws, focused, onSelect }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <UtilityCanvas
      demo={demo}
      throws={throws}
      focused={focused}
      overview={overview}
      onSelect={onSelect}
    />
  );
}
