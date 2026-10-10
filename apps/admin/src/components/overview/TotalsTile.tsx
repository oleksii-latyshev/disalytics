import type { OverviewResponse } from '@disa/admin-contract';
import { Text, type TranslationKey, useLocale } from '@disa/i18n';
import { TILE_BODY, TileHead } from './BentoTile';

type Figure = 'lineups' | 'collections' | 'tactics' | 'maps';

const LABELS: Readonly<Record<Figure, TranslationKey>> = {
  lineups: 'admin.overview.totals.lineups',
  collections: 'admin.overview.totals.collections',
  tactics: 'admin.overview.totals.tactics',
  maps: 'admin.overview.totals.maps',
};

const FIGURES: readonly Figure[] = ['lineups', 'collections', 'tactics', 'maps'];

/** The site in four numbers, each with what the last week added. Maps covered has no week. */
export function TotalsTile({ data }: { data: OverviewResponse }) {
  const format = new Intl.NumberFormat(useLocale());
  return (
    <div className={TILE_BODY}>
      <TileHead title={<Text path="admin.overview.totals.title" />} />
      <dl className="m-0 grid flex-1 grid-cols-2 content-center gap-x-4 gap-y-5">
        {FIGURES.map((figure) => {
          const added = figure === 'maps' ? null : data.week[figure];
          return (
            <div key={figure} className="flex min-w-0 flex-col gap-1">
              <dt className="text-12 text-ink-dim">
                <Text path={LABELS[figure]} />
              </dt>
              <dd className="numeric m-0 text-28 text-ink leading-dense md:text-44">
                {format.format(data.totals[figure])}
              </dd>
              {added === null || added === 0 ? null : (
                <dd className="numeric m-0 text-12 text-ink">
                  <Text path="admin.overview.totals.week" values={{ count: added }} />
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
