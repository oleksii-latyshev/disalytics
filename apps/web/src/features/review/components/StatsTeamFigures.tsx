import type { SideTally, Tally, TeamRoundStats } from '@disa/demo-core';
import { Text, type TranslationKey, useLocale, useT } from '@disa/i18n';
import { type ReactNode, useMemo } from 'react';

type Row = { side: 'CT' | 'T' | null; tally: Tally };

const SIDE_INK = { CT: 'text-ct', T: 'text-t' } as const;

function sum(tally: SideTally): Tally {
  return {
    rounds: tally.CT.rounds + tally.T.rounds,
    hits: tally.CT.hits + tally.T.hits,
  };
}

function bothSides(tally: SideTally): readonly Row[] {
  return [
    { side: null, tally: sum(tally) },
    { side: 'CT', tally: tally.CT },
    { side: 'T', tally: tally.T },
  ];
}

interface RateCardProps {
  titlePath: TranslationKey;
  rows: readonly Row[];
}

/** A figure with a row per side (and a total): `hits/rounds` and the share, or a dash when no round can say. */
function RateCard({ titlePath, rows }: RateCardProps) {
  const t = useT();
  const locale = useLocale();
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-card bg-surface-2 px-3 py-2">
      <h4 className="text-12 text-ink-dim leading-dense">
        <Text path={titlePath} />
      </h4>

      <div className="flex flex-col gap-1">
        {rows.map(({ side, tally }) => {
          const known = tally.rounds > 0;
          const none = t('review.stats.rounds.none');
          return (
            <p
              key={side ?? 'all'}
              className="flex items-baseline justify-between gap-2"
              title={known ? undefined : none}
            >
              <span className={`label-dense ${side === null ? 'text-ink-dim' : SIDE_INK[side]}`}>
                {side ?? t('review.stats.rounds.all')}
              </span>
              <span className="numeric text-16 text-ink">
                {known ? (
                  <>
                    {number.format(tally.hits)}/{number.format(tally.rounds)}
                    <span className="ml-2 text-12 text-ink-dim">
                      {percent.format(tally.hits / tally.rounds)}
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">{none}</span>
                  </>
                )}
              </span>
            </p>
          );
        })}
      </div>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">{children}</div>
  );
}

/** One team's conversion figures, named by the side it opened on. */
function TeamFigures({ stats }: { stats: TeamRoundStats }) {
  const side = stats.team === 'ct' ? 'CT' : 'T';

  return (
    <section
      aria-label={useT()('review.board.started', { side })}
      className="surface-card flex flex-col gap-3 rounded-float p-3"
    >
      <h3 className={`label-dense ${SIDE_INK[side]}`}>
        <Text path="review.board.started" values={{ side }} />
      </h3>

      <Grid>
        <RateCard titlePath="review.stats.rounds.fig.pistol" rows={bothSides(stats.pistol)} />
        <RateCard titlePath="review.stats.rounds.fig.eco" rows={bothSides(stats.buy.eco)} />
        <RateCard titlePath="review.stats.rounds.fig.force" rows={bothSides(stats.buy.force)} />
        <RateCard titlePath="review.stats.rounds.fig.full" rows={bothSides(stats.buy.full)} />
        <RateCard titlePath="review.stats.rounds.fig.antiEco" rows={bothSides(stats.antiEco)} />
        <RateCard
          titlePath="review.stats.rounds.fig.firstKillGot"
          rows={bothSides(stats.firstKillGot)}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.firstKillConceded"
          rows={bothSides(stats.firstKillConceded)}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.fiveVsFour"
          rows={bothSides(stats.fiveVsFour)}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.fourVsFive"
          rows={bothSides(stats.fourVsFive)}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.plants"
          rows={[{ side: 'T', tally: stats.bomb.plants }]}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.postPlant"
          rows={[{ side: 'T', tally: stats.bomb.postPlant }]}
        />
        <RateCard
          titlePath="review.stats.rounds.fig.retakes"
          rows={[{ side: 'CT', tally: stats.bomb.retakes }]}
        />
      </Grid>
    </section>
  );
}

const NOTES: readonly TranslationKey[] = [
  'review.stats.rounds.notes.split',
  'review.stats.rounds.notes.pistol',
  'review.stats.rounds.notes.buy',
  'review.stats.rounds.notes.antiEco',
  'review.stats.rounds.notes.firstKill',
  'review.stats.rounds.notes.manAdvantage',
  'review.stats.rounds.notes.bomb',
];

/** Both teams' conversion figures and how they are counted. */
export function StatsTeamFigures({ teams }: { teams: readonly TeamRoundStats[] }) {
  return (
    <>
      {teams.map((stats) => (
        <TeamFigures key={stats.team} stats={stats} />
      ))}

      <section className="flex flex-col gap-1 px-1 text-12 text-ink-dim leading-prose">
        <h3 className="label-dense">
          <Text path="review.stats.players.notes.title" />
        </h3>
        {NOTES.map((path) => (
          <p key={path}>
            <Text path={path} />
          </p>
        ))}
      </section>
    </>
  );
}
