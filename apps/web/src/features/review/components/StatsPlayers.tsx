import {
  type Frame,
  hasBlindEvents,
  matchPlayerStats,
  type OpeningSide,
  type ParsedDemo,
  type PlayerSlot,
  roundOpeningFrame,
  TRADE_WINDOW_SECONDS,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  DURATION_MICRO_SECONDS,
  EASE_OUT,
} from '@disa/ui';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PLAYER_COLUMN_SETS, type PlayerColumnSetId } from '../helpers/player-table';
import { createStatWriter } from '../helpers/stat-writer';
import { BestInMatch } from './BestInMatch';
import type { PlayerViewLink } from './PlayerDetail';
import { PlayerStatsTable } from './PlayerStatsTable';

/* The panel fades in and closes at once, for the reason `SettingGroup` states: the primitive's height
   tween would lay out everything beneath it on every frame. */
const PANEL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
  transition: { duration: DURATION_MICRO_SECONDS, ease: EASE_OUT },
} as const;

interface Props {
  demo: ParsedDemo;
  onOpenOnStage: (frame: Frame) => void;
  onPlayerView: PlayerViewLink;
}

/**
 * The players of the match in one table: both teams, one set of columns at a time, and beside it
 * who led each figure.
 *
 * **At most one row stands open**, from the table or from a best-in-match card. The set the reader
 * picked stays while they open rows, and a card opens the row in the main set, where the row's own
 * figures are.
 */
export function StatsPlayers({ demo, onOpenOnStage, onPlayerView }: Props) {
  const t = useT();
  const locale = useLocale();
  const [setId, setSetId] = useState<PlayerColumnSetId>('main');
  const [opened, setOpened] = useState<PlayerSlot | null>(null);

  // Derived once per match: this walks every round, kill, hit and blind, and nothing here is on a
  // readout, so a press on a set or a row must not repeat it.
  const teams = useMemo(() => matchPlayerStats(demo), [demo]);
  const hasFlashData = useMemo(() => hasBlindEvents(demo), [demo]);
  const write = useMemo(() => createStatWriter(locale), [locale]);
  const players = useMemo(() => teams.flatMap((team) => team.players), [teams]);
  const teamOf = useMemo(
    () =>
      new Map<PlayerSlot, OpeningSide>(
        teams.flatMap((team) => team.players.map((player) => [player.slot, team.team] as const)),
      ),
    [teams],
  );
  const set =
    PLAYER_COLUMN_SETS.find((candidate) => candidate.id === setId) ?? PLAYER_COLUMN_SETS[0];
  const [first, second] = teams;

  if (set === undefined || first === undefined || second === undefined) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 wide:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] wide:items-start">
        <section
          aria-label={t('review.stats.players.title')}
          className="surface-card min-w-0 overflow-hidden rounded-float"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3">
            <fieldset className="m-0 flex min-w-0 flex-wrap gap-0.5 rounded-card border-0 bg-surface-2 p-0.5">
              <legend className="sr-only">
                <Text path="review.stats.players.setsLabel" />
              </legend>
              {PLAYER_COLUMN_SETS.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={candidate.id === setId}
                  onClick={() => setSetId(candidate.id)}
                  className={`h-8 cursor-pointer rounded-chip px-3 text-13 transition-colors duration-(--duration-micro) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    candidate.id === setId
                      ? 'bg-surface-3 font-medium text-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  <Text path={candidate.labelPath} />
                </button>
              ))}
            </fieldset>

            <span className="text-12 text-ink-faint">
              <Text path={set.notePath} />
            </span>
          </div>

          <PlayerStatsTable
            demo={demo}
            set={set}
            teams={[first, second]}
            hasFlashData={hasFlashData}
            write={write}
            opened={opened}
            onOpen={setOpened}
            onWatchRound={(roundIndex) => onOpenOnStage(roundOpeningFrame(demo, roundIndex))}
            onPlayerView={onPlayerView}
          />
        </section>

        <BestInMatch
          demo={demo}
          players={players}
          teamOf={teamOf}
          write={write}
          opened={opened}
          hasFlashData={hasFlashData}
          onOpen={(slot) => {
            setSetId('main');
            setOpened(slot);
          }}
        />
      </div>

      {!hasFlashData && (
        <p className="text-13 text-ink-dim">
          <Text path="review.stats.noFlashEvents" />
        </p>
      )}

      <Accordion className="flex flex-col">
        <AccordionItem value="notes" className="[border-block-start:1px_solid_var(--color-line)]">
          <AccordionHeader>
            <AccordionTrigger className="flex h-control-lg w-full cursor-pointer items-center justify-between gap-4 rounded-chip text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink data-[panel-open]:text-ink data-[panel-open]:[&>svg]:rotate-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              <span className="text-14">
                <Text path="review.stats.players.notes.title" />
              </span>

              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform duration-(--duration-micro) ease-out"
              />
            </AccordionTrigger>
          </AccordionHeader>

          <AccordionPanel {...PANEL_MOTION}>
            <div className="flex max-w-prose flex-col gap-2 pt-1 pb-4 text-13 text-ink-dim leading-prose">
              <p>
                <Text path="review.stats.players.notes.kast" />
              </p>
              <p>
                <Text path="review.stats.players.notes.opening" />
              </p>
              <p>
                <Text
                  path="review.stats.players.notes.trade"
                  values={{ seconds: TRADE_WINDOW_SECONDS }}
                />
              </p>
              <p>
                <Text path="review.stats.players.notes.multi" />
              </p>
              <p>
                <Text path="review.stats.players.notes.flash" />
              </p>
              <p>
                <Text path="review.stats.players.notes.rating" />
              </p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
