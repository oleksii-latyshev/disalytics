import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview } from '@disa/map-data';
import { useMemo } from 'react';
import {
  PlateFrame,
  type PlateLabels,
  type PlatePoint,
  stackPoints,
  TargetLegend,
  TargetMarkers,
  targetPoints,
  UnknownMap,
} from '@/features/radar';
import { EDIT_HINT_ID } from '../helpers/edit-hint';
import { type AddDraft, addStep, stepNumber } from '../helpers/lineup-add';
import { targetTitle } from '../helpers/lineup-labels';
import type { PointMove } from '../helpers/lineup-move';
import { draftOverlay, targetOverlay } from '../helpers/lineup-overlay';
import type { SavedTarget } from '../helpers/lineup-targets';
import { platePointOf, worldPointAt } from '../helpers/plate-point';
import { LineupAddMarks } from './LineupAddMarks';
import { LineupEditHandles } from './LineupEditHandles';
import { LineupSelectionOverlay } from './LineupSelectionOverlay';
import { LineupStackMenu } from './LineupStackMenu';

const NO_SAVED: ReadonlySet<string> = new Set();

interface Props {
  map: string;
  /** What the reader's filters leave, most positions first. */
  targets: readonly SavedTarget[];
  selected: SavedTarget | null;
  activeVariantId: string | null;
  openStack: string | null;
  /** A lineup being added, or `null` when the map is for browsing. */
  draft: AddDraft | null;
  /** The lineup whose points can be taken hold of, or `null` when nothing is being edited. */
  editing: Lineup | null;
  onSelectTarget: (id: string) => void;
  onSelectVariant: (id: string) => void;
  onOpenStack: (id: string | null) => void;
  onClear: () => void;
  onPlace: (point: WorldPoint) => void;
  onCancelAdd: () => void;
  onMove: (move: PointMove) => void;
  onCommit: (move: PointMove) => void;
}

function MapCanvas({ overview, ...props }: Props & { overview: MapOverview }) {
  const t = useT();
  const { targets, selected, activeVariantId, draft, editing } = props;

  const stacks = useMemo(() => stackPoints(targetPoints(overview, targets)), [overview, targets]);
  const byId = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);

  const labels: PlateLabels<SavedTarget> = {
    target: (target) =>
      t('library.lineups.targetAria', { title: targetTitle(target), count: target.throwCount }),
    origin: (number, variant) =>
      t('library.lineups.originAria', { number, name: variant.lineup.title }),
    stack: (count, positions) => t('library.lineups.stackAria', { targets: count, positions }),
  };

  const step = draft === null ? null : addStep(draft);
  const landing = draft?.landing == null ? null : platePointOf(overview, draft.landing);
  const origin = draft?.origin == null ? null : platePointOf(overview, draft.origin);

  const plot =
    draft !== null
      ? draftOverlay(overview, { kind: draft.kind, landing, origin })
      : selected === null
        ? null
        : targetOverlay(overview, selected, activeVariantId ?? selected.variants[0]?.id ?? null);

  const handlePlateClick = (point: PlatePoint) => {
    if (draft === null) props.onClear();
    else if (step !== 'details') props.onPlace(worldPointAt(overview, point));
  };

  return (
    <PlateFrame
      overview={overview}
      isDimmed={selected !== null || draft !== null}
      isPlacing={step !== null && step !== 'details'}
      onPlateClick={handlePlateClick}
    >
      {(layout) => (
        <>
          {plot !== null && (
            <LineupSelectionOverlay
              layout={layout}
              plot={plot}
              plotKey={draft === null ? (selected?.id ?? '') : 'draft'}
              isRevealed={draft === null}
            />
          )}

          {draft === null && (
            <TargetMarkers
              overview={overview}
              layout={layout}
              stacks={stacks}
              targets={byId}
              selected={selected}
              activeVariantId={activeVariantId}
              savedVariantIds={NO_SAVED}
              openStack={props.openStack}
              labels={labels}
              isAnimated
              onSelectTarget={props.onSelectTarget}
              onSelectVariant={props.onSelectVariant}
              onOpenStack={props.onOpenStack}
              stackMenu={(ids) => (
                <LineupStackMenu
                  targets={ids.flatMap((id) => byId.get(id) ?? [])}
                  onPick={props.onSelectTarget}
                />
              )}
            />
          )}

          {draft !== null && step !== null && (
            <LineupAddMarks
              layout={layout}
              step={step}
              stepNumber={stepNumber(step)}
              kind={draft.kind}
              landing={landing}
              origin={origin}
              isLandingFixed={draft.target !== null}
              onCancel={props.onCancelAdd}
            />
          )}

          {editing !== null && (
            <LineupEditHandles
              overview={overview}
              layout={layout}
              lineup={editing}
              describedBy={EDIT_HINT_ID}
              onMove={props.onMove}
              onCommit={props.onCommit}
            />
          )}
        </>
      )}
    </PlateFrame>
  );
}

/**
 * The map: one marker where each kind of grenade lands, the picked one's positions numbered with
 * an arc from each, and — when a lineup is being added or edited — the points to place or move.
 */
export function LineupsMap(props: Props) {
  const overview = getMapOverview(props.map);

  return (
    <section className="relative grid min-h-0 min-w-0">
      {overview === undefined ? (
        <UnknownMap map={props.map} />
      ) : (
        <MapCanvas overview={overview} {...props} />
      )}
      <TargetLegend />
    </section>
  );
}
