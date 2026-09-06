import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { type SampleMatch, sampleByteLength } from '@/core/samples';
import { megabytesOf } from '../helpers/saved-list';
import { MapThumbnail } from './MapThumbnail';
import { MetaDot } from './MetaDot';

interface Props {
  sample: SampleMatch;
  theme: RadarTheme;
  onOpen: (sample: SampleMatch) => void;
}

/**
 * A match this build ships, before it is on the device. It is deliberately the same card as a saved
 * demo — same thumbnail, same measure, same press — because the difference is where the bytes come
 * from and nothing a reader is choosing between.
 *
 * What it promises is only what is known without downloading: the map, the two teams and the event,
 * which are the catalogue's own, and the size, which is the file's. The score and the round count
 * are inside the container, so they arrive with it and the card that replaces this one carries them.
 *
 * Team, event and map names are proper nouns and game vocabulary — `AGENTS.md` §11 — so they are
 * rendered as written and never through `<Text>`.
 */
export function SampleCard({ sample, theme, onOpen }: Props) {
  const t = useT();
  const megabytes = megabytesOf(sampleByteLength(sample.id));
  const [home, away] = sample.teams;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(sample)}
        aria-label={t('library.samples.open', { home, away, map: sample.map, megabytes })}
        className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 text-left transition-colors duration-(--duration-micro) ease-out hover:border-line-strong hover:bg-hover"
      >
        <MapThumbnail map={sample.map} theme={theme} />

        <span className="flex min-w-0 flex-col gap-1 p-3">
          {/* One whole sentence rather than two names either side of a hardcoded word: the names
              are game vocabulary and the join between them is not. It has the line to itself
              because both cards of a series carry the same two names, and a map name beside them
              is what gets truncated first. */}
          <span className="truncate text-14">
            <Text path="library.samples.teams" values={{ home, away }} />
          </span>

          <span className="flex flex-wrap items-baseline gap-x-2 text-12 text-ink-dim">
            <span className="shrink-0">{sample.map}</span>
            <MetaDot />
            <span className="truncate">{sample.event}</span>
            <MetaDot />
            <span className="numeric shrink-0">
              <Text path="library.samples.size" values={{ megabytes }} />
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
