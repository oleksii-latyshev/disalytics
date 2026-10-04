import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { Button } from '@disa/ui';
import { X } from 'lucide-react';
import type { SampleMatch } from '@/core/samples';
import { megabytesOf, minutesOf } from '../helpers/saved-list';
import { DemoFileName } from './DemoFileName';
import { MapPoster } from './MapPoster';
import { MatchShape } from './MatchShape';
import { MetaDot } from './MetaDot';

interface Props {
  demo: SavedDemo;
  /** Set when the demo is one of the shipped matches, which is what names its teams. */
  sample: SampleMatch | undefined;
  theme: RadarTheme;
  onOpen: (demo: SavedDemo) => void;
  onRemove: (key: string) => void;
}

/** Regulation is 24 rounds in MR12, so a longer match went to overtime. */
const REGULATION_ROUNDS = 24;

/**
 * One saved match: where it was played, when it was saved, how it ended and how it went.
 *
 * The score is `startedCt : startedT` — teams named by the side they opened on, the same way the
 * strip is tinted — so the two colours in the number are the two colours in the strip. The catalog
 * keeps no team names, so only a shipped sample can name its teams; a demo of the reader's own is
 * named by its file, which is also what search matches it by.
 */
export function DemoCard({ demo, sample, theme, onOpen, onRemove }: Props) {
  const t = useT();

  return (
    <li className="group relative list-none">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        aria-label={t('library.saved.open', { map: demo.map })}
        className="grid w-full grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-card border border-line bg-surface-1 p-3 text-left transition-colors duration-(--duration-micro) ease-out hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-stretch sm:gap-x-4 sm:p-3.5"
      >
        <span className="relative size-16 overflow-hidden rounded-chip bg-surface-0 sm:row-span-3 sm:size-auto sm:min-h-[9.5rem]">
          <MapPoster map={demo.map} theme={theme} />
          <span className="numeric absolute bottom-2 left-2 hidden rounded-chip bg-surface-0/85 px-1.5 py-0.5 text-11 text-ink sm:block">
            {demo.map}
          </span>
        </span>

        <span className="flex min-w-0 flex-col gap-1.5 pe-8">
          <span className="numeric flex flex-wrap items-center gap-x-2 gap-y-1 text-12 text-ink-dim">
            <span className="sm:hidden">{demo.map}</span>
            <span className="sm:hidden">
              <MetaDot />
            </span>
            <span>
              <Text path="library.card.when" values={{ when: new Date(demo.storedAt) }} />
            </span>
            {sample !== undefined && (
              <span className="rounded-chip bg-surface-3 px-1.5 py-px text-11 text-ink-dim">
                <Text path="library.card.sample" />
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="numeric text-20 leading-dense sm:text-28">
              <span className="text-ct">{demo.score.startedCt}</span>
              <span className="text-ink-faint"> : </span>
              <span className="text-t">{demo.score.startedT}</span>
            </span>
            <span className="min-w-0 truncate text-13 text-ink sm:text-14">
              {sample !== undefined ? (
                <Text
                  path="library.samples.teams"
                  values={{ home: sample.teams[0], away: sample.teams[1] }}
                />
              ) : (
                <DemoFileName fileName={demo.fileName} />
              )}
            </span>
          </span>
        </span>

        {demo.winners !== undefined && (
          <span className="col-span-2 block sm:col-span-1 sm:col-start-2">
            <MatchShape winners={demo.winners} />
          </span>
        )}

        <span className="numeric col-span-2 flex flex-wrap items-baseline gap-x-2 text-11 text-ink-dim sm:col-span-1 sm:col-start-2 sm:self-end sm:text-12">
          <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
          {demo.roundCount > REGULATION_ROUNDS && (
            <>
              <MetaDot />
              <Text path="library.card.overtimeMeta" />
            </>
          )}
          {demo.durationSeconds !== undefined && (
            <>
              <MetaDot />
              <Text
                path="library.saved.duration"
                values={{ minutes: minutesOf(demo.durationSeconds) }}
              />
            </>
          )}
          <MetaDot />
          <Text path="library.saved.size" values={{ megabytes: megabytesOf(demo.byteLength) }} />
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-ink-dim hover:text-ink"
        aria-label={t('library.saved.remove', { fileName: demo.fileName })}
        onClick={() => onRemove(demo.key)}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
}
