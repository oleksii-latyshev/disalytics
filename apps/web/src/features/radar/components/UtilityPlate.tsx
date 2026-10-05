import type { LineupTarget, LineupVariant, UtilityThrow } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview } from '@disa/map-data';
import { type ReactNode, useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { plateBox } from '../helpers/plate-box';
import { targetLayer } from '../helpers/target-layer';
import { dotPlot, selectionPlot, targetPoints } from '../helpers/target-plot';
import { stackPoints } from '../helpers/target-stacks';
import { plateView } from '../helpers/view';
import { useRadarPlate } from '../hooks/use-radar-plate';
import { type PlateLabels, TargetMarkers } from './TargetMarkers';
import { UnknownMap } from './UnknownMap';

interface Props {
  map: string;
  /** What the reader's filters leave, most used first. */
  targets: readonly LineupTarget[];
  selected: LineupTarget | null;
  activeVariantId: string | null;
  /** Variants that are in the reader's lineups. */
  savedVariantIds: ReadonlySet<string>;
  /** Drawn as quiet dots; empty when the reader has not asked for them. */
  onTheMove: readonly UtilityThrow[];
  /** The target that anchors the open stack, if one is open. */
  openStack: string | null;
  labels: PlateLabels;
  onSelectTarget: (id: string) => void;
  onSelectVariant: (id: string) => void;
  onOpenStack: (id: string | null) => void;
  /** An empty click on the plate: whatever is picked or open is let go. */
  onClear: () => void;
  stackMenu: (ids: readonly string[]) => ReactNode;
}

function UtilityCanvas({ overview, ...props }: Props & { overview: MapOverview }) {
  const t = useT();
  const { targets, selected, activeVariantId, onTheMove, onOpenStack, onClear } = props;

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const { layout, images, floorLabels } = useRadarPlate(overview, theme);
  const colors = radarColors(palette);

  // Fixed, the way the duel map's is: a view of the match's lineups is read whole.
  const viewRef = useRef(plateView());

  const stacks = useMemo(() => stackPoints(targetPoints(overview, targets)), [overview, targets]);
  const byId = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const dots = useMemo(() => dotPlot(overview, onTheMove, colors), [overview, onTheMove, colors]);

  const activeVariant = useMemo(
    (): LineupVariant | undefined => selected?.variants.find(({ id }) => id === activeVariantId),
    [selected, activeVariantId],
  );
  const selection = useMemo(
    () => (selected === null ? null : selectionPlot(overview, selected, activeVariant, colors)),
    [overview, selected, activeVariant, colors],
  );

  const layers = useMemo(() => {
    const marks = targetLayer({ overview, colors, view: viewRef, dots, selection });

    return images.status === 'ready'
      ? [
          radarBackdrop({
            images: images.images,
            layout,
            floorLabels,
            labelColor: colors.dead,
            view: viewRef,
          }),
          marks,
        ]
      : [marks];
  }, [overview, colors, dots, selection, images, layout, floorLabels]);

  const { canvasRef } = useCanvasLayers(layers);

  // Sized from the cell rather than capped against it — a canvas carries an intrinsic ratio from its
  // backing store, so `max-h-full` with an aspect ratio measures the backing store's own width (#315).
  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <div className="relative" style={plateBox(layout).style}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={onClear}
          className="size-full rounded-card bg-surface-0"
        />

        <TargetMarkers
          overview={overview}
          layout={layout}
          stacks={stacks}
          targets={byId}
          selected={selected}
          activeVariantId={activeVariantId}
          savedVariantIds={props.savedVariantIds}
          openStack={props.openStack}
          labels={props.labels}
          onSelectTarget={props.onSelectTarget}
          onSelectVariant={props.onSelectVariant}
          onOpenStack={onOpenStack}
          stackMenu={props.stackMenu}
        />
      </div>
    </div>
  );
}

/**
 * A match's lineups on the map they were thrown across: one marker where each kind of grenade
 * landed, and for the picked one every spot it was thrown from.
 *
 * **There is no clock and no transport**, the way the duel map and the heat map have none:
 * `useCanvasLayers` paints when its layers change and when the element is resized, so nothing here
 * subscribes to a frame channel.
 */
export function UtilityPlate(props: Props) {
  const overview = getMapOverview(props.map);

  return overview === undefined ? (
    <UnknownMap map={props.map} />
  ) : (
    <UtilityCanvas overview={overview} {...props} />
  );
}
