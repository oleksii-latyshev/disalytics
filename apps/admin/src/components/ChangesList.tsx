import type { ChangeEntry } from '@disa/admin-contract';
import { Text, useLocale, useT } from '@disa/i18n';
import type { Resource } from '../hooks/use-resource';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

export function ChangesList({
  resource,
  onRetry,
}: {
  resource: Resource<readonly ChangeEntry[]>;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const t = useT();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Section title={<Text path="admin.changes.title" />}>
      {resource.status === 'error' ? <Notice failure={resource.failure} onRetry={onRetry} /> : null}
      {resource.status === 'loading' || resource.status === 'idle' ? (
        <Muted>
          <Text path="admin.changes.loading" />
        </Muted>
      ) : null}
      {resource.status === 'ready' && resource.data.length === 0 ? (
        <Muted>
          <Text path="admin.changes.empty" />
        </Muted>
      ) : null}
      {resource.status === 'ready' && resource.data.length > 0 ? (
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {resource.data.map((change) => (
            <li key={change.id} className="flex flex-col rounded-chip px-2 py-1">
              <span className="text-13 text-ink">
                <Text
                  path="admin.changes.entry"
                  values={{
                    actor: change.actor,
                    action: t(
                      change.action === 'delete' ? 'admin.changes.delete' : 'admin.changes.save',
                    ),
                    lineup: change.lineupId,
                  }}
                />
              </span>
              <span className="numeric text-12 text-ink-dim">{format.format(change.at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
