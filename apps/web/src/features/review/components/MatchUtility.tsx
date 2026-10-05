import {
  type Frame,
  type Lineup,
  type LineupTarget,
  lineupOfVariant,
  matchLineups,
  type ParsedDemo,
  savedLineupId,
  type UtilityKind,
  type UtilityThrow,
  utilityKindOfGrenade,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Link } from '@tanstack/react-router';
import { Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LINEUP_KIND_NAMES, LINEUP_KIND_ORDER } from '@/core/lineup-catalog';
import { LineupFormModal, persistLineup, useMapLineups } from '@/features/lineups';
import { type PlateLabels, TargetLegend, UtilityPlate } from '@/features/radar';
import {
  countByKind,
  filterTargets,
  type LineupFilter,
  NO_FILTER,
  targetsInScope,
} from '../helpers/lineup-filter';
import { nameLineups, originTitle, type TargetNames, targetTitle } from '../helpers/lineup-names';
import { clearPick, type LineupPick, NO_PICK, pickTarget } from '../helpers/lineup-pick';
import { LineupPanel } from './LineupPanel';
import { LineupStackMenu } from './LineupStackMenu';
import { LineupsList } from './LineupsList';

const NOTHING: readonly UtilityThrow[] = [];

interface Props {
  demo: ParsedDemo;
  onOpenOnStage?: ((frame: Frame) => void) | undefined;
}

function kindsOf(targets: readonly LineupTarget[]): readonly UtilityKind[] {
  return LINEUP_KIND_ORDER.filter((kind) => targets.some((target) => target.kind === kind));
}

/**
 * Where a match's grenades landed that can be thrown again, and how — #566.
 *
 * **The unit is a target, where a grenade of one kind lands, and not a throw**: a reader looks for
 * "a smoke on Xbox", and a match has seventy of those where it has five hundred throws. Everything
 * the screen needs from the match is derived once per demo — grouping, names — and nothing here is
 * a function of time, so a press only changes what is picked.
 *
 * **What was saved is read from the lineups themselves**, by an id the variant owns, so saving the
 * same variant again replaces it and the saved state is true whenever the screen is opened.
 */
