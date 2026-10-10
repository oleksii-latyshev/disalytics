import type { CollectionPreviewItem, DecisionAction } from '@disa/admin-contract';
import type { Lineup, LineupCollection } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../../api/client';
import {
  type CollectionRow,
  choicesOf,
  decisionsOf,
  defaultChoice,
  rowsOf,
  savingCount,
  titlesOf,
} from '../../helpers/collections';
import { useResource } from '../../hooks/use-resource';
import { Notice } from '../Notice';
import { Muted } from '../Section';
import { Card, Dot, Pill } from './Parts';
import type { Tone } from './status';

interface Props {
  map: string;
  fileCollections: readonly LineupCollection[];
  /** The map's lineups on the site, as they are after the save. */
  onSite: readonly Lineup[];
  onChanged: () => void;
}

interface Saved {
  readonly saved: number;
  readonly dropped: number;
}

const STATUS_TONE: Readonly<Record<CollectionPreviewItem['status'], Tone>> = {
  new: 'new',
  update: 'update',
  unchanged: 'same',
};

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

function Detail({ row, onSite }: { row: CollectionRow; onSite: readonly Lineup[] }) {
  const { item, stored, resolved } = row;
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-13 text-ink-dim">
      <span>
        <Text path="admin.collections.members" values={{ count: resolved.lineupIds.length }} />
        {item.dropped > 0 ? (
          <>
            {' · '}
            <Text path="admin.collections.dropped" values={{ count: item.dropped }} />
          </>
        ) : null}
      </span>
      {stored !== null && stored.name !== resolved.name ? (
        <span className="[overflow-wrap:anywhere]">
          <Text path="admin.collections.renamed" values={{ name: stored.name }} />
        </span>
      ) : null}
      {item.status === 'update' && item.added.length > 0 ? (
        <span className="[overflow-wrap:anywhere]">
          <Text
            path="admin.collections.adds"
            values={{ count: item.added.length, titles: titlesOf(item.added, onSite) }}
          />
        </span>
      ) : null}
      {item.status === 'update' && item.removed.length > 0 ? (
        <span className="[overflow-wrap:anywhere]">
          <Text
            path="admin.collections.removes"
            values={{ count: item.removed.length, titles: titlesOf(item.removed, onSite) }}
          />
        </span>
      ) : null}
      {item.problems.includes('name_taken') ? (
        <span className="text-[var(--status-invalid)]" role="alert">
          <Text path="admin.collections.nameTaken" />
        </span>
      ) : null}
      {item.problems.includes('invalid_collection') ? (
        <span className="text-[var(--status-invalid)]" role="alert">
          <Text path="admin.collections.invalid" />
        </span>
      ) : null}
    </div>
  );
}

function ChoiceButtons({
  row,
  value,
  onChange,
}: {
  row: CollectionRow;
  value: DecisionAction;
  onChange: (action: DecisionAction) => void;
}) {
  const choices = choicesOf(row);
  if (choices.length < 2) {
    return (
      <span className="text-13 text-ink-dim">
        <Text path="admin.collections.nothingToDo" />
      </span>
    );
  }
  return (
    <span className="flex gap-1.5">
      {choices.map((action) => (
        <Button
          key={action}
          variant={value === action ? 'primary' : 'outline'}
          aria-pressed={value === action}
          onClick={() => onChange(action)}
        >
          <Text path={`admin.collections.choice.${action}`} />
        </Button>
      ))}
    </span>
  );
}

/**
 * The collections the file brings, checked against the lineups now on the site, so this comes after
 * the save: a lineup that was left out of it is a member the collection will drop.
 */
export function CollectionsStep({ map, fileCollections, onSite, onChanged }: Props) {
  const mine = fileCollections.filter((collection) => collection.map === map);
  const [preview, reload] = useResource(mine.length === 0 ? null : `collections:${map}`, () =>
    call((client) =>
      client.collections.preview({
        payload: {
          map,
          file: { version: 2, generator: 'disalytics', lineups: [], collections: mine },
        },
      }),
    ),
  );
  const [chosen, setChosen] = useState<Readonly<Record<string, DecisionAction>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  if (mine.length === 0) return null;
  const rows = preview.status === 'ready' ? rowsOf(preview.data.items) : [];
  const count = savingCount(rows, chosen);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const result = await call((client) =>
        client.collections.commit({
          payload: { map, decisions: decisionsOf(rows, chosen, mine) },
        }),
      );
      setSaved({ saved: result.saved, dropped: result.dropped });
      setChosen({});
      onChanged();
      reload();
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4 flex flex-col gap-3">
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.collections.title" />
      </h2>
      <p className="max-w-[62ch] text-14 text-ink-dim">
        <Text path="admin.collections.lede" values={{ count: mine.length, map }} />
      </p>
      {preview.status === 'loading' || preview.status === 'idle' ? (
        <Muted>
          <Text path="admin.preview.loading" />
        </Muted>
      ) : null}
      {preview.status === 'error' ? <Notice failure={preview.failure} onRetry={reload} /> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => {
          const value = chosen[row.item.id] ?? defaultChoice(row);
          return (
            <li
              key={row.item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-chip border border-line bg-surface-2 p-3 max-sm:grid-cols-1"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="font-medium text-14 text-ink [overflow-wrap:anywhere]">
                    {row.item.name}
                  </b>
                  <Pill tone={STATUS_TONE[row.item.status]}>
                    <Text path={`admin.collections.status.${row.item.status}`} />
                  </Pill>
                </span>
                <Detail row={row} onSite={onSite} />
              </span>
              <ChoiceButtons
                row={row}
                value={value}
                onChange={(action) => setChosen({ ...chosen, [row.item.id]: action })}
              />
            </li>
          );
        })}
      </ul>
      {failure === null ? null : <Notice failure={failure} />}
      {saved === null ? null : (
        <p className="flex flex-wrap items-center gap-2 text-14 text-ink">
          <Dot tone="new" />
          <Text path="admin.collections.saved" values={{ count: saved.saved }} />
          {saved.dropped > 0 ? (
            <span className="text-ink-dim">
              <Text path="admin.collections.droppedTotal" values={{ count: saved.dropped }} />
            </span>
          ) : null}
        </p>
      )}
      <div>
        <Button disabled={saving || count === 0} onClick={() => void save()}>
          <Text path="admin.collections.save" values={{ count }} />
        </Button>
      </div>
    </Card>
  );
}
