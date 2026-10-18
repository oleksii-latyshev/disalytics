import type { Coordination, OpeningSide } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { type KeyboardEvent, useRef } from 'react';
import { BUY_NAME_KEYS } from '../helpers/round-copy';
import type { RoundEntry, RoundSideFilter, RoundSort } from '../helpers/round-tactics';
import { TeamTag } from './TeamTag';

const TEAMS: readonly OpeningSide[] = ['ct', 't'];
const SIDES: readonly RoundSideFilter[] = ['all', 'T', 'CT'];
const SORTS: readonly RoundSort[] = ['round', 'coordination'];

interface Props {
  team: OpeningSide;
  onTeam: (team: OpeningSide) => void;
  side: RoundSideFilter;
  onSide: (side: RoundSideFilter) => void;
  sort: RoundSort;
  onSort: (sort: RoundSort) => void;
  entries: readonly RoundEntry[];
  roundIndex: number | undefined;
  onRound: (roundIndex: number) => void;
}

const CHOICE =
  'h-8 rounded-chip px-2.5 text-12 transition-colors aria-pressed:bg-surface-3 aria-pressed:text-ink text-ink-dim hover:bg-hover';

function Choices<T extends string>({
  label,
  values,
  value,
  onChange,
  render,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render: (value: T) => React.ReactNode;
}) {
  return (
    <fieldset
      aria-label={label}
      className="m-0 flex min-w-0 flex-wrap gap-0.5 rounded-card border-none bg-surface-0 p-0.5"
    >
      {values.map((each) => (
        <button
          key={each}
          type="button"
          aria-pressed={each === value}
          onClick={() => onChange(each)}
          className={CHOICE}
        >
          {render(each)}
        </button>
      ))}
    </fieldset>
  );
}

function CoordinationBadge({ coordination }: { coordination: Coordination }) {
  const t = useT();
  const locale = useLocale();
  const names = coordination.signals.map((signal) =>
    t(`review.tactics.coordination.signal.${signal}`),
  );
  const signals =
    names.length === 0
      ? t('review.tactics.coordination.none')
      : new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  const tone =
    coordination.level === 'coordinated'
      ? 'text-ink'
      : coordination.level === 'partial'
        ? 'text-ink-dim'
        : 'text-ink-faint';

  return (
    <span
      title={t('review.tactics.coordination.hint', { signals })}
      className={cn('text-12', tone)}
    >
      <Text path={`review.tactics.coordination.${coordination.level}`} />
    </span>
  );
}

function RoundRow({
  entry,
  isChosen,
  onChoose,
}: {
  entry: RoundEntry;
  isChosen: boolean;
  onChoose: () => void;
}) {
  const t = useT();
  const level = t(`review.tactics.coordination.${entry.coordination.level}`);
  const result = t(entry.didWin ? 'review.tactics.row.won' : 'review.tactics.row.lost');
  const buy = entry.buy === null ? '' : t(BUY_NAME_KEYS[entry.buy]);

  return (
    <button
      type="button"
      aria-pressed={isChosen}
      aria-label={t('review.tactics.row.label', {
        round: entry.number,
        side: entry.side,
        buy,
        result,
        steps: entry.stepCount,
        level,
      })}
      data-round={entry.roundIndex}
      onClick={onChoose}
      className={cn(
        'flex w-full flex-col gap-1 rounded-card border p-2.5 text-left transition-colors',
        isChosen ? 'border-line-strong bg-surface-2' : 'border-line bg-surface-1 hover:bg-hover',
      )}
    >
      <span className="flex items-baseline gap-2">
        <span className="numeric font-semibold text-14">{entry.number}</span>
        <span className={cn('font-mono text-12', entry.side === 'CT' ? 'text-ct' : 'text-t')}>
          {entry.side}
        </span>
        {buy !== '' && <span className="text-12 text-ink-dim">{buy}</span>}
        <span className={cn('ml-auto text-12', entry.didWin ? 'text-ink' : 'text-ink-faint')}>
          {result}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-12 text-ink-dim">
        <span>
          {!entry.isPlanted ? (
            <Text path="review.tactics.row.noPlant" />
          ) : entry.site === null ? (
            <Text path="review.tactics.row.planted" />
          ) : (
            <Text path="review.tactics.row.site" values={{ site: entry.site }} />
          )}
        </span>
        <span>
          <Text path="review.tactics.row.steps" values={{ count: entry.stepCount }} />
        </span>
        <CoordinationBadge coordination={entry.coordination} />
      </span>
    </button>
  );
}

/** The left column: which team, which side, how to sort, and that team's rounds to pick from. */
export function TacticRoundPicker({
  team,
  onTeam,
  side,
  onSide,
  sort,
  onSort,
  entries,
  roundIndex,
  onRound,
}: Props) {
  const t = useT();
  const list = useRef<HTMLUListElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    const at = entries.findIndex((entry) => entry.roundIndex === roundIndex);
    const next = entries[Math.min(entries.length - 1, Math.max(0, at + step))];
    if (next === undefined) return;
    event.preventDefault();
    onRound(next.roundIndex);
    list.current?.querySelector<HTMLElement>(`[data-round="${next.roundIndex}"]`)?.focus();
  };

  return (
    <section
      aria-label={t('review.tactics.list.label')}
      className="flex min-h-0 flex-1 flex-col gap-2 p-3 lg:pl-3"
    >
      <Choices
        label={t('review.tactics.team.label')}
        values={TEAMS}
        value={team}
        onChange={onTeam}
        render={(each) => <TeamTag team={each} />}
      />
      <Choices
        label={t('review.tactics.side.label')}
        values={SIDES}
        value={side}
        onChange={onSide}
        render={(each) =>
          each === 'all' ? (
            <Text path="review.tactics.side.all" />
          ) : (
            <span className="font-mono">{each}</span>
          )
        }
      />
      <Choices
        label={t('review.tactics.sort.label')}
        values={SORTS}
        value={sort}
        onChange={onSort}
        render={(each) => <Text path={`review.tactics.sort.${each}`} />}
      />

      {entries.length === 0 ? (
        <p className="px-1 text-12 text-ink-dim">
          <Text path="review.tactics.list.empty" />
        </p>
      ) : (
        <ul
          ref={list}
          onKeyDown={handleKeyDown}
          className="m-0 flex min-h-0 list-none flex-col gap-1.5 overflow-y-auto p-0"
        >
          {entries.map((entry) => (
            <li key={entry.roundIndex}>
              <RoundRow
                entry={entry}
                isChosen={entry.roundIndex === roundIndex}
                onChoose={() => onRound(entry.roundIndex)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
