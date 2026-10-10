import type { Contributor } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import type { Resource } from '../hooks/use-resource';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

/** Who added the lineups on the site now: a total and the split by map, for every signed-in person. */
export function ContributorsSection({
  resource,
  onRetry,
}: {
  resource: Resource<readonly Contributor[]>;
  onRetry: () => void;
}) {
  return (
    <Section title={<Text path="admin.contributors.title" />}>
      <p className="text-12 text-ink-faint">
        <Text path="admin.contributors.lede" />
      </p>
      {resource.status === 'error' ? <Notice failure={resource.failure} onRetry={onRetry} /> : null}
      {resource.status === 'loading' || resource.status === 'idle' ? (
        <Muted>
          <Text path="admin.contributors.loading" />
        </Muted>
      ) : null}
      {resource.status === 'ready' && resource.data.length === 0 ? (
        <Muted>
          <Text path="admin.contributors.empty" />
        </Muted>
      ) : null}
      {resource.status === 'ready' && resource.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {resource.data.map((person) => (
            <li
              key={person.name}
              className="flex flex-col gap-1 rounded-chip border border-line bg-surface-2 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-13 text-ink">
                  {person.steamUrl === undefined ? (
                    person.name
                  ) : (
                    <a
                      href={person.steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {person.name}
                    </a>
                  )}
                </span>
                <span className="numeric text-13 text-ink">
                  <Text path="admin.contributors.total" values={{ count: person.total }} />
                </span>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-12 text-ink-dim">
                {Object.entries(person.byMap)
                  .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
                  .map(([map, count]) => (
                    <li key={map} className="numeric">
                      {map} · {count}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
