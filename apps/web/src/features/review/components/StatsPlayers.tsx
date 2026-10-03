import {
  hasBlindEvents,
  matchPlayerStats,
  type ParsedDemo,
  type PlayerSlot,
  TRADE_WINDOW_SECONDS,
} from '@disa/demo-core';
import { Text } from '@disa/i18n';
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
import {
  nextPlayerSort,
  PLAYER_TABLES,
  type PlayerSort,
  type PlayerTableId,
} from '../helpers/player-table';
import { PlayerStatsTable } from './PlayerStatsTable';

/* The panel fades in and closes at once, for the reason `SettingGroup` states: the primitive's height
   tween would lay out everything beneath it on every frame. */
const PANEL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
  transition: { duration: DURATION_MICRO_SECONDS, ease: EASE_OUT },
} as const;

const [OVERVIEW, ...SMALLER] = PLAYER_TABLES;

/**
 * The Players tab: one table per question, each with both teams named by the side they opened on.
 *
 * **At most one row stands open**, and only in the overview. Two round-by-round strips is two
 * readings of the same shape in one view, and the question the strip answers — "which rounds was
 * this player in" — is asked of one player at a time.
 *
 * **Each table keeps its own sort**: ordering the opening duels by success says nothing about how
 * the reader wants the kills ordered.
 */
export function StatsPlayers({ demo }: { demo: ParsedDemo }) {
  const [opened, setOpened] = useState<PlayerSlot | null>(null);
  const [sorts, setSorts] = useState<Partial<Record<PlayerTableId, PlayerSort | null>>>({});

  // Derived once per match: this walks every round, kill, hit and blind, and nothing here is on a
  // readout, so a press on a header or a row must not repeat it.
  const teams = useMemo(() => matchPlayerStats(demo), [demo]);
  const hasFlashData = useMemo(() => hasBlindEvents(demo), [demo]);

  if (OVERVIEW === undefined) return null;

  return (
    <div className="flex flex-col gap-8">
      <PlayerStatsTable
        demo={demo}
        table={OVERVIEW}
        teams={teams}
        hasFlashData={hasFlashData}
        sort={sorts[OVERVIEW.id] ?? null}
        onSort={(column) =>
          setSorts((current) => ({
            ...current,
            [OVERVIEW.id]: nextPlayerSort(current[OVERVIEW.id] ?? null, column),
          }))
        }
        expandable={{ opened, onOpen: setOpened }}
      />

      <div className="grid gap-8 min-[1280px]:grid-cols-2 min-[1280px]:items-start">
        {SMALLER.map((table) => (
          <PlayerStatsTable
            key={table.id}
            demo={demo}
            table={table}
            teams={teams}
            hasFlashData={hasFlashData}
            sort={sorts[table.id] ?? null}
            onSort={(column) =>
              setSorts((current) => ({
                ...current,
                [table.id]: nextPlayerSort(current[table.id] ?? null, column),
              }))
            }
          />
        ))}
      </div>

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
                <Text path="review.stats.players.sortHint" />
              </p>
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

      {!hasFlashData && (
        <p className="text-13 text-ink-dim">
          <Text path="review.stats.noFlashEvents" />
        </p>
      )}
    </div>
  );
}