export function MatchUtility({ demo, onOpenOnStage }: Props) {
  const t = useT();
  const { map } = demo.header;

  const lineups = useMemo(() => matchLineups(demo), [demo]);
  const names = useMemo(() => nameLineups(map, lineups.targets), [map, lineups.targets]);
  const kinds = useMemo(() => kindsOf(lineups.targets), [lineups.targets]);

  const [filter, setFilter] = useState<LineupFilter>(NO_FILTER);
  const [isOnTheMoveShown, setIsOnTheMoveShown] = useState(false);
  const [{ selectedId, variantId, openStack }, setPick] = useState<LineupPick>(NO_PICK);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const { lineups: catalog, reload, deleteLineup } = useMapLineups(map);

  const inScope = useMemo(
    () => targetsInScope(lineups.targets, names, filter),
    [lineups.targets, names, filter],
  );
  const visible = useMemo(
    () => filterTargets(lineups.targets, names, filter),
    [lineups.targets, names, filter],
  );
  const chipCounts = useMemo(() => {
    const counts = countByKind(inScope);

    return new Map(kinds.map((kind) => [kind, counts.get(kind) ?? 0] as const));
  }, [inScope, kinds]);

  const onTheMove = useMemo(
    () =>
      lineups.onTheMove.filter(
        (thrown) =>
          (filter.side === 'all' || thrown.throwerSide === filter.side) &&
          (filter.kind === 'all' || utilityKindOfGrenade(thrown.grenade.type) === filter.kind),
      ),
    [lineups.onTheMove, filter],
  );

  const catalogById = useMemo(
    () => new Map(catalog.map((lineup) => [lineup.id, lineup])),
    [catalog],
  );
  const savedVariantIds = useMemo(
    () =>
      new Set(
        lineups.targets.flatMap((target) =>
          target.variants
            .filter((variant) => catalogById.has(savedLineupId(map, variant)))
            .map((variant) => variant.id),
        ),
      ),
    [lineups.targets, catalogById, map],
  );
  const savedCount = catalog.filter((lineup) => lineup.isBuiltIn !== true).length;

  const selected = visible.find((target) => target.id === selectedId) ?? null;
  const variant =
    selected === null
      ? null
      : (selected.variants.find((candidate) => candidate.id === variantId) ??
        selected.variants[0] ??
        null);
  const savedLineup: Lineup | undefined =
    variant === null ? undefined : catalogById.get(savedLineupId(map, variant));

  const pick = (id: string) => {
    setPick(pickTarget(id));
    setHasFailed(false);
  };
  const setVariantId = (id: string) => setPick((current) => ({ ...current, variantId: id }));
  const setOpenStack = (id: string | null) => setPick((current) => ({ ...current, openStack: id }));
  const clear = () => setPick(clearPick);

  // On `window` in the capture phase so it runs before the review's own document-level `Escape`
  // (`clearSelection`), and `preventDefault` only when there is a pick to clear — which makes that
  // binding stand down for this press, while an `Escape` with nothing picked still reaches it.
  const hasPick = selectedId !== null || openStack !== null;
  useEffect(() => {
    if (!hasPick || isFormOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[data-shortcuts-suspended]') !== null) return;

      event.preventDefault();
      setPick(clearPick);
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasPick, isFormOpen]);

  const unnamed = t('review.lineups.unnamed');
  const selectedNames: TargetNames | undefined =
    selected === null ? undefined : names.get(selected.id);

  const handleSave = async () => {
    if (selected === null || variant === null || selectedNames === undefined) return;

    setIsSaving(true);
    setHasFailed(false);
    const title = t('review.lineups.save.title', {
      kind: LINEUP_KIND_NAMES[selected.kind],
      target: selectedNames.target?.name ?? unnamed,
      origin: selectedNames.origins.get(variant.id)?.name ?? unnamed,
    });
    const lineup = lineupOfVariant(variant, {
      map,
      title,
      targetCallout: selectedNames.target?.name,
      createdAt: Date.now(),
    });

    const isStored = await persistLineup(lineup);
    setIsSaving(false);
    if (isStored) await reload();
    else setHasFailed(true);
  };

  const handleUndo = async () => {
    if (savedLineup === undefined) return;
    await deleteLineup(savedLineup.id);
  };

  const labels: PlateLabels = {
    target: (target) => {
      const targetNames = names.get(target.id);

      return t('review.lineups.targetAria', {
        title: targetNames === undefined ? unnamed : targetTitle(target, targetNames, unnamed),
        throws: target.throwCount,
      });
    },
    origin: (number, of) =>
      t('review.lineups.originAria', {
        number,
        name: selectedNames === undefined ? unnamed : originTitle(of, selectedNames, unnamed),
      }),
    stack: (targets, throws) => t('review.lineups.stack.aria', { targets, throws }),
  };

  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,21.25rem)] gap-3">
      <LineupsList
        filter={filter}
        onFilter={setFilter}
        kinds={chipCounts}
        inScopeCount={inScope.length}
        targets={visible}
        names={names}
        selectedId={selected?.id ?? null}
        savedVariantIds={savedVariantIds}
        onPick={pick}
        isOnTheMoveShown={isOnTheMoveShown}
        onTheMoveCount={onTheMove.length}
        onToggleOnTheMove={setIsOnTheMoveShown}
      />

      <section className="relative grid min-h-0 min-w-0">
        <UtilityPlate
          map={map}
          targets={visible}
          selected={selected}
          activeVariantId={variant?.id ?? null}
          savedVariantIds={savedVariantIds}
          onTheMove={isOnTheMoveShown ? onTheMove : NOTHING}
          openStack={openStack}
          labels={labels}
          onSelectTarget={pick}
          onSelectVariant={setVariantId}
          onOpenStack={setOpenStack}
          onClear={clear}
          stackMenu={(ids) => (
            <LineupStackMenu
              targets={ids.flatMap((id) => visible.find((target) => target.id === id) ?? [])}
              names={names}
              onPick={pick}
            />
          )}
        />

        <TargetLegend />

        <Link
          to="/lineups"
          className="surface-card absolute top-0 right-0 flex h-9 items-center gap-2 rounded-card px-3 text-13 font-medium text-ink"
        >
          <Bookmark aria-hidden="true" className="size-4" />
          {t('review.lineups.myLineups')}
          <span className="numeric grid h-5 min-w-5 place-items-center rounded-full bg-selected px-1.5 text-11 font-semibold">
            {savedCount}
          </span>
        </Link>
      </section>

      <LineupPanel
        demo={demo}
        lineups={lineups}
        names={names}
        selected={selected}
        variant={variant}
        savedVariantIds={savedVariantIds}
        save={{
          saved: savedLineup,
          isSaving,
          hasFailed,
          onSave: () => void handleSave(),
          onEdit: () => setIsFormOpen(true),
          onUndo: () => void handleUndo(),
        }}
        onPick={pick}
        onVariant={setVariantId}
        onClose={clear}
        onOpenOnStage={(frame) => onOpenOnStage?.(frame)}
      />

      {isFormOpen && savedLineup !== undefined && (
        <LineupFormModal
          isOpen
          onDismiss={() => setIsFormOpen(false)}
          initialData={savedLineup}
          defaultMap={map}
          onSaved={() => void reload()}
        />
      )}
    </div>
  );
}
