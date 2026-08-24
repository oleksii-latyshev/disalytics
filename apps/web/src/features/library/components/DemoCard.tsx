import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { getMapOverview, type RadarTheme, radarAssetPath } from '@disa/map-data';
import { Button } from '@disa/ui';
import { megabytesOf } from '../helpers/saved-list';
import { DemoFileName } from './DemoFileName';
import { MetaDot } from './MetaDot';

interface Props {
  demo: SavedDemo;
  theme: RadarTheme;
  onOpen: (demo: SavedDemo) => void;
  onRemove: (key: string) => void;
}

/**
 * The thumbnail is **the same radar asset the plate draws**, in the theme the reader chose, so the
 * grid adds no image to the build. It is the map and not the match — two demos of Mirage look alike
 * here, which is orientation rather than identity, and the file name below is what tells them
 * apart. A map this build has no overview for simply has no picture; the name still reads.
 */
function MapThumbnail({ map, theme }: { map: string; theme: RadarTheme }) {
  const level = getMapOverview(map)?.levels[0];

  return (
    <span className="block aspect-[16/10] overflow-hidden bg-surface-2">
      {level !== undefined && (
        <img
          src={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
          alt=""
          loading="lazy"
          className="size-full scale-105 object-cover opacity-80 transition-opacity duration-(--duration-micro) ease-out group-hover:opacity-100"
        />
      )}
    </span>
  );
}

/**
 * One demo the device holds — `docs/DESIGN.md` §10.2. Pressing it opens the demo from the cache
 * with no file involved, which is the whole point of the feature.
 *
 * **The score is by the side each team started on.** `Round.winner` is a side and sides swap at
 * halftime, so a card reading `CT 13 – T 11` would be wrong for half of every match — #141 is that
 * same bug on the review screen. There are no team names either, and not by omission: nothing in
 * `MatchHeader` carries them, so the card does not promise them.
 *
 * The remove control is a sibling of the open control rather than a button inside one, and removal
 * is immediate and unconfirmed: what it deletes is a cache entry, and the copy says the reader's
 * own `.dem` is untouched.
 */
export function DemoCard({ demo, theme, onOpen, onRemove }: Props) {
  const t = useT();

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        aria-label={t('library.saved.open', { map: demo.map })}
        className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 text-left transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
      >
        <MapThumbnail map={demo.map} theme={theme} />

        <span className="flex min-w-0 flex-col gap-1 p-3">
          <span className="flex items-baseline justify-between gap-3">
            {/* A map name is game vocabulary and stays as the demo wrote it — AGENTS.md §11. */}
            <span className="truncate text-14">{demo.map}</span>
            <span className="numeric shrink-0 text-14">
              <Text path="library.saved.score" values={{ ...demo.score }} />
            </span>
          </span>

          <span className="flex flex-wrap items-baseline gap-x-2 text-12 text-ink-dim">
            <span className="numeric">
              <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
            </span>
            <MetaDot />
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

          <DemoFileName fileName={demo.fileName} />
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-surface-1/80 text-ink-dim hover:text-ink"
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
