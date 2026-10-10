import type { OverviewResponse } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { TILE_BODY, TILE_LINK, TileHead } from './BentoTile';

/** The three people with the most lineups live on the site, with their Steam profiles. */
export function TopTile({ data }: { data: OverviewResponse }) {
  return (
    <div className={TILE_BODY}>
      <TileHead
        title={<Text path="admin.overview.top.title" />}
        aside={
          <a href="#/contributors" className={TILE_LINK}>
            <Text path="admin.overview.top.all" />
          </a>
        }
      />
      {data.contributors.length === 0 ? (
        <p className="m-auto text-center text-13 text-ink-dim">
          <Text path="admin.overview.top.empty" />
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {data.contributors.map((person, index) => (
            <li key={person.name} className="flex items-baseline gap-3">
              <span className="numeric w-4 text-12 text-ink-faint">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-13 text-ink">
                {person.steamUrl === undefined ? (
                  person.name
                ) : (
                  <a
                    href={person.steamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="relative z-3 rounded-chip underline-offset-4 hover:underline"
                  >
                    {person.name}
                  </a>
                )}
              </span>
              <span className="numeric whitespace-nowrap text-12 text-ink-dim">
                <Text path="admin.contributors.total" values={{ count: person.total }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
