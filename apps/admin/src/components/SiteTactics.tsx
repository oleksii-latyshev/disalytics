import type { SiteTacticsResponse } from '@disa/admin-contract';
import { isTactic, mainSteps, type Tactic, type TacticSide } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { DEFAULT_MAP, mapOptions } from '../helpers/format';
import type { Resource } from '../hooks/use-resource';
import { Card } from './flow/Parts';
import { MapPicker, SELECT_CLASS } from './MapPicker';
import { Notice } from './Notice';
import { Muted } from './Section';

/** The tactics as they are on the site, as text, each with a delete. */
export function SiteTactics({
  resource,
  onChanged,
  onRetry,
  onEdit,
  onCreate,
}: {
  resource: Resource<SiteTacticsResponse>;
  onChanged: () => void;
  onRetry: () => void;
  onEdit: (tactic: Tactic) => void;
  onCreate: (map: string, side: TacticSide) => void;
}) {
  const locale = useLocale();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const [newMap, setNewMap] = useState(DEFAULT_MAP);
  const [newSide, setNewSide] = useState<TacticSide>('T');
  const [asking, setAsking] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const tactics = resource.status === 'ready' ? resource.data.tactics.filter(isTactic) : [];

  const remove = async (id: string) => {
    setFailure(null);
    try {
      await call((client) => client.tactics.remove({ params: { id } }));
      setAsking(null);
      onChanged();
    } catch (error) {
      setFailure(isFailure(error) ? error : { key: 'admin.error.network', detail: undefined });
    }
  };

  return (
    <Card className="mt-4 flex flex-col gap-3">
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.tactics.siteTitle" />
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <MapPicker map={newMap} options={mapOptions([])} onChange={setNewMap} />
        <label className="flex flex-col gap-1">
          <span className="text-12 text-ink-dim">
            <Text path="admin.tactics.sideLabel" />
          </span>
          <select
            className={`${SELECT_CLASS} w-24`}
            value={newSide}
            onChange={(event) => setNewSide(event.currentTarget.value === 'CT' ? 'CT' : 'T')}
          >
            <option value="T">T</option>
            <option value="CT">CT</option>
          </select>
        </label>
        <Button onClick={() => onCreate(newMap, newSide)}>
          <Text path="admin.tactics.create" />
        </Button>
      </div>
      {resource.status === 'error' ? <Notice failure={resource.failure} onRetry={onRetry} /> : null}
      {failure === null ? null : <Notice failure={failure} />}
      {resource.status === 'ready' && tactics.length === 0 ? (
        <Muted>
          <Text path="admin.tactics.siteEmpty" />
        </Muted>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {tactics.map((tactic) => (
          <li
            key={tactic.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-chip border border-line bg-surface-2 px-3 py-2.5 max-sm:grid-cols-1"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-14 text-ink">{tactic.title}</span>
              <span className="numeric truncate text-12 text-ink-dim">
                <Text
                  path="admin.tactics.summary"
                  values={{
                    map: tactic.map,
                    side: tactic.side,
                    steps: mainSteps(tactic).length,
                    author: tactic.author ?? '—',
                    updated: format.format(tactic.updatedAt),
                  }}
                />
              </span>
            </span>
            {asking === tactic.id ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-13 text-ink">
                  <Text path="admin.tactics.deleteConfirm" values={{ title: tactic.title }} />
                </span>
                <Button variant="destructive" onClick={() => void remove(tactic.id)}>
                  <Text path="admin.current.confirm" />
                </Button>
                <Button variant="outline" onClick={() => setAsking(null)}>
                  <Text path="admin.current.cancel" />
                </Button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Button variant="outline" onClick={() => onEdit(tactic)}>
                  <Text path="admin.tactics.edit" />
                </Button>
                <Button variant="ghost" onClick={() => setAsking(tactic.id)}>
                  <Text path="admin.current.delete" />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
