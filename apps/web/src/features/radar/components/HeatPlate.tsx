import type { ParsedDemo } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, radarAssetPath } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import type { PresenceField } from '../helpers/heat-field';
import { fieldImage, heatLayer } from '../helpers/heat-layer';
import { levelAt } from '../helpers/levels';
import { plateView } from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { UnknownMap } from './UnknownMap';

/**
 * The level the map is drawn at. A field of a whole match stands on every floor at once — which is
 * what `presenceField` bins — so there is no level to choose between, and the map shows its default
 * the way the duel map does. Giving the reader the choice is #86's, and that row waits on a demo.
 */
const LEVEL_INDEX = 0;

interface Props {
  demo: ParsedDemo;
  /** Already narrowed by whatever the screen above is narrowing by, or `null` on an unknown map. */
  field: PresenceField | null;
}

function HeatCanvas({ field, overview }: { field: PresenceField | null; overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, LEVEL_INDEX), theme));
  const colors = radarColors(palette);

  // Fixed, for `DuelPlate`'s reason: §6.3's zoom is a gesture on a match the reader is inside.
  const viewRef = useRef(plateView());

  // The field is painted into an image when it changes rather than on every repaint, which is what
  // leaves the draw itself one `drawImage` — a resize re-reads nothing.
  const layers = useMemo(() => {
    const heat =
      field === null ? [] : [heatLayer({ image: fieldImage(field, colors), view: viewRef })];

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), ...heat] : heat;
  }, [field, colors, image]);

  const { canvasRef } = useCanvasLayers(layers);

  // Sized from its cell rather than capped against it — `DuelPlate` carries the measurement.
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
 * Where a match was spent, over the map it was spent on — `ROADMAP.md` M5's heat map.
 *
 * **There is no clock and no transport**, the way there is none on the duel map: `useCanvasLayers`
 * paints when its layers change and when the element is resized, so nothing here subscribes to a
 * frame channel.
 */
export function HeatPlate({ demo, field }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <HeatCanvas field={field} overview={overview} />
  );
}
