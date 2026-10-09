import { lineupProblems } from '@disa/admin-contract';
import { isLineup, type Lineup, looseLineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { AnimatePresence, Button, DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import type { FieldId } from '../helpers/fields';
import { copyFields } from '../helpers/fields';
import { mapOptions } from '../helpers/format';
import type { Resource } from '../hooks/use-resource';
import { PROBLEM_TEXT } from './flow/FixSteps';
import { LineupEditor } from './flow/LineupEditor';
import { Card } from './flow/Parts';
import { MapPicker } from './MapPicker';
import { Notice } from './Notice';
import { Muted } from './Section';

interface Draft {
  readonly original: Lineup;
  readonly lineup: Lineup;
}

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

function Editing({
  draft,
  map,
  onSite,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  map: string;
  onSite: readonly Lineup[];
  onChange: (lineup: Lineup) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const problems = lineupProblems(draft.lineup, map);
  const edit = (next: Lineup, fields: readonly FieldId[]) =>
    onChange(copyFields(draft.lineup, next, fields));
  return (
    <div className="col-span-full flex flex-col gap-3 pt-3">
      <LineupEditor
        lineup={draft.lineup}
        onEdit={edit}
        map={map}
        onSite={onSite}
        counterpart={draft.original}
        tone="update"
        invalid={problems.flatMap((problem) =>
          problem.code === 'origin_off_map'
            ? ['origin' as const]
            : problem.code === 'landing_off_map'
              ? ['landing' as const]
              : [],
        )}
      />
      {problems.length === 0 ? null : (
        <ul className="m-0 list-none p-0 text-13 text-[var(--status-invalid)]" role="alert">
          {problems.map((problem) => (
            <li key={`${problem.code}:${problem.index ?? ''}`}>
              <Text path={PROBLEM_TEXT[problem.code].what} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button disabled={problems.length > 0 || saving} onClick={onSave}>
          <Text path="admin.onSite.save" />
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <Text path="admin.onSite.cancel" />
        </Button>
      </div>
    </div>
  );
}

/** The map's lineups as they are on the site: edit one with the same editor, or delete it. */
export function OnSite({
  map,
  onMap,
  resource,
  onChanged,
  onRetry,
}: {
  map: string;
  onMap: (map: string) => void;
  resource: Resource<readonly unknown[]>;
  onChanged: () => void;
  onRetry: () => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const lineups = resource.status === 'ready' ? resource.data.filter(isLineup) : [];

  const guard = async (run: () => Promise<void>) => {
    setFailure(null);
    try {
      await run();
    } catch (error) {
      setFailure(failureOf(error));
    }
  };
  const remove = (id: string) =>
    guard(async () => {
      await call((client) => client.lineups.remove({ params: { id } }));
      setAsking(null);
      onChanged();
    });
  const save = () =>
    guard(async () => {
      if (draft === null) return;
      setSaving(true);
      try {
        await call((client) =>
          client.commit.run({
            payload: {
              map,
              decisions: [{ action: 'replace', targetId: draft.original.id, lineup: draft.lineup }],
              images: {},
            },
          }),
        );
        setDraft(null);
        onChanged();
      } finally {
        setSaving(false);
      }
    });

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.current.title" values={{ map }} />
      </h2>
      <MapPicker map={map} options={mapOptions([])} onChange={onMap} />
      {failure === null ? null : <Notice failure={failure} />}
      {resource.status === 'loading' || resource.status === 'idle' ? (
        <Muted>
          <Text path="admin.current.loading" />
        </Muted>
      ) : null}
      {resource.status === 'error' ? <Notice failure={resource.failure} onRetry={onRetry} /> : null}
      {resource.status === 'ready' && lineups.length === 0 ? (
        <Muted>
          <Text path="admin.current.empty" />
        </Muted>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        <AnimatePresence initial={false}>
          {lineups.map((lineup) => (
            <motion.li
              key={lineup.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-chip border border-line bg-surface-2 px-3 py-2.5 max-sm:grid-cols-1"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-14 text-ink">{lineup.title}</span>
                <span className="numeric truncate text-12 text-ink-dim">
                  {lineup.kind} · {lineup.side} · {lineup.targetCallout ?? '—'}
                </span>
              </span>
              {asking === lineup.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-13 text-ink">
                    <Text path="admin.current.deleteConfirm" values={{ title: lineup.title }} />
                  </span>
                  <Button variant="destructive" onClick={() => void remove(lineup.id)}>
                    <Text path="admin.current.confirm" />
                  </Button>
                  <Button variant="outline" onClick={() => setAsking(null)}>
                    <Text path="admin.current.cancel" />
                  </Button>
                </span>
              ) : (
                <span className="flex gap-1.5">
                  <Button
                    variant="outline"
                    aria-expanded={draft?.original.id === lineup.id}
                    onClick={() =>
                      setDraft(
                        draft?.original.id === lineup.id
                          ? null
                          : { original: lineup, lineup: looseLineup(lineup) ?? lineup },
                      )
                    }
                  >
                    <Text path="admin.row.edit" />
                  </Button>
                  <Button variant="ghost" onClick={() => setAsking(lineup.id)}>
                    <Text path="admin.current.delete" />
                  </Button>
                </span>
              )}
              {draft?.original.id === lineup.id ? (
                <Editing
                  draft={draft}
                  map={map}
                  onSite={lineups}
                  onChange={(next) => setDraft({ original: draft.original, lineup: next })}
                  onSave={() => void save()}
                  onCancel={() => setDraft(null)}
                  saving={saving}
                />
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}
