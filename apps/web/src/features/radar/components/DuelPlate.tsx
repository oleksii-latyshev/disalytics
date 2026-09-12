import type { Duel, ParsedDemo } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, radarAssetPath } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { duelLayer, duelPlot } from '../helpers/duel-layer';
import { levelAt } from '../helpers/levels';
import { plateView } from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { UnknownMap } from './UnknownMap';

/**
 * The level the map is drawn at. A whole match has no single level to choose — `busiestLevelIndex`
 * answers for one frame, and this screen is every frame a kill happened on — so the map shows its
 * default level and an end standing on another is drawn at `OTHER_LEVEL_ALPHA`, which is the rule
 * §6.3 already applies to a player seen through a floor. Giving the reader the choice is #86's, and
 * that row waits on a Nuke demo.
 */
const LEVEL_INDEX = 0;

interface Props {
  demo: ParsedDemo;
  /** Already narrowed by whatever the screen above is narrowing by. */
  duels: readonly Duel[];
}

function DuelCanvas({ demo, duels, overview }: Props & { overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, LEVEL_INDEX), theme));
  const colors = radarColors(palette);

  // Fixed: §6.3's zoom is a gesture on a match the reader is inside, and this is a reading of one
  // they have stepped out of. The layers read it through a box all the same.
  const viewRef = useRef(plateView());

  const plot = useMemo(
    () => duelPlot(demo.track, overview, LEVEL_INDEX, duels),
    [demo.track, overview, duels],
  );

  const layers = useMemo(() => {
    const duelsLayer = duelLayer({ duels, plot, colors, view: viewRef });

    return image.status === 'ready'
      ? [radarBackdrop(image.image, viewRef), duelsLayer]
      : [duelsLayer];
  }, [duels, plot, colors, image]);

  const { canvasRef } = useCanvasLayers(layers);

  // The map is never cropped or letterboxed, so the canvas takes the smaller of the two axes its
  // cell offers — `min(100cqi,100cqb)` of a `container-type: size` box, which is the stage's own
  // rule (#147) and the only one that works here. A canvas carries an intrinsic ratio from its
  // backing store, so `aspect-square max-h-full` measured 1100×1100 in a 793px cell and ran off the
  // bottom of the screen: it has to be *sized* from the cell rather than capped against it (#315).
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
 * A match's duels on the map they happened on — `ROADMAP.md` M5's duel map.
 *
 * **There is no clock and no transport.** `useCanvasLayers` paints when its layers change and when
 * the element is resized, so this is a drawing rather than a frozen playback loop and nothing here
 * subscribes to a frame channel (hard rule 4 has nothing to hold here because nothing moves).
 *
 * The marks are §5.4's own, which is what keeps this honest: the ring, the disc and the line a
 * reader already knows from hovering one row in the feed are the same three marks, drawn from the
 * same helpers, over the whole match.
 */
export function DuelPlate({ demo, duels }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <DuelCanvas demo={demo} duels={duels} overview={overview} />
  );
}
