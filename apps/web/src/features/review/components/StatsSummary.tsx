import {
  type Frame,
  type MatchScore,
  type MatchSummary,
  matchSummary,
  type OpeningSide,
  type ParsedDemo,
  roundOpeningFrame,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { Play } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { BUY_NAME_KEYS, REASON_KEYS } from '../helpers/round-copy';
import { RoundHistory } from './RoundHistory';
import { TeamTag } from './TeamTag';

interface Props {
  demo: ParsedDemo;
  /** The round the line under the history opens on. */
  initialRound: number;
  onOpenOnStage: (frame: Frame) => void;
}

const TEAMS: readonly OpeningSide[] = ['ct', 't'];

const scoreOf = (score: MatchScore, team: OpeningSide): number =>
  team === 'ct' ? score.startedCt : score.startedT;

function Halves({ halves, team }: { halves: MatchSummary['halves']; team: OpeningSide }) {
  const values = {
    first: scoreOf(halves.first, team),
    second: scoreOf(halves.second, team),
  };

  return halves.overtime === null ? (
    <Text path="review.stats.summary.halves" values={values} />
  ) : (
    <Text
      path="review.stats.summary.halvesOvertime"
      values={{ ...values, overtime: scoreOf(halves.overtime, team) }}
    />
  );
}

interface Segment {
  readonly id: string;
  readonly node: ReactNode;
}

function Segments({ items }: { items: readonly Segment[] }) {
  return items.map(({ id, node }, index) => (
    <span key={id}>
      {index > 0 && <span className="px-1.5 text-ink-faint">·</span>}
      {node}
    </span>
  ));
}

/**
 * Who won and how the match went: both teams with their score and the score of each half, the
 * round history, and a line under it for the round the reader is on.
 *
 * Teams are named by the side they started on — the demo gives no other name — and the winner is
 * the one drawn in full ink. Derived once per match.
 */
export function StatsSummary({ demo, initialRound, onOpenOnStage }: Props) {
  const t = useT();
  const locale = useLocale();
  const summary = useMemo(() => matchSummary(demo), [demo]);
  const [selected, setSelected] = useState(initialRound);
  const names = useMemo(() => new Map(demo.header.players.map((p) => [p.slot, p.name])), [demo]);
  const winner: OpeningSide | null =
    summary.score.startedCt === summary.score.startedT
      ? null
      : summary.score.startedCt > summary.score.startedT
        ? 'ct'
        : 't';
  const round = summary.rounds[selected] ?? summary.rounds[0];
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  if (round === undefined) return null;

  const segments: Segment[] = [
    { id: 'round', node: t('review.stats.line.round', { round: round.number }) },
  ];
  if (round.winner !== null && round.winnerSide !== null) {
    segments.push({
      id: 'won',
      node: t('review.stats.line.won', {
        start: round.winner === 'ct' ? 'CT' : 'T',
        side: round.winnerSide,
      }),
    });
  }
  segments.push({ id: 'reason', node: t(REASON_KEYS[round.reason]) });
  if (round.buys.ct !== null && round.buys.t !== null) {
    segments.push({
      id: 'buys',
      node: t('review.stats.line.buys', {
        first: t(BUY_NAME_KEYS[round.buys.ct]),
        second: t(BUY_NAME_KEYS[round.buys.t]),
      }),
    });
  }
  if (round.topKiller !== null) {
    segments.push({
      id: 'topKiller',
      node: t('review.stats.line.topKiller', {
        name: names.get(round.topKiller.slot) ?? '',
        kills: round.topKiller.kills,
      }),
    });
  }

  return (
    <section
      aria-label={t('review.stats.summary.title')}
      className="surface-card flex flex-col gap-5 rounded-float p-4 wide:p-5"
    >
      <div className="grid gap-5 wide:grid-cols-[auto_minmax(0,1fr)] wide:gap-8">
        <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-3 wide:min-w-60 wide:grid-cols-1">
          {TEAMS.map((team) => {
            const isWinner = winner === team;

            return (
              <div key={team} className="flex items-baseline justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-16 ${
                      isWinner ? 'font-medium text-ink' : 'text-ink-dim'
                    }`}
                  >
                    <TeamTag team={team} />
                    {isWinner && (
                      <span className="label-dense rounded-chip bg-selected px-1.5 py-0.5 text-ink">
                        <Text path="review.stats.summary.winner" />
                      </span>
                    )}
                  </span>
                  <span className="numeric text-12 text-ink-dim">
                    <Halves halves={summary.halves} team={team} />
                  </span>
                </div>
                <span
                  className={`numeric text-44 leading-none ${isWinner ? 'text-ink' : 'text-ink-faint'}`}
                >
                  {number.format(scoreOf(summary.score, team))}
                </span>
              </div>
            );
          })}
        </div>

        <RoundHistory rounds={summary.rounds} selected={round.roundIndex} onSelect={setSelected} />
      </div>

      <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2 [border-block-start:1px_solid_var(--color-line)] pt-3">
        <p className="m-0 text-13 text-ink-dim">
          <Segments items={segments} />
        </p>
        <button
          type="button"
          onClick={() => onOpenOnStage(roundOpeningFrame(demo, round.roundIndex))}
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-chip px-2 py-1 text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Play aria-hidden="true" className="size-3 fill-current" />
          <Text path="review.stats.line.watch" values={{ round: round.number }} />
        </button>
      </div>
    </section>
  );
}
