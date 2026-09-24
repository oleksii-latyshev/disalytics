import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { ArrowUpRight } from 'lucide-react';
import { type SampleMatch, sampleByteLength } from '@/core/samples';
import { megabytesOf } from '../helpers/saved-list';
import { MapPoster } from './MapPoster';
import { MetaDot } from './MetaDot';

interface Props {
  sample: SampleMatch;
  theme: RadarTheme;
  onOpen: (sample: SampleMatch) => void;
}

export function SampleCard({ sample, theme, onOpen }: Props) {
  const t = useT();
  const megabytes = megabytesOf(sampleByteLength(sample.id));
  const [home, away] = sample.teams;

  return (
    <li className="group list-none [border-block-end:1px_solid_var(--color-line)]">
      <button
        type="button"
        onClick={() => onOpen(sample)}
        aria-label={t('library.samples.open', { home, away, map: sample.map, megabytes })}
        className="flex min-h-24 w-full items-center gap-4 py-3 text-left transition-[padding,background-color] duration-(--duration-micro) ease-out hover:pl-2 hover:bg-hover focus-visible:rounded-chip focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-chip border border-line bg-surface-1">
          <MapPoster map={sample.map} theme={theme} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-14 font-medium">
            <Text path="library.samples.teams" values={{ home, away }} />
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 text-11 text-ink-dim">
            <span>{sample.map}</span>
            <MetaDot />
            <span>{sample.event}</span>
          </span>
          <span className="numeric text-11 text-ink-dim">
            <Text path="library.samples.size" values={{ megabytes }} />
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-dim transition-[transform,color] duration-(--duration-micro) ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </button>
    </li>
  );
}
