import { Text, useT } from '@disa/i18n';
import { ArrowRight } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { useSetting } from '@/core/settings';
import { yourStats } from '../../helpers/home-stats';
import { parseSteamId } from '../../helpers/steam-id';
import type { WidgetProps } from './types';

type Miss = 'format' | 'vanity' | 'absent' | null;

const NOTE_PATH = {
  format: 'library.home.widget.stats.noteFormat',
  vanity: 'library.home.widget.stats.noteVanity',
  absent: 'library.home.widget.stats.noteAbsent',
  none: 'library.home.widget.stats.noteHint',
} as const;

function Figure({ value, label }: { value: string; label: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="numeric font-mono text-20 leading-dense">{value}</span>
      <span className="text-11 text-ink-dim leading-dense">{label}</span>
    </div>
  );
}

export function StatsWidget({ data, actions }: WidgetProps) {
  const t = useT();
  const inputId = useId();
  const [steamId, setSteamId] = useSetting('homeSteamId');
  const [draft, setDraft] = useState(steamId);
  const [miss, setMiss] = useState<Miss>(null);
  const { last, lastDemo } = data;
  const stats = useMemo(
    () => (lastDemo === null || steamId === '' ? null : yourStats(lastDemo, steamId)),
    [lastDemo, steamId],
  );
  const isReading = steamId !== '' && lastDemo === null;
  const absent = steamId !== '' && lastDemo !== null && stats === null;

  const forget = () => {
    setSteamId('');
    setDraft('');
    setMiss(null);
  };

  if (stats !== null && last !== null) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-between gap-3 p-4 md:px-5 md:py-[18px]">
        <div className="flex items-center justify-between gap-2">
          <p className="label-dense text-ink-dim">
            <Text path="library.home.widget.stats.eyebrowKnown" />
          </p>
          <button
            type="button"
            onClick={forget}
            className="text-12 text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Text path="library.home.widget.stats.notYou" />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`h-5 w-1 shrink-0 rounded-full ${stats.openedAs === 'ct' ? 'bg-ct' : 'bg-t'}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-16 font-semibold leading-dense">{stats.name}</span>
            <span className="block truncate text-11 text-ink-dim">
              <Text
                path="library.home.widget.stats.team"
                values={{ side: stats.openedAs === 'ct' ? 'CT' : 'T' }}
              />
            </span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Figure
            value={`${stats.kills}–${stats.deaths}`}
            label={<Text path="library.home.widget.stats.kd" />}
          />
          <Figure value={String(stats.adr)} label={<Text path="library.home.widget.stats.adr" />} />
          <Figure
            value={`#${stats.rank}`}
            label={<Text path="library.home.widget.stats.rank" values={{ count: stats.players }} />}
          />
        </div>
        <button
          type="button"
          onClick={() => actions.onEnter(last, 0)}
          className="inline-flex w-fit items-center gap-1.5 text-13 font-medium hover:text-ink-dim focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Text path="library.home.widget.stats.open" />
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  const note: Miss = miss ?? (absent ? 'absent' : null);

  return (
    <form
      className="flex h-full min-h-0 flex-col justify-center gap-2 p-4 md:px-5 md:py-[18px]"
      aria-busy={isReading}
      onSubmit={(event) => {
        event.preventDefault();
        const entry = parseSteamId(draft);
        if (entry.kind !== 'ok') {
          setMiss(entry.kind);
          return;
        }
        setMiss(null);
        setSteamId(entry.steamId);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="label-dense text-ink-dim">
          <Text path="library.home.widget.stats.eyebrow" />
        </p>
        {absent && (
          <button
            type="button"
            onClick={forget}
            className="text-12 text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Text path="library.home.widget.stats.notYou" />
          </button>
        )}
      </div>
      <p className="text-14 font-semibold leading-snug">
        <Text path="library.home.widget.stats.prompt" />
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          <Text path="library.home.widget.stats.label" />
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          placeholder="7656119…"
          onChange={(event) => {
            setDraft(event.target.value);
            setMiss(null);
          }}
          className="numeric h-8 min-w-0 flex-1 basis-32 rounded-chip border border-line-strong bg-surface-0 px-2.5 font-mono text-12 text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-focus"
        />
        <button
          type="submit"
          className="h-8 shrink-0 rounded-chip bg-ink px-3 text-12 font-medium text-surface-0 hover:bg-ink-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('library.home.widget.stats.find')}
        </button>
      </div>
      <p
        role={note === null ? undefined : 'status'}
        className={`text-11 leading-prose ${note === null ? 'text-ink-faint' : 'text-ink'}`}
      >
        <Text path={NOTE_PATH[note ?? 'none']} />
      </p>
    </form>
  );
}
