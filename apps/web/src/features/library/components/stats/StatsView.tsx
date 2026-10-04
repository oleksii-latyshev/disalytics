import type { SavedDemo } from '@disa/demo-store';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Link } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { useSetting } from '@/core/settings';
import { parseSteamId } from '../../helpers/steam-id';
import { usePlayerMatches } from '../../hooks/use-player-matches';
import { useSavedDemos } from '../../hooks/use-saved-demos';
import { StatsProfile } from './StatsProfile';

type Miss = 'format' | 'vanity' | null;

const NOTE_PATH = {
  format: 'library.stats.noteFormat',
  vanity: 'library.stats.noteVanity',
  none: 'library.stats.hint',
} as const;

const PANEL =
  'flex min-h-56 flex-col justify-center rounded-float border border-line bg-surface-1 px-6 py-10 sm:px-10';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
}

function Message({ titlePath, children }: { titlePath: TranslationKey; children: ReactNode }) {
  return (
    <div className={PANEL} role="status">
      <ChartColumn aria-hidden="true" className="mb-4 size-6 text-ink-faint" strokeWidth={1.8} />
      <p className="text-20 font-medium leading-dense">
        <Text path={titlePath} />
      </p>
      <div className="mt-3 max-w-[52ch] text-13 text-ink-dim leading-prose">{children}</div>
    </div>
  );
}

export function StatsView({ onEnter }: Props) {
  const t = useT();
  const inputId = useId();
  const { demos } = useSavedDemos();
  const [saved, setSaved] = useSetting('homeSteamId');
  const [draft, setDraft] = useState(saved);
  const [miss, setMiss] = useState<Miss>(null);
  // The id being looked for. It starts as the identity Home already keeps, so a reader who told
  // Home who they are lands on their own numbers.
  const [query, setQuery] = useState<string | null>(() => {
    const entry = parseSteamId(saved);
    return entry.kind === 'ok' ? entry.steamId : null;
  });
  const result = usePlayerMatches(demos, query);
  const isEmpty = demos !== null && demos.length === 0;

  return (
    <section className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 pb-10 md:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="mb-3 text-11 tracking-[0.16em] text-ink-dim uppercase">
            <Text path="library.stats.eyebrow" />
          </p>
          <h2 className="font-ui text-[clamp(32px,5vw,60px)] font-medium leading-[1.05] tracking-[-0.055em]">
            <Text path="library.shell.stats" />
            <span className="text-ink-dim">.</span>
          </h2>
        </div>

        {!isEmpty && (
          <form
            className="flex min-w-0 flex-[0_1_32.5rem] flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              const entry = parseSteamId(draft);
              if (entry.kind !== 'ok') {
                setMiss(entry.kind);
                return;
              }
              setMiss(null);
              setQuery(entry.steamId);
            }}
          >
            <div className="flex gap-2">
              <label htmlFor={inputId} className="sr-only">
                <Text path="library.stats.label" />
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={draft}
                placeholder="7656119…"
                aria-invalid={miss !== null}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setMiss(null);
                }}
                className="numeric h-control-lg min-w-0 flex-1 rounded-chip border border-line-strong bg-surface-0 px-3 font-mono text-13 text-ink placeholder:text-ink-faint aria-invalid:border-destructive focus-visible:outline-2 focus-visible:outline-focus"
              />
              <Button type="submit" size="lg">
                {t('library.stats.find')}
              </Button>
            </div>
            <p
              role={miss === null ? undefined : 'alert'}
              className={`text-12 leading-prose ${miss === null ? 'text-ink-faint' : 'text-ink'}`}
            >
              <Text path={NOTE_PATH[miss ?? 'none']} />
            </p>
          </form>
        )}
      </header>

      {demos === null && <div className="min-h-72" aria-busy="true" />}

      {isEmpty && (
        <Message titlePath="library.stats.empty.title">
          <p>
            <Text path="library.stats.empty.body" />
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex h-control items-center rounded-chip bg-primary px-3 text-13 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Text path="library.stats.empty.open" />
          </Link>
        </Message>
      )}

      {demos !== null && !isEmpty && query === null && (
        <Message titlePath="library.stats.start.title">
          <p>
            <Text path="library.stats.start.body" />
          </p>
        </Message>
      )}

      {result.status === 'reading' && (
        <div className={PANEL} role="status" aria-busy="true">
          <p className="text-20 font-medium leading-dense">
            <Text path="library.stats.loading.title" />
          </p>
          <p className="numeric mt-3 font-mono text-13 text-ink-dim">
            <Text
              path="library.stats.loading.progress"
              values={{ done: result.done, total: result.total }}
            />
          </p>
          <div
            className="mt-4 h-1.5 max-w-80 overflow-hidden rounded-full bg-surface-2"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${result.total === 0 ? 0 : (result.done / result.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {result.status === 'done' && query !== null && result.matches.length === 0 && (
        <Message titlePath="library.stats.absent.title">
          <p>
            <Text path="library.stats.absent.body" values={{ id: query, count: result.total }} />
          </p>
        </Message>
      )}

      {result.status === 'done' &&
        query !== null &&
        demos !== null &&
        result.matches.length > 0 && (
          <StatsProfile
            key={query}
            steamId={query}
            matches={result.matches}
            demos={demos}
            isYou={query === saved}
            onThisIsMe={() => setSaved(query)}
            onEnter={onEnter}
          />
        )}

      {demos !== null && !isEmpty && (
        <p className="text-13 text-ink-faint leading-prose">
          <Text path="library.stats.footnote" />
        </p>
      )}
    </section>
  );
}
