import type { OverviewResponse, WhoAmI } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { Layers, Map as MapIcon, NotebookPen, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Resource } from '../../hooks/use-resource';
import { Notice } from '../Notice';
import { ActionTile } from './ActionTile';
import { BentoTile } from './BentoTile';
import { HeroTile } from './HeroTile';
import { MapsTile } from './MapsTile';
import { PeopleTile } from './PeopleTile';
import { RecentTile } from './RecentTile';
import { TopTile } from './TopTile';
import { TotalsTile } from './TotalsTile';

const SKELETON_LINES = ['w-1/3', 'w-2/3', 'w-1/2'] as const;

/** A tile that has not arrived: bars where the words will be, so the grid does not jump. */
function SkeletonBody() {
  return (
    <div className="bento-skeleton flex size-full flex-col gap-3 p-5" aria-hidden="true">
      {SKELETON_LINES.map((width) => (
        <span key={width} className={`h-3 rounded-full bg-surface-3 ${width}`} />
      ))}
    </div>
  );
}

/**
 * The admin's home: what to do next, as tiles, and the state of the site beside them. Fixed
 * layout. While the numbers load their tiles are skeletons; if they cannot be had, one tile says so
 * and the places to go stay.
 */
export function Overview({
  me,
  resource,
  onRetry,
  onAddSteam,
}: {
  me: WhoAmI;
  resource: Resource<OverviewResponse>;
  onRetry: () => void;
  onAddSteam: () => void;
}) {
  const data = resource.status === 'ready' ? resource.data : null;
  const isLoading = resource.status === 'loading' || resource.status === 'idle';
  const isOwner = me.role === 'owner';

  return (
    <section aria-busy={isLoading}>
      {isLoading ? (
        <p role="status" className="sr-only">
          <Text path="admin.overview.loading" />
        </p>
      ) : null}
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 items-start md:grid-cols-4 md:gap-4">
        <BentoTile index={0} className="col-span-2 self-stretch">
          <HeroTile me={me} overview={resource} onAddSteam={onAddSteam} />
        </BentoTile>

        <DataTile
          index={1}
          className="col-span-2 self-stretch"
          resource={resource}
          onRetry={onRetry}
        >
          {(loaded) => <TotalsTile data={loaded} />}
        </DataTile>

        <BentoTile index={2} className="self-stretch">
          <ActionTile
            href="#/lineups/add"
            tone="var(--tone-add)"
            icon={Waypoints}
            title="admin.overview.actions.add.title"
            text="admin.overview.actions.add.text"
            count={
              data === null ? null : (
                <Text
                  path="admin.overview.actions.add.count"
                  values={{ count: data.totals.lineups }}
                />
              )
            }
          />
        </BentoTile>
        <BentoTile index={3} className="self-stretch">
          <ActionTile
            href="#/lineups/site"
            tone="var(--tone-site)"
            icon={MapIcon}
            title="admin.overview.actions.onSite.title"
            text="admin.overview.actions.onSite.text"
            count={
              data === null ? null : (
                <Text
                  path="admin.overview.actions.onSite.count"
                  values={{ count: data.totals.maps }}
                />
              )
            }
          />
        </BentoTile>
        <BentoTile index={4} className="self-stretch">
          <ActionTile
            href="#/lineups/site"
            tone="var(--tone-collections)"
            icon={Layers}
            title="admin.overview.actions.collections.title"
            text="admin.overview.actions.collections.text"
            count={
              data === null ? null : (
                <Text
                  path="admin.overview.actions.collections.count"
                  values={{ count: data.totals.collections }}
                />
              )
            }
          />
        </BentoTile>
        <BentoTile index={5} className="self-stretch">
          <ActionTile
            href="#/tactics"
            tone="var(--tone-tactics)"
            icon={NotebookPen}
            title="admin.overview.actions.tactics.title"
            text="admin.overview.actions.tactics.text"
            count={
              data === null ? null : (
                <Text
                  path="admin.overview.actions.tactics.count"
                  values={{ count: data.totals.tactics }}
                />
              )
            }
          />
        </BentoTile>

        {resource.status === 'error' ? null : (
          <>
            <DataTile index={6} className="col-span-2 md:col-span-4" resource={resource}>
              {(loaded) => <MapsTile maps={loaded.maps} />}
            </DataTile>
            <DataTile index={7} className="col-span-2" resource={resource}>
              {(loaded) => <RecentTile data={loaded} />}
            </DataTile>
            <li className="col-span-2">
              <ul className="m-0 flex list-none flex-col gap-3 p-0 md:gap-4">
                <DataTile index={8} className="" resource={resource}>
                  {(loaded) => <TopTile data={loaded} />}
                </DataTile>
                {isOwner ? (
                  <BentoTile index={9}>
                    <PeopleTile />
                  </BentoTile>
                ) : null}
              </ul>
            </li>
          </>
        )}
      </ul>
    </section>
  );
}

/** A tile of the numbers: the skeleton while they load, the retry when they cannot be had. */
function DataTile({
  index,
  className,
  resource,
  onRetry,
  children,
}: {
  index: number;
  className: string;
  resource: Resource<OverviewResponse>;
  onRetry?: () => void;
  children: (data: OverviewResponse) => ReactNode;
}) {
  const isLoading = resource.status === 'loading' || resource.status === 'idle';
  return (
    <BentoTile index={index} className={className} isBusy={resource.status !== 'ready'}>
      {resource.status === 'ready' ? children(resource.data) : null}
      {isLoading ? <SkeletonBody /> : null}
      {resource.status === 'error' ? (
        <div className="flex size-full items-center p-5">
          <Notice failure={resource.failure} onRetry={onRetry} />
        </div>
      ) : null}
    </BentoTile>
  );
}
