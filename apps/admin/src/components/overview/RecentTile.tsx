import type { OverviewChange, OverviewResponse } from '@disa/admin-contract';
import { Text, type TranslationKey, useLocale } from '@disa/i18n';
import { relativeTime } from '../../helpers/overview';
import { TILE_BODY, TILE_LINK, TileHead } from './BentoTile';

const ACTIONS: Readonly<
  Record<OverviewChange['kind'], Readonly<Record<OverviewChange['action'], TranslationKey>>>
> = {
  lineup: {
    add: 'admin.overview.recent.lineupAdd',
    update: 'admin.overview.recent.lineupUpdate',
    delete: 'admin.overview.recent.lineupDelete',
  },
  collection: {
    add: 'admin.overview.recent.collectionAdd',
    update: 'admin.overview.recent.collectionUpdate',
    delete: 'admin.overview.recent.collectionDelete',
  },
  tactic: {
    add: 'admin.overview.recent.tacticAdd',
    update: 'admin.overview.recent.tacticUpdate',
    delete: 'admin.overview.recent.tacticDelete',
  },
};

/** The latest writes across all maps: who did what to which item, and how long ago. */
export function RecentTile({ data }: { data: OverviewResponse }) {
  const locale = useLocale();
  const now = Date.now();
  return (
    <div className={TILE_BODY}>
      <TileHead
        title={<Text path="admin.overview.recent.title" />}
        aside={
          <a href="#/history" className={TILE_LINK}>
            <Text path="admin.overview.recent.all" />
          </a>
        }
      />
      {data.recent.length === 0 ? (
        <p className="m-auto max-w-xs text-center text-13 text-ink-dim leading-prose">
          <Text path="admin.overview.recent.empty" />
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {data.recent.map((change) => (
            <li
              key={change.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 py-2 [border-block-start:1px_solid_var(--color-line-soft)] first:border-0 first:pt-0"
            >
              <span className="min-w-0 break-words text-13 text-ink-dim leading-prose">
                <span className="text-ink">{change.actor}</span>{' '}
                <Text path={ACTIONS[change.kind][change.action]} />{' '}
                <span className="text-ink">
                  {change.title ?? <Text path="admin.overview.recent.untitled" />}
                </span>
              </span>
              <time
                dateTime={new Date(change.at).toISOString()}
                className="numeric whitespace-nowrap text-12 text-ink-faint"
              >
                {relativeTime(change.at, now, locale)}
              </time>
              <span className="numeric text-11 text-ink-faint">{change.map}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
