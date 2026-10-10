import type { OverviewResponse, WhoAmI } from '@disa/admin-contract';
import { Text, useLocale } from '@disa/i18n';
import { ArrowRight, NotebookPen, Plus } from 'lucide-react';
import { relativeTime } from '../../helpers/overview';
import type { Resource } from '../../hooks/use-resource';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, TILE_BODY } from './BentoTile';

/** The person's own part of the site: what they have live, when they last wrote, their Steam link. */
function Contribution({
  data,
  hasSteam,
  onAddSteam,
}: {
  data: OverviewResponse;
  hasSteam: boolean;
  onAddSteam: () => void;
}) {
  const locale = useLocale();
  return (
    <dl className="m-0 flex flex-wrap items-end gap-x-8 gap-y-3 [border-block-start:1px_solid_var(--color-line)] pt-4">
      <div className="flex flex-col gap-0.5">
        <dt className="text-12 text-ink-dim">
          <Text path="admin.overview.yourLineups" />
        </dt>
        <dd className="numeric m-0 text-20 text-ink">{data.mine}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-12 text-ink-dim">
          <Text path="admin.overview.yourLast" />
        </dt>
        <dd className="m-0 text-14 text-ink">
          {data.mineLastAt === null ? (
            <Text path="admin.overview.yourLastNone" />
          ) : (
            relativeTime(data.mineLastAt, Date.now(), locale)
          )}
        </dd>
      </div>
      {hasSteam ? null : (
        <div className="relative z-3">
          <button
            type="button"
            onClick={onAddSteam}
            className="rounded-chip text-12 text-ink-dim underline underline-offset-4 hover:text-ink"
          >
            <Text path="admin.overview.addSteam" />
          </button>
        </div>
      )}
    </dl>
  );
}

/** Who is here, the two things they most likely came to do, and their own part of the site. */
export function HeroTile({
  me,
  overview,
  onAddSteam,
}: {
  me: WhoAmI;
  overview: Resource<OverviewResponse>;
  onAddSteam: () => void;
}) {
  const data = overview.status === 'ready' ? overview.data : null;
  const isFirstStep = data !== null && data.totals.lineups === 0;

  return (
    <div className={`${TILE_BODY} gap-5 md:p-7`}>
      <div className="flex flex-col gap-2">
        <p className="label-dense text-ink-dim">
          <Text path={me.role === 'owner' ? 'admin.role.owner' : 'admin.role.editor'} />
        </p>
        <h2 className="break-words font-medium font-ui text-28 leading-dense md:text-44">
          <Text
            path={isFirstStep ? 'admin.overview.firstTitle' : 'admin.overview.hello'}
            values={{ name: me.name }}
          />
        </h2>
        <p className="max-w-xl text-14 text-ink-dim leading-prose">
          <Text path={isFirstStep ? 'admin.overview.firstLede' : 'admin.overview.heroLede'} />
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="#/lineups/add" className={BUTTON_PRIMARY}>
          {isFirstStep ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          <Text path={isFirstStep ? 'admin.overview.firstAction' : 'admin.overview.add'} />
        </a>
        {isFirstStep ? null : (
          <a href="#/tactics/new" className={BUTTON_SECONDARY}>
            <NotebookPen aria-hidden="true" className="size-4" />
            <Text path="admin.overview.newTactic" />
          </a>
        )}
      </div>
      {data === null ? null : (
        <div className="mt-auto">
          <Contribution data={data} hasSteam={me.steamUrl !== undefined} onAddSteam={onAddSteam} />
        </div>
      )}
    </div>
  );
}
