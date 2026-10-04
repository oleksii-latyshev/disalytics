import type { ParsedDemo, TeamUtilityStats } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { createMoneyFormat } from '../helpers/money';
import { bestUtilityValue, type UtilityColumn, type UtilityTable } from '../helpers/utility-table';

interface Props {
  demo: ParsedDemo;
  table: UtilityTable;
  teams: readonly [TeamUtilityStats, TeamUtilityStats];
  /** False when the recording has no flash events, which makes those figures unknown, not zero. */
  hasFlashData: boolean;
}

const SIDE_TICK = { ct: 'bg-ct', t: 'bg-t' } as const;

type Writer = (value: number | null, column: UtilityColumn) => string;

function useWriter(): Writer {
  const locale = useLocale();

  return useMemo(() => {
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const decimal1 = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const decimal2 = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const money = createMoneyFormat(locale);

    return (value, column) => {
      if (value === null) return '—';

      switch (column.format) {
        case 'integer':
          return integer.format(value);
        case 'decimal1':
          return decimal1.format(value);
        case 'decimal2':
          return decimal2.format(value);
        case 'money':
          return money.format(value);
      }
    };
  }, [locale]);
}

/**
 * One question of the Utility tab, answered for both teams at once: a row per player and a row for
 * the team under them.
 *
 * **The best figure in a column is the brighter one**, across all ten players and never the team
 * rows: ink against `ink-dim` and a step of weight, never a hue, because colour here belongs to
 * the side. A figure the recording cannot state is a dash with the reason, never a zero.
 */
export function UtilityStatsTable({ demo, table, teams, hasFlashData }: Props) {
  const t = useT();
  const write = useWriter();

  const best = useMemo(() => {
    const everyone = teams.flatMap((team) => team.players);
    return table.columns.map((column) =>
      !hasFlashData && column.needsFlashData ? null : bestUtilityValue(everyone, column),
    );
  }, [teams, table.columns, hasFlashData]);

  const nameOf = (slot: number) =>
    demo.header.players.find((entry) => entry.slot === slot)?.name ?? '';

  return (
    <section aria-labelledby={`utility-${table.id}`} className="flex min-w-0 flex-col gap-3">
      <h3 id={`utility-${table.id}`} className="font-ui font-medium text-20 leading-dense">
        <Text path={table.titlePath} />
      </h3>

      <div className="surface-card overflow-x-auto rounded-card px-4 pb-2">
        <table className="w-full border-collapse text-14">
          <thead>
            <tr className="text-12 text-ink-dim">
              <th scope="col" className="w-full min-w-[9rem] pt-4 pb-2 text-left font-normal">
                <span className="sr-only">
                  <Text path="review.board.player" />
                </span>
              </th>

              {table.columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="min-w-[5rem] px-2 pt-4 pb-2 text-right align-bottom font-normal leading-dense"
                >
                  {column.labelPath === undefined ? column.name : t(column.labelPath)}
                </th>
              ))}
            </tr>
          </thead>

          {teams.map((team) => (
            <tbody key={team.team}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={table.columns.length + 1}
                  className="[border-block-start:1px_solid_var(--color-line)] py-2 text-left font-normal"
                >
                  <span className="flex min-w-0 items-center gap-2 text-13 text-ink-dim">
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-[3px] shrink-0 rounded-full ${SIDE_TICK[team.team]}`}
                    />
                    <Text
                      path="review.board.started"
                      values={{ side: team.team === 'ct' ? 'CT' : 'T' }}
                    />
                  </span>
                </th>
              </tr>

              {team.players.map((player) => (
                <tr key={player.slot} className="[border-block-start:1px_solid_var(--color-line)]">
                  <td className="h-10 min-w-0 max-w-0 py-0">
                    <span className="block truncate px-1 text-14 text-ink">
                      {nameOf(player.slot)}
                    </span>
                  </td>

                  {table.columns.map((column, index) => (
                    <Cell
                      key={column.id}
                      column={column}
                      value={column.read(player)}
                      isBest={column.read(player) !== null && column.read(player) === best[index]}
                      isUnknown={!hasFlashData && column.needsFlashData === true}
                      write={write}
                    />
                  ))}
                </tr>
              ))}

              <tr className="[border-block-start:1px_solid_var(--color-line)]">
                <td className="h-10 px-1 text-13 text-ink-dim">
                  <Text path="review.stats.utility.team" />
                </td>

                {table.columns.map((column) => (
                  <Cell
                    key={column.id}
                    column={column}
                    value={column.read(team.total)}
                    isBest={false}
                    isUnknown={!hasFlashData && column.needsFlashData === true}
                    write={write}
                  />
                ))}
              </tr>
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

interface CellProps {
  column: UtilityColumn;
  value: number | null;
  isBest: boolean;
  isUnknown: boolean;
  write: Writer;
}

function Cell({ column, value, isBest, isUnknown, write }: CellProps) {
  const t = useT();

  return (
    <td
      className={`numeric whitespace-nowrap px-2 text-right text-14 ${
        isBest ? 'font-medium text-ink' : 'text-ink-dim'
      }`}
    >
      {isUnknown ? (
        <span title={t('review.stats.unknown')}>
          <span aria-hidden="true">—</span>
          <span className="sr-only">{t('review.stats.unknown')}</span>
        </span>
      ) : (
        write(value, column)
      )}
    </td>
  );
}
