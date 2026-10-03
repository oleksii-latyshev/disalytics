import type { ParsedDemo, UtilityThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { plateBox } from '../helpers/plate-box';
import {
  findNearestCluster,
  groupThrowsByLanding,
  type ThrowCluster,
} from '../helpers/throw-cluster';
import { END_STRIDE, ENDS_LENGTH, throwLayer, throwPlot } from '../helpers/throw-layer';
import { plateGeometry, plateView, radarPointAt, readPlateGeometry } from '../helpers/view';
import { useRadarPlate } from '../hooks/use-radar-plate';
import { UnknownMap } from './UnknownMap';

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
    const at = i * ENDS_LENGTH;
    const ox = plot[at];
    const oy = plot[at + 1];
    const lx = plot[at + END_STRIDE];
    const ly = plot[at + END_STRIDE + 1];
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
  /** Pre-grouped clusters over `throws`. Computed automatically if omitted. */
  clusters?: readonly ThrowCluster[] | undefined;
  /** The index into `throws` of the one mark isolated from the list beside the map, or `null`. */
  focused: number | null;
  /** Invoked when a throw mark or empty plate is clicked. */
  onSelect?: ((index: number | null) => void) | undefined;
  /** Invoked when a landing cluster with 2 or more throws is clicked. */
  onSelectCluster?: ((cluster: ThrowCluster) => void) | undefined;
}

function UtilityCanvas({
  demo,
  throws,
  clusters,
  focused,
  overview,
  onSelect,
  onSelectCluster,
}: Props & { overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const { layout, images, floorLabels } = useRadarPlate(overview, theme);
  const colors = radarColors(palette);

  // Fixed, the way the duel map's is: §6.3's zoom is a gesture on a match the reader is inside.
  const viewRef = useRef(plateView());
  const geometryRef = useRef(plateGeometry());

  const computedClusters = useMemo(
    () => clusters ?? groupThrowsByLanding(throws),
    [clusters, throws],
  );

  const plot = useMemo(
    () => throwPlot(demo.track, overview, throws),
    [demo.track, overview, throws],
  );

  const layers = useMemo(() => {
    const utility = throwLayer({
      throws,
      plot,
      clusters: computedClusters,
      overview,
      tickRate: demo.header.tickRate,
      colors,
      view: viewRef,
      focused,
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
        ]
      : [utility];
  }, [
    throws,
    plot,
    computedClusters,
    overview,
    demo.header.tickRate,
    colors,
    images,
    layout,
    floorLabels,
    focused,
  ]);

  const { canvasRef } = useCanvasLayers(layers);

  /** Resolves the click into either a cluster, a single throw index, or null. */
  const resolveHit = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ):
    | { kind: 'cluster'; cluster: ThrowCluster }
    | { kind: 'throw'; index: number | null }
    | null => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;

    const pt = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      layout,
    );
    readPlateGeometry(viewRef.current, box, layout, geometryRef.current);
    const { scale } = geometryRef.current;
    if (scale <= 0) return null;

    const clusterHit = findNearestCluster(pt, computedClusters, plot, scale, HIT_RADIUS_PX);
    if (clusterHit !== null && clusterHit.indices.length >= 2) {
      return { kind: 'cluster', cluster: clusterHit };
    }
    if (clusterHit !== null && clusterHit.indices.length === 1) {
      return { kind: 'throw', index: clusterHit.indices[0] ?? null };
    }
    const hit = findNearestThrow(pt, plot, throws.length, scale, HIT_RADIUS_PX);
    return { kind: 'throw', index: hit };
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (onSelect === undefined && onSelectCluster === undefined) return;
    const result = resolveHit(event);
    if (result === null) return;
    if (result.kind === 'cluster' && onSelectCluster !== undefined) {
      onSelectCluster(result.cluster);
    } else if (result.kind === 'throw' && onSelect !== undefined) {
      onSelect(result.index);
    }
  };

  // Sized from the cell rather than capped against it — a canvas carries an intrinsic ratio from its
  // backing store, so `max-h-full` with an aspect ratio measures the backing store's own width (#315).
  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        onClick={handleClick}
        className={`rounded-card bg-surface-0 ${
          onSelect !== undefined || onSelectCluster !== undefined ? 'cursor-pointer' : ''
        }`}
        style={plateBox(layout).style}
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
export function UtilityPlate({
  demo,
  throws,
  clusters,
  focused,
  onSelect,
  onSelectCluster,
}: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <UtilityCanvas
      demo={demo}
      throws={throws}
      clusters={clusters}
      focused={focused}
      overview={overview}
      onSelect={onSelect}
      onSelectCluster={onSelectCluster}
    />
  );
}
