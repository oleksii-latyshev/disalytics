import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { getMapOverview, radarAssetPath } from '@disa/map-data';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { SAMPLE_MATCHES, type SampleMatch, sampleKey } from '@/core/samples';
import { useSetting } from '@/core/settings';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoDialog } from './DemoDialog';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
  onLibrary: () => void;
}

export function HomeMatches({ onEnter, onSample, onLibrary }: Props) {
  const { demos, forget } = useSavedDemos();
  const [theme] = useSetting('radarTheme');
  const [opened, setOpened] = useState<SavedDemo | null>(null);
  const returning = demos !== null && demos.length > 0;
  const rows = returning ? demos.slice(0, 2) : [...SAMPLE_MATCHES].reverse();
  if (demos === null) return <div className="min-h-36" aria-busy="true" />;

  return (
    <section className="mt-6 w-full [border-block-start:1px_solid_var(--color-line)]">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-4">
        <h3 className="text-13 font-medium">
          <Text path={returning ? 'library.home.recent' : 'library.home.samples'} />
        </h3>
        <button type="button" onClick={onLibrary} className="text-12 text-ink-dim hover:text-ink">
          <Text path={returning ? 'library.home.all' : 'library.home.explore'} />
        </button>
      </div>
      <ul className="grid list-none gap-4 p-0 md:grid-cols-2">
        {demos !== null &&
          rows.map((row) => {
            const saved = 'key' in row ? row : null;
            const sample =
              'id' in row ? row : SAMPLE_MATCHES.find((match) => sampleKey(match.id) === row.key);
            const level = getMapOverview(row.map)?.levels[0];
            return (
              <li key={saved?.key ?? sample?.id}>
                <button
                  type="button"
                  onClick={() =>
                    saved !== null ? setOpened(saved) : sample !== undefined && onSample(sample)
                  }
                  className="flex w-full items-center gap-5 rounded-card border border-line bg-surface-1 px-4 py-3.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  {level !== undefined && (
                    <img
                      alt=""
                      src={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
                      className="size-12 shrink-0 object-contain opacity-70 grayscale"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13">
                      {sample !== undefined ? (
                        <Text
                          path="library.samples.teams"
                          values={{ home: sample.teams[0], away: sample.teams[1] }}
                        />
                      ) : (
                        saved?.fileName
                      )}
                    </span>
                    <span className="mt-2 block truncate text-11 text-ink-dim">
                      {saved !== null ? (
                        <Text path="library.home.saved" values={{ map: saved.map }} />
                      ) : (
                        `${row.map} · ${sample?.event ?? ''}`
                      )}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-ink-dim" />
                </button>
              </li>
            );
          })}
      </ul>
      <DemoDialog
        saved={opened}
        onEnter={onEnter}
        onDismiss={() => setOpened(null)}
        onGone={forget}
      />
    </section>
  );
}
