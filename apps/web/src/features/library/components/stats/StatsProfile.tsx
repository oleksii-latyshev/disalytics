import { foldPlayerLines } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { mapsOf, momentsAcross, onMap, type ProfileMatch } from '../../helpers/player-profile';
import { StatsKpis } from './StatsKpis';
import { StatsMatches } from './StatsMatches';
import { StatsSides, StatsWeapons } from './StatsSides';

interface Props {
  steamId: string;
  /** Newest first, as the library lists them. */
  matches: readonly ProfileMatch[];
  demos: readonly SavedDemo[];
  isYou: boolean;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
}

const FILTER_BASE =
  'h-9 shrink-0 rounded-chip px-3 text-13 font-medium focus-visible:outline-2 focus-visible:outline-focus';

function MapFilter({
  maps,
  map,
  onChange,
}: {
  maps: readonly string[];
  map: string | null;
  onChange: (map: string | null) => void;
}) {
  const t = useT();
  const options: readonly (string | null)[] = [null, ...maps];

  return (
    <fieldset className="m-0 flex min-w-0 max-w-full flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t('library.stats.maps.label')}</legend>
      {options.map((option) => (
        <button
          key={option ?? 'all'}
          type="button"
          aria-pressed={map === option}
          onClick={() => onChange(option)}
          className={`${FILTER_BASE} ${option === null ? '' : 'font-mono'} ${
            map === option ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'
          }`}
        >
          {option ?? <Text path="library.stats.maps.all" />}
        </button>
      ))}
    </fieldset>
  );
}

export function StatsProfile({ steamId, matches, demos, isYou, onEnter }: Props) {
  const t = useT();
  const [map, setMap] = useState<string | null>(null);
  const maps = useMemo(() => mapsOf(matches), [matches]);
  const everything = useMemo(() => foldPlayerLines(matches.map(({ line }) => line)), [matches]);
  const filtered = useMemo(() => onMap(matches, map), [matches, map]);
  const summary = useMemo(() => foldPlayerLines(filtered.map(({ line }) => line)), [filtered]);
  const moments = useMemo(() => momentsAcross(filtered), [filtered]);
  const latest = matches[0]?.line;
  if (latest === undefined) return null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-float border border-line bg-surface-1 p-4 md:p-6">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-card bg-surface-3 font-ui text-20 font-bold md:size-[72px] md:text-28"
        >
          {Array.from(latest.name)[0]?.toLowerCase()}
        </span>
        <div className="flex min-w-[min(100%,16rem)] flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="min-w-0 break-words font-ui text-28 font-bold leading-dense md:text-[36px]">
              {latest.name}
            </h3>
            <span className="inline-flex items-center gap-1.5 text-13 text-ink-dim md:text-14">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${latest.openedAs === 'ct' ? 'bg-ct' : 'bg-t'}`}
              />
              <Text
                path="library.stats.found.team"
                values={{ side: latest.openedAs === 'ct' ? 'CT' : 'T' }}
              />
            </span>
            {isYou && (
              <span className="rounded-chip bg-surface-3 px-2 py-0.5 text-12">
                <Text path="library.stats.found.you" />
              </span>
            )}
          </div>
          <p className="numeric font-mono text-11 text-ink-faint [overflow-wrap:anywhere] md:text-13">
            {t('library.stats.found.line', {
              id: steamId,
              found: matches.length,
              total: demos.length,
              rounds: everything.rounds,
            })}
          </p>
        </div>
        <MapFilter maps={maps} map={map} onChange={setMap} />
      </section>

      <StatsKpis summary={summary} matches={filtered} isAcrossMaps={map === null} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[999_1_40rem]">
          <StatsMatches
            matches={filtered}
            moments={moments}
            summary={summary}
            demos={demos}
            onEnter={onEnter}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-4">
          <StatsSides summary={summary} />
          <StatsWeapons summary={summary} />
        </div>
      </div>
    </div>
  );
}
