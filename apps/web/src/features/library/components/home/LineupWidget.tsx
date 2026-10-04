import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { loadMapLineups, MAP_IDS } from '@disa/map-data';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLineupCatalog } from '@/core/lineup-catalog';
import { useSetting } from '@/core/settings';
import { mapTitle } from '../../helpers/map-title';
import { MapPoster } from '../MapPoster';
import type { WidgetProps } from './types';

const FALLBACK_MAP = 'de_mirage';
const MILLISECONDS_PER_DAY = 86_400_000;

const ACTION =
  'mt-1 inline-flex w-fit items-center gap-1.5 text-13 font-medium text-ink hover:text-ink-dim focus-visible:outline-2 focus-visible:outline-focus';

/** Every lineup on the device, saved and built-in, read only once the match's own map has none. */
function useAnyLineups(isNeeded: boolean): readonly Lineup[] {
  const [lineups, setLineups] = useState<readonly Lineup[]>([]);

  useEffect(() => {
    if (!isNeeded) return;
    let isCurrent = true;
    void (async () => {
      const store = await openLineupStore();
      const saved = store === null ? [] : await store.list().catch(() => []);
      store?.close();
      const builtIn = (await Promise.all(MAP_IDS.map((id) => loadMapLineups(id)))).flat();
      const ownIds = new Set(saved.map((lineup) => lineup.id));
      if (isCurrent) setLineups([...saved, ...builtIn.filter((l) => !ownIds.has(l.id))]);
    })().catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [isNeeded]);

  return lineups;
}

export function LineupWidget({ data }: WidgetProps) {
  const t = useT();
  const [theme] = useSetting('radarTheme');
  const map = data.last?.map ?? FALLBACK_MAP;
  const { lineups: onMap, loading } = useLineupCatalog(map);
  const anywhere = useAnyLineups(!loading && onMap.length === 0);
  const lineups = onMap.length > 0 ? onMap : anywhere;
  const [offset, setOffset] = useState(0);
  const today = Math.floor(Date.now() / MILLISECONDS_PER_DAY);
  const lineup = lineups.length === 0 ? undefined : lineups[(today + offset) % lineups.length];

  return (
    <>
      <MapPoster map={lineup?.map ?? map} theme={theme} />
      <div className="relative flex h-full flex-col justify-end gap-1.5 p-4 md:px-5 md:py-[18px]">
        <div className="flex items-center justify-between gap-2">
          <p className="label-dense text-ink-dim">
            <Text path="library.home.widget.lineup.eyebrow" />
          </p>
          {lineups.length > 1 && (
            <button
              type="button"
              aria-label={t('library.home.widget.lineup.another')}
              onClick={() => setOffset((current) => current + 1)}
              className="flex size-7 items-center justify-center rounded-chip text-ink-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Shuffle aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        {lineup === undefined ? (
          <>
            <p className="text-16 font-semibold leading-dense">
              <Text path="library.home.widget.lineup.emptyTitle" />
            </p>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.home.widget.lineup.emptyHint" />
            </p>
          </>
        ) : (
          <>
            <p className="line-clamp-2 text-16 font-semibold leading-dense">{lineup.title}</p>
            <p className="truncate text-12 text-ink-dim">
              <Text
                path="library.home.widget.lineup.meta"
                values={{ map: mapTitle(lineup.map), kind: lineup.kind, side: lineup.side }}
              />
            </p>
          </>
        )}
        <Link to="/lineups" className={ACTION}>
          <Text
            path={
              lineup === undefined
                ? 'library.home.widget.lineup.save'
                : 'library.home.widget.lineup.practise'
            }
          />
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </>
  );
}
