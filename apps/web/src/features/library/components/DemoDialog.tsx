import {
  type ParsedDemo,
  type PlayerInfo,
  playersOnSide,
  roundOpeningFrame,
  sidesBySlotAtRound,
  TEAMS,
  type Team,
} from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { readSavedDemo } from '@/core/parsing';
// `features/radar` is a leaf — it imports no other feature — so this is the downward direction
// `CODE_REQUIREMENTS.md` §2 draws and not a sideways one. The plate is the whole point of the
// dialog, and a copy of it here would be a second renderer free to drift from the plate's own.
import { PlateStill } from '@/features/radar';
import { DemoFileName } from './DemoFileName';

/** The round the plate stands on. The first, out of its buy. */
const SHOWN_ROUND_INDEX = 0;

interface Props {
  /** The demo the dialog is showing, or `null` for closed. */
  saved: SavedDemo | null;
  /** Enters the match at a round, which is the shortest route from "which demo was that" to it. */
  onEnter: (saved: SavedDemo, roundIndex: number) => void;
  onDismiss: () => void;
  /** The entry has gone since the card was drawn. The card goes with it. */
  onGone: (key: string) => void;
}

function SideRoster({ side, players }: { side: Team; players: readonly PlayerInfo[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      {/* A side's name is game vocabulary — never translated, AGENTS.md §11. */}
      <h3 className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</h3>

      <ul className="flex list-none flex-col gap-0.5 p-0">
        {players.map((player) => (
          <li key={player.slot} className="truncate text-13">
            {player.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * What a saved demo looked like. **The plate is rendered from the cached parse rather than stored as
 * an image**: the parse is already there and `features/radar` already draws it, so this shows where
 * the players were instead of a screenshot of where they once were. A stored thumbnail would be a
 * second copy of a truth the cache holds, would need invalidating when the radar theme changed, and
 * would go stale the moment `SCHEMA_VERSION` moved.
 *
 * Three consequences of needing the whole `ParsedDemo` to draw one frame, and all three are rules:
 *
 * - it opens on a **press and never on a hover** — a grid that parses on mouseover thrashes the
 *   cache, which is why the read is here and not on the card;
 * - **it releases the parse when it closes.** `saved` going `null` drops it, so browsing eight cards
 *   never holds eight matches;
 * - it is the one route in that can fail after the card has drawn. A read that finds no file drops
 *   the entry (#140), so the card goes and this says why rather than showing a match that is not
 *   there.
 *
 * Entering re-reads through `useDemoParse` rather than handing this copy over. That costs the
 * 0.02 s cache read a second time and buys the thing worth more: one owner of a parse at a time,
 * with this one released before the match's is allocated.
 *
 * **It is mounted whether or not it is open, and that is what #277 changed.** The dialog can animate
 * out now, and an exit animation belongs to an element that still exists — a component unmounted on
 * the press that closes it has already gone by the frame the animation would run. `shown` is the
 * last demo it was given, held across the exit so the card fades out with its content rather than
 * emptying first; the parse itself is not held, because the effect below drops it the moment `saved`
 * goes.
 */
export function DemoDialog({ saved, onEnter, onDismiss, onGone }: Props) {
  const t = useT();
  const [parsed, setParsed] = useState<ParsedDemo | null>(null);
  const [isGone, setIsGone] = useState(false);

  const lastShown = useRef<SavedDemo | null>(null);
  if (saved !== null) lastShown.current = saved;
  const shown = lastShown.current;

  const key = saved?.key ?? null;

  useEffect(() => {
    if (key === null) {
      setParsed(null);
      setIsGone(false);
      return;
    }

    let isCurrent = true;

    void readSavedDemo(key).then((demo) => {
      if (!isCurrent) return;

      if (demo === null) {
        setIsGone(true);
        onGone(key);
        return;
      }

      setParsed(demo);
    });

    return () => {
      isCurrent = false;
    };
  }, [key, onGone]);

  const sides = useMemo(
    () => (parsed === null ? null : sidesBySlotAtRound(parsed, SHOWN_ROUND_INDEX)),
    [parsed],
  );

  const shownRound = parsed?.events.rounds.at(SHOWN_ROUND_INDEX);

  if (shown === null) return null;

  return (
    <Dialog
      isOpen={saved !== null}
      onDismiss={onDismiss}
      aria-label={t('library.dialog.label', { map: shown.map })}
      className="@container max-h-full w-[calc(100vw-2rem)] max-w-[48rem] gap-5 overflow-y-auto p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {/* A map name is game vocabulary and stays as the demo wrote it — AGENTS.md §11. */}
          <h2 className="font-ui font-medium text-20 leading-dense">{shown.map}</h2>
          <p className="numeric text-14 text-ink-dim">
            <Text path="library.saved.score" values={{ ...shown.score }} />
          </p>
          <DemoFileName fileName={shown.fileName} />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('library.dialog.close')}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      {isGone && (
        <section role="alert" className="flex flex-col gap-2">
          <p className="text-14">
            <Text path="library.saved.gone.title" />
          </p>
          <p className="max-w-[52ch] text-13 text-ink-dim leading-prose">
            <Text path="library.saved.gone.hint" />
          </p>
        </section>
      )}

      {!isGone && parsed === null && (
        <p className="text-13 text-ink-dim">
          <Text path="library.dialog.loading" />
        </p>
      )}

      {parsed !== null && sides !== null && (
        <>
          <div className="grid gap-5 @[40rem]:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <PlateStill demo={parsed} frame={roundOpeningFrame(parsed, SHOWN_ROUND_INDEX)} />

              {shownRound !== undefined && (
                <p className="numeric text-12 text-ink-dim">
                  <Text path="library.dialog.plate" values={{ round: shownRound.number }} />
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {TEAMS.map((side) => (
                <SideRoster
                  key={side}
                  side={side}
                  players={playersOnSide(parsed.header.players, sides, side)}
                />
              ))}
            </div>
          </div>

          {parsed.events.rounds.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="label-dense text-ink-dim">
                <Text path="library.dialog.rounds" />
              </h3>

              <ul className="flex list-none flex-wrap gap-1 p-0">
                {parsed.events.rounds.map((round, index) => (
                  <li key={round.number}>
                    <button
                      type="button"
                      onClick={() => onEnter(shown, index)}
                      aria-label={t('library.dialog.round', {
                        round: round.number,
                        side: round.winner,
                      })}
                      className={`numeric h-control min-w-(--height-control) rounded-chip border border-line px-1.5 text-12 transition-colors duration-(--duration-micro) ease-out hover:border-line-strong hover:bg-hover ${
                        round.winner === 'CT' ? 'bg-ct/15' : 'bg-t/15'
                      }`}
                    >
                      {round.number}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={() => onEnter(shown, SHOWN_ROUND_INDEX)}
            >
              <Text path="library.dialog.open" />
            </Button>
          </footer>
        </>
      )}
    </Dialog>
  );
}
