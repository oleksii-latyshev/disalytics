import type { MatchResult, PlayerSummary } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import type { TranslationKey } from '@disa/i18n';
import { Text, useLocale, useT } from '@disa/i18n';
import { useMemo } from 'react';
import type { ProfileMatch, ProfileMoment } from '../../helpers/player-profile';

const RESULT: Record<MatchResult, { mark: TranslationKey; word: TranslationKey; chip: string }> = {
  win: {
    mark: 'library.stats.matches.winMark',
    word: 'library.stats.matches.win',
    chip: 'bg-ink text-surface-0',
  },
  loss: {
    mark: 'library.stats.matches.lossMark',
    word: 'library.stats.matches.loss',
    chip: 'bg-surface-3 text-ink-dim',
  },
  draw: {
    mark: 'library.stats.matches.drawMark',
    word: 'library.stats.matches.draw',
    chip: 'border border-line-strong text-ink-dim',
  },
};

const HEADING = 'label-dense text-ink-dim';
const COLUMN = 'numeric text-right font-mono text-14';

interface Props {
  matches: readonly ProfileMatch[];
  moments: readonly ProfileMoment[];
  summary: PlayerSummary;
  demos: readonly SavedDemo[];
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
}

function MatchRow({ match, onEnter }: { match: ProfileMatch; onEnter: Props['onEnter'] }) {
  const t = useT();
  const locale = useLocale();
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );
  const { line, demo } = match;
  const adr = line.rounds === 0 ? 0 : Math.round(line.damage / line.rounds);
  const kast = percent.format(line.rounds === 0 ? 0 : line.kastRounds / line.rounds);
  const hs = percent.format(line.kills === 0 ? 0 : line.headshots / line.kills);
  const kd = `${line.kills}–${line.deaths}`;
  const result = RESULT[line.result];

  return (
    <li className="[border-block-start:1px_solid_var(--color-line)]">
      <button
        type="button"
        onClick={() => onEnter(demo, 0)}
        className="flex w-full min-w-0 items-center gap-3 py-2.5 text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus md:gap-3.5 md:py-3"
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-chip font-mono text-12 font-semibold ${result.chip}`}
        >
          <span aria-hidden="true">
            <Text path={result.mark} />
          </span>
          <span className="sr-only">
            <Text path={result.word} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="numeric truncate text-14 font-medium leading-dense md:text-16">
            {line.ownScore} : {line.opponentScore}
            <span className="font-mono text-12 font-normal text-ink-dim"> · {line.map}</span>
          </span>
          <span className="truncate font-mono text-11 text-ink-faint md:hidden">
            {t('library.stats.matches.phone', { kd, adr, kast })}
          </span>
          <span className="hidden truncate font-mono text-12 text-ink-faint md:block">
            {demo.fileName} · {t('library.stats.matches.meta', { rounds: line.rounds })}
          </span>
        </span>
        <span className={`${COLUMN} hidden w-14 md:block`}>{kd}</span>
        <span className={`${COLUMN} hidden w-10 text-ink-dim md:block`}>{adr}</span>
        <span className={`${COLUMN} hidden w-12 text-ink-dim md:block`}>{kast}</span>
        <span className={`${COLUMN} hidden w-12 text-ink-dim md:block`}>{hs}</span>
      </button>
    </li>
  );
}

function MomentChip({
  moment,
  demo,
  onEnter,
}: {
  moment: ProfileMoment;
  demo: SavedDemo;
  onEnter: Props['onEnter'];
}) {
  const t = useT();
  const path =
    moment.kind === 'clutch' ? 'library.stats.moments.clutch' : 'library.stats.moments.multi';

  return (
    <li>
      <button
        type="button"
        onClick={() => onEnter(demo, moment.roundIndex)}
        className="flex h-9 items-center gap-2 rounded-chip border border-line bg-surface-2 px-3 font-mono text-13 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${moment.kind === 'clutch' ? 'bg-ct' : 'bg-t'}`}
        />
        {t(path, { map: moment.map, round: moment.roundIndex + 1, count: moment.count })}
      </button>
    </li>
  );
}

/** `2k × 9 · 3k × 2` — game vocabulary, so it is built here and not in a locale file. */
function multiKillTotals(summary: PlayerSummary): string {
  return summary.multiKillRounds
    .map((count, index) => (count === 0 ? null : `${index + 2}k × ${count}`))
    .filter((part) => part !== null)
    .join(' · ');
}

export function StatsMatches({ matches, moments, summary, demos, onEnter }: Props) {
  const totals = multiKillTotals(summary);
  const demoByKey = useMemo(() => new Map(demos.map((demo) => [demo.key, demo])), [demos]);
  const chips = moments.flatMap((moment) => {
    const demo = demoByKey.get(moment.demoKey);
    return demo === undefined ? [] : [{ moment, demo }];
  });

  return (
    <section className="flex min-w-0 flex-col gap-2.5 rounded-float border border-line bg-surface-1 px-4 py-4 md:px-5 md:py-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={HEADING}>
          <Text path="library.stats.matches.title" />
        </h3>
        <span className="hidden font-mono text-11 text-ink-faint md:block">
          <Text path="library.stats.matches.columns" />
        </span>
      </div>

      <ul className="list-none p-0">
        {matches.map((match) => (
          <MatchRow key={match.demo.key} match={match} onEnter={onEnter} />
        ))}
      </ul>

      <div className="mt-2 flex flex-col gap-2.5">
        <h3 className={HEADING}>
          <Text path="library.stats.moments.title" />
        </h3>
        {chips.length === 0 && totals === '' ? (
          <p className="text-13 text-ink-dim">
            <Text path="library.stats.moments.empty" />
          </p>
        ) : (
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {chips.map(({ moment, demo }) => (
              <MomentChip
                key={`${moment.demoKey}:${moment.roundIndex}`}
                moment={moment}
                demo={demo}
                onEnter={onEnter}
              />
            ))}
            {totals !== '' && (
              <li className="flex h-9 items-center rounded-chip border border-dashed border-line-strong px-3 font-mono text-13 text-ink-dim">
                {totals}
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
