import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { Button } from '@disa/ui';
import { megabytesOf, minutesOf } from '../helpers/saved-list';
import { DemoFileName } from './DemoFileName';
import { MapPoster } from './MapPoster';
import { MatchShape } from './MatchShape';
import { MetaDot } from './MetaDot';

interface Props {
  demo: SavedDemo;
  theme: RadarTheme;
  onOpen: (demo: SavedDemo) => void;
  onRemove: (key: string) => void;
}

/**
 * One demo the device holds. Pressing it opens the demo from the cache with no file involved, which
 * is the whole point of the feature.
 *
 * **The score is by the side each team started on.** `Round.winner` is a side and sides swap at
 * halftime, so a card reading `CT 13 – T 11` would be wrong for half of every match — #141 is that
 * same bug on the review screen. There are no team names either, and not by omission: nothing in
 * `MatchHeader` carries them, so the card does not promise them.
 *
 * The remove control is a sibling of the open control rather than a button inside one, and removal
 * is immediate and unconfirmed: what it deletes is a cache entry, and the copy says the reader's
 * own `.dem` is untouched.
 *
 * **Everything on it comes out of `CatalogEntry.meta`.** That block is written at store time only —
 * a read never writes the catalog — so a card that wanted a reading the meta does not hold would
 * have to open its cached container, which is ten megabytes of decompression per card on a screen
 * showing eight of them. Two of the readings are optional in the meta and simply do not draw on a
 * demo saved before they existed.
 *
 * **Every card is the same height, and each part of it is what makes that true**: the map name and
 * the file name are clamped to a fixed number of lines rather than to their content, the facts are
 * one line that scrolls nothing, and `MatchShape` fills the width instead of wrapping. A wall of
 * equal cards needs no measured layout — it is the grid, in the order the list is sorted in.
 */
export function DemoCard({ demo, theme, onOpen, onRemove }: Props) {
  const t = useT();

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        aria-label={t('library.saved.open', { map: demo.map })}
        className="group relative flex h-56 w-full flex-col justify-end overflow-hidden rounded-card border border-line bg-surface-1 text-left transition-colors duration-(--duration-micro) ease-out hover:border-line-strong"
      >
        <MapPoster map={demo.map} theme={theme} />

        <span className="relative flex min-w-0 flex-col gap-1 p-3">
          <span className="flex items-baseline justify-between gap-3">
            {/* A map name is game vocabulary and stays as the demo wrote it — AGENTS.md §11. */}
            <span className="truncate text-14">{demo.map}</span>
            <span className="numeric shrink-0 text-14">
              <Text path="library.saved.score" values={{ ...demo.score }} />
            </span>
          </span>

          {demo.winners !== undefined && <MatchShape winners={demo.winners} />}

          {/* Two lines rather than four facts on one, and they are two registers rather than a
              wrap: what the *match* was, then what the *file* is. Four on one line is 30 characters
              of mono against 216px of card at the narrowest column and is clipped mid-word in `en`
              before `ru` is even asked; two lines that each fit are what keeps every card the same
              height without losing a reading. */}
          <span className="flex h-4 items-baseline gap-x-2 truncate text-12 text-ink-dim">
            <span className="numeric">
              <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
            </span>
            {demo.durationSeconds !== undefined && (
              <>
                <MetaDot />
                <span className="numeric">
                  <Text
                    path="library.saved.duration"
                    values={{ minutes: minutesOf(demo.durationSeconds) }}
                  />
                </span>
              </>
            )}
          </span>

          <span className="flex h-4 items-baseline gap-x-2 truncate text-12 text-ink-dim">
            <span className="numeric">
              <Text path="library.saved.storedAt" values={{ when: new Date(demo.storedAt) }} />
            </span>
            <MetaDot />
            <span className="numeric">
              <Text
                path="library.saved.size"
                values={{ megabytes: megabytesOf(demo.byteLength) }}
              />
            </span>
          </span>

          <DemoFileName fileName={demo.fileName} lines={2} />
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-surface-0/70 text-ink-dim hover:bg-surface-0 hover:text-ink"
        aria-label={t('library.saved.remove', { fileName: demo.fileName })}
        onClick={() => onRemove(demo.key)}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path
            d="M2 2 L8 8 M8 2 L2 8"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </Button>
    </li>
  );
}
