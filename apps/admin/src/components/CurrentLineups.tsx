import { isLineup, type Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import type { Resource } from '../hooks/use-resource';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

export function CurrentLineups({
  map,
  resource,
  onChanged,
  onRetry,
}: {
  map: string;
  resource: Resource<readonly unknown[]>;
  onChanged: () => void;
  onRetry: () => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const remove = async (id: string) => {
    setFailure(null);
    try {
      await call((client) => client.lineups.remove({ params: { id } }));
      setAsking(null);
      onChanged();
    } catch (error) {
      setFailure(isFailure(error) ? error : { key: 'admin.error.network', detail: undefined });
    }
  };

  return (
    <Section title={<Text path="admin.current.title" values={{ map }} />}>
      {failure === null ? null : <Notice failure={failure} />}
      {resource.status === 'loading' || resource.status === 'idle' ? (
        <Muted>
          <Text path="admin.current.loading" />
        </Muted>
      ) : null}
      {resource.status === 'error' ? <Notice failure={resource.failure} onRetry={onRetry} /> : null}
      {resource.status === 'ready' ? (
        <List
          lineups={resource.data.filter(isLineup)}
          asking={asking}
          onAsk={setAsking}
          onRemove={(id) => void remove(id)}
        />
      ) : null}
    </Section>
  );
}

function List({
  lineups,
  asking,
  onAsk,
  onRemove,
}: {
  lineups: readonly Lineup[];
  asking: string | null;
  onAsk: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  if (lineups.length === 0) {
    return (
      <Muted>
        <Text path="admin.current.empty" />
      </Muted>
    );
  }
  return (
    <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
      {lineups.map((lineup) => (
        <li
          key={lineup.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-chip px-2 py-1 hover:bg-hover"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-13 text-ink">{lineup.title}</span>
            <span className="numeric truncate text-12 text-ink-dim">
              {lineup.kind} · {lineup.side} · {lineup.id}
            </span>
          </span>
          {asking === lineup.id ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-12 text-ink">
                <Text path="admin.current.deleteConfirm" values={{ title: lineup.title }} />
              </span>
              <Button variant="destructive" onClick={() => onRemove(lineup.id)}>
                <Text path="admin.current.confirm" />
              </Button>
              <Button variant="outline" onClick={() => onAsk(null)}>
                <Text path="admin.current.cancel" />
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => onAsk(lineup.id)}>
              <Text path="admin.current.delete" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
