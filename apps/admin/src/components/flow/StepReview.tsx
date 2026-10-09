import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { AnimatePresence, Button, cn, DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { useState } from 'react';
import { copyFields, type FieldId } from '../../helpers/fields';
import type { Review, Row } from '../../hooks/use-review';
import { LineupEditor } from './LineupEditor';
import { Card, Chip } from './Parts';
import { OUTCOME_KEY, OUTCOME_TONE, toneColor } from './status';

function Stripe({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="self-stretch rounded-[3px] transition-[background-color] duration-(--duration-base)"
      style={{ background: color }}
    />
  );
}

function RowView({
  row,
  review,
  map,
  onSite,
  editing,
  onToggleEdit,
}: {
  row: Row;
  review: Review;
  map: string;
  onSite: readonly Lineup[];
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const { item, plan } = row;
  const shown = plan.kind === 'skip' ? item.edited : plan.lineup;
  const tone = OUTCOME_TONE[row.outcome];
  const photos = shown.imageUrls?.length ?? 0;
  const edit = (next: Lineup, fields: readonly FieldId[]) =>
    review.dispatch({
      type: 'edit',
      id: item.id,
      next: copyFields(item.edited, next, fields),
      fields,
    });

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
      className="grid list-none grid-cols-[6px_minmax(0,1fr)_auto] items-center gap-3 rounded-chip border border-line bg-surface-2 px-3 py-2.5 max-sm:grid-cols-[6px_minmax(0,1fr)]"
    >
      <Stripe color={toneColor(tone)} />
      <div className="min-w-0">
        <div
          className={cn(
            'truncate font-medium text-14 text-ink',
            plan.kind === 'skip' && 'text-ink-dim',
          )}
        >
          {shown.title.trim() === '' ? (
            <span className="text-ink-faint italic">
              <Text path="admin.row.untitled" />
            </span>
          ) : (
            shown.title
          )}
        </div>
        <div className="truncate text-12 text-ink-faint">
          {shown.targetCallout ?? '—'} · <Text path="admin.row.photos" values={{ count: photos }} />
          {shown.author === undefined ? null : ` · ${shown.author.name}`}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 max-sm:col-span-full max-sm:justify-start">
        <Chip>
          <Text path={OUTCOME_KEY[row.outcome]} />
        </Chip>
        <Button variant="outline" aria-expanded={editing} onClick={onToggleEdit}>
          <Text path={editing ? 'admin.row.editDone' : 'admin.row.edit'} />
        </Button>
        <Button
          variant={item.dropped ? 'outline' : 'ghost'}
          className={item.dropped ? '' : 'text-[var(--status-invalid)]'}
          onClick={() => review.dispatch({ type: 'drop', id: item.id, dropped: !item.dropped })}
        >
          <Text path={item.dropped ? 'admin.row.restore' : 'admin.row.drop'} />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {editing ? (
          <motion.div
            key="editor"
            className="col-span-full overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
          >
            <div className="pt-3">
              <LineupEditor
                lineup={shown}
                onEdit={edit}
                map={map}
                onSite={onSite}
                counterpart={item.stored}
                tone={tone}
                invalid={row.problems.flatMap((problem) =>
                  problem.code === 'origin_off_map'
                    ? ['origin' as const]
                    : problem.code === 'landing_off_map'
                      ? ['landing' as const]
                      : [],
                )}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function ServerOnlyRow({
  lineup,
  removing,
  merged,
  onToggle,
}: {
  lineup: Lineup;
  removing: boolean;
  merged: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
      className="grid list-none grid-cols-[6px_minmax(0,1fr)_auto] items-center gap-3 rounded-chip border border-line bg-surface-2 px-3 py-2.5 max-sm:grid-cols-[6px_minmax(0,1fr)]"
    >
      <Stripe color={toneColor(removing ? 'invalid' : 'same')} />
      <div className="min-w-0">
        <div className="truncate font-medium text-14 text-ink">{lineup.title}</div>
        <div className="truncate text-12 text-ink-faint">
          {lineup.targetCallout ?? '—'} ·{' '}
          <Text path="admin.row.photos" values={{ count: lineup.imageUrls?.length ?? 0 }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 max-sm:col-span-full max-sm:justify-start">
        <Chip>
          <Text
            path={
              merged
                ? 'admin.server.merged'
                : removing
                  ? 'admin.server.removing'
                  : 'admin.server.stays'
            }
          />
        </Chip>
        {merged ? null : (
          <Button
            variant={removing ? 'outline' : 'ghost'}
            className={removing ? '' : 'text-[var(--status-invalid)]'}
            onClick={onToggle}
          >
            <Text path={removing ? 'admin.server.keep' : 'admin.server.remove'} />
          </Button>
        )}
      </div>
    </motion.li>
  );
}

/** Every lineup of the file with what will happen to it, each one editable or removable. */
export function StepReview({
  map,
  review,
  onSite,
}: {
  map: string;
  review: Review;
  onSite: readonly Lineup[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const replaced = new Set(
    review.rows.flatMap((row) => (row.plan.kind === 'replace' ? [row.plan.targetId] : [])),
  );
  return (
    <Card>
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.review.title" />
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-14 text-ink-dim">
        <Text path="admin.review.lede" />
      </p>
      <ul className="m-0 mt-3.5 flex list-none flex-col gap-1.5 p-0">
        <AnimatePresence initial={false}>
          {review.rows.map((row) => (
            <RowView
              key={row.item.id}
              row={row}
              review={review}
              map={map}
              onSite={onSite}
              editing={editing === row.item.id}
              onToggleEdit={() => setEditing(editing === row.item.id ? null : row.item.id)}
            />
          ))}
        </AnimatePresence>
      </ul>
      {review.serverOnly.length === 0 ? null : (
        <>
          <h3 className="mt-6 text-12 text-ink-faint uppercase tracking-wider">
            <Text path="admin.server.title" />
          </h3>
          <ul className="m-0 mt-3.5 flex list-none flex-col gap-1.5 p-0">
            <AnimatePresence initial={false}>
              {review.serverOnly.map((lineup) => (
                <ServerOnlyRow
                  key={lineup.id}
                  lineup={lineup}
                  removing={review.state.removals.has(lineup.id)}
                  merged={replaced.has(lineup.id)}
                  onToggle={() =>
                    review.dispatch({
                      type: 'remove',
                      id: lineup.id,
                      remove: !review.state.removals.has(lineup.id),
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </Card>
  );
}
