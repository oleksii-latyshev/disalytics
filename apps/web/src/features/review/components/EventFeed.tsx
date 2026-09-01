import type { ParsedDemo, PlayerInfo, PlayerSlot } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { DURATION_MICRO_SECONDS, EASE_OUT, m } from '@disa/ui';
import { useEffect, useMemo } from 'react';
import { EventRow, type KillLine, type RowEvent } from '@/core/events';
import type { Transport } from '@/core/playback';
import { killLineOf, roundFeed, visibleFeed } from '../helpers/event-feed';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  frame: number;
  roundIndex: number | undefined;
  players: readonly PlayerInfo[];
  onKillHover: (kill: KillLine | null) => void;
}

/**
 * DESIGN.md §5.4's feed, under the corner cluster: the last events before the playhead, newest
 * first, clipped to the round being played.
 *
 * Four things here are load-bearing.
 *
 * **It is a function of the playhead rather than a log.** Nothing accumulates — `visibleFeed` is
 * asked again on every readout, so scrubbing backwards takes rows away and scrubbing forward brings
 * them back. A feed that appended as events went by would be right until the first scrub.
 *
 * **Rows arrive on the 10 Hz readout, never on the frame channel** (hard rule 4). The round's own
 * events are derived once per round, which is the cost #91 measured on 225 DOM buttons at the
 * readout's rate; what runs ten times a second is a walk over a dozen rows.
 *
 * **Hovering a row is also §5.4's other half** — the plate draws that kill's line — and focus does
 * exactly what hover does, because §9's floor is that the screen is operable without a pointer and a
 * hover-only affordance has no keyboard at all.
 *
 * **The arrival is the one animation §8 permits while playback runs**, and it is a mount transition
 * rather than a tween: a discrete event at the rate a match produces kills, on `opacity` and
 * `transform` only. There is deliberately no exit — a row leaves when the reader scrubs past it,
 * and animating that would put motion on the scrub.
 */
export function EventFeed({ demo, transport, frame, roundIndex, players, onKillHover }: Props) {
  const t = useT();

  const rows = useMemo(() => roundFeed(demo, roundIndex), [demo, roundIndex]);
  const names = useMemo(() => {
    const bySlot: (string | undefined)[] = [];
    for (const player of players) bySlot[player.slot] = player.name;

    return bySlot;
  }, [players]);
  const visible = visibleFeed(rows, frame);

  // A row that goes cannot report the pointer leaving it, and one goes at every round boundary: the
  // list empties while the pointer is still where the row was. Without this the plate would keep
  // drawing a line for a round nobody is watching any more.
  const isEmpty = visible.length === 0;
  useEffect(() => {
    if (isEmpty) onKillHover(null);
  }, [isEmpty, onKillHover]);

  if (isEmpty) return null;

  function nameOf(slot: PlayerSlot | null): string {
    if (slot === null) return t('review.feed.unknownPlayer');

    return names[slot] ?? t('review.feed.unknownPlayer');
  }

  function marksOf(event: RowEvent): readonly string[] {
    if (event.kind !== 'kill') return [];

    const marks: string[] = [];
    if (event.isHeadshot) marks.push(t('review.feed.headshot'));
    if (event.isWallbang) marks.push(t('review.feed.wallbang'));
    if (event.isThroughSmoke) marks.push(t('review.feed.throughSmoke'));

    return marks;
  }

  function sentenceOf(event: RowEvent): string {
    switch (event.kind) {
      case 'kill':
        return event.attacker === null
          ? t('review.feed.killByWorld', { victim: nameOf(event.victim) })
          : t('review.feed.kill', {
              attacker: nameOf(event.attacker),
              victim: nameOf(event.victim),
              // Game vocabulary reaches a label untranslated, the way a team row's weapon does.
              weapon: event.weaponName,
            });
      case 'plant':
        return t('review.feed.plant', { planter: nameOf(event.planter) });
      case 'defuse':
        return t('review.feed.defuse', { defuser: nameOf(event.defuser) });
    }
  }

  // One accessible name for the whole row: the marks are `aria-hidden` glyphs inside a button, and
  // a label on the button is what a reader hears instead of them.
  function labelFor(event: RowEvent): string {
    return [sentenceOf(event), ...marksOf(event)].join('. ');
  }

  return (
    <section
      aria-label={t('review.feed.label')}
      className="surface-card flex flex-col gap-0.5 rounded-float p-2"
    >
      <ul className="flex min-w-0 flex-col gap-0.5">
        {visible.map((row) => (
          <li key={row.id} className="min-w-0">
            <m.button
              type="button"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION_MICRO_SECONDS, ease: EASE_OUT }}
              aria-label={labelFor(row.event)}
              onClick={() => transport.seek(row.frame)}
              onPointerEnter={() => onKillHover(killLineOf(row))}
              onPointerLeave={() => onKillHover(null)}
              onFocus={() => onKillHover(killLineOf(row))}
              onBlur={() => onKillHover(null)}
              className="flex w-full min-w-0 rounded-chip px-1.5 py-0.5 text-left text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <EventRow event={row.event} nameOf={nameOf} />
            </m.button>
          </li>
        ))}
      </ul>
    </section>
  );
}
