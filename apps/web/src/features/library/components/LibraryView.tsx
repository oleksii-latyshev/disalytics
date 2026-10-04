import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { cn, inputVariants } from '@disa/ui';
import { useMemo, useState } from 'react';
import { SAMPLE_MATCHES, type SampleMatch, sampleKey } from '@/core/samples';
import { useSetting } from '@/core/settings';
import {
  type LibraryFilter,
  mapCounts,
  matchesFilter,
  type SortOrder,
  sortDemos,
} from '../helpers/library-grid';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoCard } from './DemoCard';
import { DemoDialog } from './DemoDialog';
import { LibraryStorage } from './LibraryStorage';
import { OpenDemoCard } from './OpenDemoCard';
import { SampleCard } from './SampleCard';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
  onFile: (file: File) => void;
}

function sampleOf(demo: SavedDemo): SampleMatch | undefined {
  return SAMPLE_MATCHES.find((sample) => sampleKey(sample.id) === demo.key);
}

const CHIP =
  'numeric flex h-8 shrink-0 items-center gap-1.5 rounded-chip px-2.5 text-12 transition-colors duration-(--duration-micro) ease-out focus-visible:outline-2 focus-visible:outline-focus';

export function LibraryView({ onEnter, onSample, onFile }: Props) {
  const t = useT();
  const { demos, forget } = useSavedDemos();
  const [theme] = useSetting('radarTheme');
  const [opened, setOpened] = useState<SavedDemo | null>(null);
  const [pickedMap, setPickedMap] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<SortOrder>('newest');

  const counts = useMemo(() => mapCounts(demos ?? []), [demos]);
  // A map whose last match was just removed has no chip left to show it as chosen.
  const map = counts.some((entry) => entry.map === pickedMap) ? pickedMap : null;
  const filter: LibraryFilter = { map, query };

  const shown = useMemo(
    () =>
      sortDemos(demos ?? [], order).filter((demo) =>
        matchesFilter(
          { map: demo.map, fileName: demo.fileName, teams: sampleOf(demo)?.teams ?? [] },
          { map, query },
        ),
      ),
    [demos, order, map, query],
  );
  const offered =
    demos === null
      ? []
      : SAMPLE_MATCHES.filter(
          (sample) =>
            !demos.some((demo) => demo.key === sampleKey(sample.id)) &&
            matchesFilter(
              { map: sample.map, fileName: sample.sourceFile, teams: sample.teams },
              filter,
            ),
        );
  const hasDemos = demos !== null && demos.length > 0;

  return (
    <section className="mx-auto flex w-full max-w-[72rem] flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-ui text-[clamp(30px,4vw,40px)] font-medium leading-[1.05] tracking-[-0.045em]">
            <Text path="library.grid.title" />
          </h2>
          <p className="max-w-[48ch] text-14 text-ink-dim leading-prose">
            <Text path="library.grid.lede" />
          </p>
        </div>
        {hasDemos && (
          <div className="w-full sm:w-auto sm:basis-[26rem]">
            <LibraryStorage demos={demos} />
          </div>
        )}
      </header>

      {demos === null && <div className="min-h-72" aria-busy="true" />}

      {hasDemos && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <fieldset
            aria-label={t('library.grid.mapFilter')}
            className="m-0 -mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:rounded-card sm:border sm:border-line sm:bg-surface-1 sm:p-1"
          >
            <button
              type="button"
              aria-pressed={map === null}
              onClick={() => setPickedMap(null)}
              className={`${CHIP} ${map === null ? 'bg-selected text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              <Text path="library.grid.allMaps" />
              <span className="text-ink-faint">{demos.length}</span>
            </button>
            {counts.map((entry) => (
              <button
                key={entry.map}
                type="button"
                aria-pressed={map === entry.map}
                onClick={() => setPickedMap(entry.map)}
                className={`${CHIP} ${map === entry.map ? 'bg-selected text-ink' : 'text-ink-dim hover:text-ink'}`}
              >
                {entry.map}
                <span className="text-ink-faint">{entry.count}</span>
              </button>
            ))}
          </fieldset>
          <label className="sr-only" htmlFor="library-sort">
            <Text path="library.grid.sort" />
          </label>
          <select
            id="library-sort"
            value={order}
            onChange={(event) => setOrder(event.target.value === 'oldest' ? 'oldest' : 'newest')}
            className={cn(inputVariants({ size: 'lg' }), 'w-auto')}
          >
            <option value="newest">{t('library.grid.newestFirst')}</option>
            <option value="oldest">{t('library.grid.oldestFirst')}</option>
          </select>
          <label className="sr-only" htmlFor="library-search">
            <Text path="library.grid.searchLabel" />
          </label>
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('library.grid.searchPlaceholder')}
            className={cn(inputVariants({ size: 'lg' }), 'w-full sm:ms-auto sm:max-w-72 sm:flex-1')}
          />
        </div>
      )}

      {demos !== null && !hasDemos && (
        <div className="flex min-h-40 flex-col justify-center rounded-float border border-line bg-surface-1 px-6 py-8 sm:px-10">
          <p className="text-20 font-medium leading-dense">
            <Text path="library.saved.emptyTitle" />
          </p>
          <p className="mt-3 max-w-[48ch] text-13 text-ink-dim leading-prose">
            <Text path="library.shell.empty" />
          </p>
        </div>
      )}

      {demos !== null && (
        <ul className="grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,34rem),1fr))]">
          {shown.map((demo) => (
            <DemoCard
              key={demo.key}
              demo={demo}
              sample={sampleOf(demo)}
              theme={theme}
              onOpen={setOpened}
              onRemove={forget}
            />
          ))}
          <OpenDemoCard onFile={onFile} />
        </ul>
      )}

      {hasDemos && shown.length === 0 && (
        <p className="text-13 text-ink-dim">
          <Text path="library.grid.noMatch" />
        </p>
      )}

      {offered.length > 0 && (
        <section className="mt-4" aria-labelledby="library-samples-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3">
            <h3 id="library-samples-heading" className="text-13 font-medium">
              <Text path="library.samples.title" />
            </h3>
            <p className="max-w-[60ch] text-11 text-ink-dim leading-prose">
              <Text path="library.samples.note" />
            </p>
          </div>
          <ul className="list-none [border-block-start:1px_solid_var(--color-line)] p-0">
            {offered.map((sample) => (
              <SampleCard key={sample.id} sample={sample} theme={theme} onOpen={onSample} />
            ))}
          </ul>
        </section>
      )}

      {hasDemos && (
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="library.saved.note" />
        </p>
      )}

      <DemoDialog
        saved={opened}
        onEnter={onEnter}
        onDismiss={() => setOpened(null)}
        onGone={forget}
      />
    </section>
  );
}
