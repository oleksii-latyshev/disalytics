import type { ParsedDemo, PlayerSlot, PlayerTotals, TeamScoreboard } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { ScoreboardRounds } from './ScoreboardRounds';

interface Props {
  demo: ParsedDemo;
  team: TeamScoreboard;
  /** The row standing open, which is at most one across both teams. */
  opened: PlayerSlot | null;
  onOpen: (slot: PlayerSlot | null) => void;
}

interface Column {
  readonly namePath: TranslationKey;
  readonly abbrPath: TranslationKey;
  readonly read: (player: PlayerTotals) => number;
}

/**
 * What a row states, in the order a scoreboard has always stated it. Each column carries its own
 * full name as well as the abbreviation on screen: `К` and `A` are what fits over five rows of
 * figures, and neither says what it counts to somebody meeting the screen for the first time.
 */
const COLUMNS: readonly Column[] = [
  { namePath: 'review.player.kills', abbrPath: 'review.player.abbr.kills', read: (p) => p.kills },
  {
    namePath: 'review.board.assists',
    abbrPath: 'review.board.abbr.assists',
    read: (p) => p.assists,
  },
  {
    namePath: 'review.player.deaths',
    abbrPath: 'review.player.abbr.deaths',
    read: (p) => p.deaths,
  },
  {
    namePath: 'review.board.diff',
    abbrPath: 'review.board.abbr.diff',
    read: (p) => p.kills - p.deaths,
  },
  { namePath: 'review.board.adr', abbrPath: 'review.board.abbr.adr', read: adrOf },
  {
    namePath: 'review.board.headshots',
    abbrPath: 'review.board.abbr.headshots',
    read: headshotShareOf,
  },
];

/**
 * Damage per round, over the rounds this slot actually played rather than over the match's own
 * count — a player who joined at halftime has a real average over their own half, and dividing it
 * by the whole match would state a worse player than the one on screen.
 */
function adrOf(player: PlayerTotals): number {
  return player.rounds === 0 ? 0 : Math.round(player.damage / player.rounds);
}

function headshotShareOf(player: PlayerTotals): number {
  return player.kills === 0 ? 0 : Math.round((player.headshots / player.kills) * 100);
}

const SIDE_INK = { ct: 'text-ct', t: 'text-t' } as const;

/** `+3` reads as a gain where `3` reads as a count, and the minus is the character's own. */
function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function ScoreboardTeam({ demo, team, opened, onOpen }: Props) {
  const t = useT();
  const side = team.team === 'ct' ? 'CT' : 'T';

  return (
    <section
      aria-label={t('review.board.started', { side })}
      className="surface-card flex min-w-0 flex-col gap-2 rounded-float p-3"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className={`label-dense ${SIDE_INK[team.team]}`}>
          <Text path="review.board.started" values={{ side }} />
        </h2>

        <p className="numeric text-16 text-ink">{team.score}</p>
      </header>

      <table className="w-full border-collapse text-13">
        <thead>
          <tr className="text-ink-dim">
            <th scope="col" className="w-full pb-1 text-left font-normal">
              <span className="sr-only">
                <Text path="review.board.player" />
              </span>
            </th>

            {COLUMNS.map((column) => (
              <th
                key={column.abbrPath}
                scope="col"
                className="label-dense whitespace-nowrap px-1.5 pb-1 text-right font-normal"
              >
                <span aria-hidden>
                  <Text path={column.abbrPath} />
                </span>
                <span className="sr-only">
                  <Text path={column.namePath} />
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {team.players.map((player) => (
            <Row
              key={player.slot}
              demo={demo}
              player={player}
              name={demo.header.players.find((entry) => entry.slot === player.slot)?.name ?? ''}
              isOpen={opened === player.slot}
              onOpen={onOpen}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface RowProps {
  demo: ParsedDemo;
  player: PlayerTotals;
  name: string;
  isOpen: boolean;
  onOpen: (slot: PlayerSlot | null) => void;
}

function Row({ demo, player, name, isOpen, onOpen }: RowProps) {
  return (
    <>
      <tr className={isOpen ? 'bg-selected' : undefined}>
        <td className="min-w-0 py-0.5">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => onOpen(isOpen ? null : player.slot)}
            className="flex w-full min-w-0 cursor-pointer rounded-chip px-1 py-0.5 text-left text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="min-w-0 truncate">{name}</span>
          </button>
        </td>

        {COLUMNS.map((column) => (
          <td key={column.abbrPath} className="numeric px-1.5 py-0.5 text-right text-ink">
            {column.namePath === 'review.board.diff'
              ? signed(column.read(player))
              : column.read(player)}
          </td>
        ))}
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={COLUMNS.length + 1} className="pt-1 pb-2">
            <ScoreboardRounds demo={demo} slot={player.slot} />
          </td>
        </tr>
      )}
    </>
  );
}
