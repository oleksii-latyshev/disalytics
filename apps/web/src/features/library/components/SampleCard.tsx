import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { ArrowDown } from 'lucide-react';
import { type SampleMatch, sampleByteLength } from '@/core/samples';
import { megabytesOf } from '../helpers/saved-list';
import { MapPoster } from './MapPoster';
import { MetaDot } from './MetaDot';

interface Props {
  sample: SampleMatch;
  theme: RadarTheme;
  onOpen: (sample: SampleMatch) => void;
}

/**
 * A shipped match nobody has opened yet, in the grid beside the saved ones and shaped like them. It
 * has no score until it is parsed, so where a saved card reads the result this one reads the event
 * and what a press will download.
 */
export function SampleCard({ sample, theme, onOpen }: Props) {
  const t = useT();
  const megabytes = megabytesOf(sampleByteLength(sample.id));
  const [home, away] = sample.teams;

  return (
    <li className="group relative list-none">
      <button
        type="button"
        onClick={() => onOpen(sample)}
        aria-label={t('library.samples.open', { home, away, map: sample.map, megabytes })}
        className="grid w-full grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-card border border-line bg-surface-1 p-3 text-left transition-colors duration-(--duration-micro) ease-out hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-stretch sm:gap-x-4 sm:p-3.5"
      >
        <span className="relative size-16 overflow-hidden rounded-chip bg-surface-0 sm:row-span-2 sm:size-auto sm:min-h-[9.5rem]">
          <MapPoster map={sample.map} theme={theme} clear />
          <span className="numeric absolute bottom-2 left-2 hidden rounded-chip bg-surface-0/85 px-1.5 py-0.5 text-11 text-ink sm:block">
            {sample.map}
          </span>
        </span>

        <span className="flex min-w-0 flex-col gap-1.5 pe-8">
          <span className="numeric flex flex-wrap items-center gap-x-2 gap-y-1 text-12 text-ink-dim">
            <span className="sm:hidden">{sample.map}</span>
            <span className="sm:hidden">
              <MetaDot />
            </span>
            <span>{sample.event}</span>
            <span className="rounded-chip bg-surface-3 px-1.5 py-px text-11 text-ink-dim">
              <Text path="library.card.sample" />
            </span>
          </span>
          <span className="min-w-0 truncate text-16 font-medium sm:text-20">
            <Text path="library.samples.teams" values={{ home, away }} />
          </span>
        </span>

        <span className="numeric col-span-2 flex flex-wrap items-baseline gap-x-2 text-11 text-ink-dim sm:col-span-1 sm:col-start-2 sm:self-end sm:text-12">
          <Text path="library.samples.size" values={{ megabytes }} />
        </span>
      </button>
      <ArrowDown
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-4 size-4 text-ink-dim transition-[translate,color] duration-(--duration-micro) ease-out group-hover:translate-y-0.5 group-hover:text-ink"
      />
    </li>
  );
}
