import type { Lineup, LineupGroupTarget } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { CornerDownRight, Layers, Pencil, Plus, Trash2, Unlink } from 'lucide-react';
import { EDIT_HINT_ID } from '../helpers/edit-hint';

interface Props {
  lineup: Lineup;
  /** Every position of the lineup's target, the one being edited among them. */
  siblings: readonly Lineup[];
  onMergeOrigins: () => void;
  onDone: () => void;
  onDetails: () => void;
  onAddBounce: () => void;
  onRemoveBounce: (index: number) => void;
  onUngroup: (groupTarget: LineupGroupTarget) => void;
  onDelete: () => void;
}

/**
 * Editing a position: the map's handles move its points, and this is everything else — bounces,
 * the full form, the group it belongs to, and deleting it. A built-in is changed as the user's own
 * copy, which the panel says rather than leaving to be found out.
 */
export function LineupEditPanel(props: Props) {
  const { lineup } = props;
  const t = useT();
  const bounces = lineup.waypoints ?? [];
  const canMergeOrigins =
    props.siblings.length >= 2 &&
    !props.siblings.every(
      (item) => item.originGroupId !== undefined && item.originGroupId === lineup.originGroupId,
    );

  return (
    <div className="lineup-rise flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 [border-block-end:1px_solid_var(--color-line)] px-3.5 pt-3.5 pb-3">
        <span className="label-dense text-ink-dim">
          <Text path="library.lineups.editing.title" />
        </span>
        <h2 className="truncate font-semibold text-16 text-ink">{lineup.title}</h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3.5 py-3">
        <p id={EDIT_HINT_ID} className="text-13 text-ink-dim leading-prose">
          <Text path="library.lineups.editing.hint" />
        </p>

        <section className="flex flex-col gap-1.5">
          <h3 className="label-dense text-ink-dim">
            <Text path="library.lineups.editing.bounces" values={{ count: bounces.length }} />
          </h3>
          {bounces.map((bounce, index) => (
            <div
              key={`${bounce.x}:${bounce.y}:${bounce.z}`}
              className="flex min-h-9 items-center gap-2 rounded-card border border-line px-2.5 text-13 text-ink"
            >
              <CornerDownRight aria-hidden="true" className="size-3.5 text-ink-dim" />
              <span className="flex-1">
                <Text path="library.lineups.selectedBounce" values={{ index: index + 1 }} />
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => props.onRemoveBounce(index)}
                aria-label={t('library.lineups.deleteBounce')}
                className="size-7 text-ink-dim"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={props.onAddBounce} className="self-start">
            <Plus aria-hidden="true" />
            <Text path="library.lineups.addBounce" />
          </Button>
        </section>

        {canMergeOrigins && (
          <Button variant="outline" onClick={props.onMergeOrigins} className="self-start">
            <Layers aria-hidden="true" />
            <Text path="library.lineups.mergeThrowSpots" />
          </Button>
        )}

        {lineup.groupId !== undefined && (
          <section className="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.lineups.editing.sharedLanding" />
            </p>
            <Button
              variant="outline"
              onClick={() => props.onUngroup('landing')}
              className="self-start"
            >
              <Unlink aria-hidden="true" />
              <Text path="library.lineups.unmergeLandings" />
            </Button>
          </section>
        )}

        {lineup.originGroupId !== undefined && (
          <section className="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.lineups.editing.sharedOrigin" />
            </p>
            <Button
              variant="outline"
              onClick={() => props.onUngroup('origin')}
              className="self-start"
            >
              <Unlink aria-hidden="true" />
              <Text path="library.lineups.unmergeOrigins" />
            </Button>
          </section>
        )}

        {lineup.isBuiltIn === true && (
          <p className="text-12 text-ink-faint leading-prose">
            <Text path="library.lineups.note.builtIn" />
          </p>
        )}
      </div>

      <footer className="flex flex-col gap-2 [border-block-start:1px_solid_var(--color-line)] px-3.5 pt-3 pb-3.5">
        <Button variant="outline" size="lg" onClick={props.onDetails}>
          <Pencil aria-hidden="true" />
          <Text path="library.lineups.editing.details" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {lineup.isBuiltIn === true ? (
            <span />
          ) : (
            <Button variant="outline" size="lg" onClick={props.onDelete} className="text-damage">
              <Trash2 aria-hidden="true" />
              <Text path="library.lineups.delete" />
            </Button>
          )}
          <Button size="lg" onClick={props.onDone}>
            <Text path="library.lineups.editing.done" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
