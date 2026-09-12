import type { ParsedDemo, UtilityThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, radarAssetPath } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { levelAt } from '../helpers/levels';
import { throwLayer, throwPlot } from '../helpers/throw-layer';
import { plateView } from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { UnknownMap } from './UnknownMap';

/**
 * The level the map is drawn at — `DuelPlate`'s own answer and for its own reason: a whole match has
 * no single level to choose, so the map shows its default and an end standing on another is drawn at
 * `OTHER_LEVEL_ALPHA`. Giving the reader the choice is #86's, and that row waits on a Nuke demo.
 */
const LEVEL_INDEX = 0;

interface Props {
  demo: ParsedDemo;
  /** Already narrowed by whatever the screen above is narrowing by. */
  throws: readonly UtilityThrow[];
}

function UtilityCanvas({ demo, throws, overview }: Props & { overview: MapOverview }) {
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
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), utility] : [utility];
  }, [throws, plot, overview, demo.header.tickRate, colors, image]);

  const { canvasRef } = useCanvasLayers(layers);

  // Sized from the cell rather than capped against it — a canvas carries an intrinsic ratio from its
  // backing store, so `aspect-square max-h-full` measures the backing store's own width (#315).
  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        className="aspect-square w-[min(100cqi,100cqb)] rounded-card bg-surface-0"
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
export function UtilityPlate({ demo, throws }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <UtilityCanvas demo={demo} throws={throws} overview={overview} />
  );
}
