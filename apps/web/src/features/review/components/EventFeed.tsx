import type { ParsedDemo, PlayerInfo, PlayerSlot, Team } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { m } from '@disa/ui';
import { useMemo } from 'react';
import { EventGlyph, KillMark, WeaponGlyph } from '@/core/glyphs';
import type { Transport } from '@/core/playback';
import { type FeedEvent, roundFeed, visibleFeed } from '../helpers/event-feed';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  frame: number;
  roundIndex: number | undefined;
  players: readonly PlayerInfo[];
}

const SIDE_INK: Readonly<Record<Team, string>> = {
  CT: 'text-ct',
  T: 'text-t',
};

function sideInk(side: Team | undefined): string {
  return side === undefined ? 'text-ink-dim' : SIDE_INK[side];
}

/**
 * A row's visible shape — *attacker · weapon glyph · victim* for a kill, and a single line in
 * `--objective` for a plant or a defuse (§5.4). It is declared here rather than inside `EventFeed`
 * because a component declared inside another is a new type on every render, and React remounts the
 * whole subtree when that happens — ten times a second, on the readout.
 */
function RowBody({
  event,
  nameOf,
}: {
  event: FeedEvent;
  nameOf: (slot: PlayerSlot | null) => string;
}) {
  if (event.kind !== 'kill') {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-objective">
        <EventGlyph kind={event.kind} />
        <span className="min-w-0 truncate">
          {nameOf(event.kind === 'plant' ? event.planter : event.defuser)}
        </span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {event.attacker !== null && (
        <span className={`min-w-0 truncate ${sideInk(event.attackerSide)}`}>
          {nameOf(event.attacker)}
        </span>
      )}

      <span className="flex shrink-0 items-center gap-1 text-ink-dim">
        {/* A world kill has no weapon to draw, and the bomb draws nothing by rule — §6.4. */}
        {event.attacker !== null && <WeaponGlyph weapon={event.weapon} />}
        {event.isHeadshot && <KillMark kind="headshot" />}
        {event.isWallbang && <KillMark kind="wallbang" />}
        {event.isThroughSmoke && <KillMark kind="smoke" />}
      </span>

      <span className={`min-w-0 truncate ${sideInk(event.victimSide)}`}>
        {nameOf(event.victim)}
      </span>
    </span>
  );
}

/**
 * DESIGN.md §5.4's feed, under the corner cluster: the last events before the playhead, newest
 * first, clipped to the round being played.
 *
 * Three things here are load-bearing.
 *
 * **It is a function of the playhead rather than a log.** Nothing accumulates — `visibleFeed` is
 * asked again on every readout, so scrubbing backwards takes rows away and scrubbing forward brings
 * them back. A feed that appended as events went by would be right until the first scrub.
 *
 * **Rows arrive on the 10 Hz readout, never on the frame channel** (hard rule 4). The round's own
 * events are derived once per round, which is the cost #91 measured on 225 DOM buttons at the
 * readout's rate; what runs ten times a second is a walk over a dozen rows.
 *
 * **The arrival is the one animation §8 permits while playback runs**, and it is a mount transition
 * rather than a tween: a discrete event at the rate a match produces kills, on `opacity` and
 * `transform` only. There is deliberately no exit — a row leaves when the reader scrubs past it,
 * and animating that would put motion on the scrub.
 */
export function EventFeed({ demo, transport, frame, roundIndex, players }: Props) {
  const t = useT();

  const rows = useMemo(() => roundFeed(demo, roundIndex), [demo, roundIndex]);
  const names = useMemo(() => {
    const bySlot: (string | undefined)[] = [];
    for (const player of players) bySlot[player.slot] = player.name;

    return bySlot;
  }, [players]);
  const visible = visibleFeed(rows, frame);

  if (visible.length === 0) return null;

  function nameOf(slot: PlayerSlot | null): string {
    if (slot === null) return t('review.feed.unknownPlayer');

    return names[slot] ?? t('review.feed.unknownPlayer');
  }

  function marksOf(event: FeedEvent): readonly string[] {
    if (event.kind !== 'kill') return [];

    const marks: string[] = [];
    if (event.isHeadshot) marks.push(t('review.feed.headshot'));
    if (event.isWallbang) marks.push(t('review.feed.wallbang'));
    if (event.isThroughSmoke) marks.push(t('review.feed.throughSmoke'));

    return marks;
  }

  function sentenceOf(event: FeedEvent): string {
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
  function labelFor(event: FeedEvent): string {
    return [sentenceOf(event), ...marksOf(event)].join('. ');
  }

  return (
    <section
      aria-label={t('review.feed.label')}
      className="glass-panel flex flex-col gap-0.5 rounded-float p-2"
    >
      <ul className="flex min-w-0 flex-col gap-0.5">
        {visible.map((row) => (
          <li key={row.id} className="min-w-0">
            <m.button
              type="button"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              aria-label={labelFor(row.event)}
              onClick={() => transport.seek(row.frame)}
              className="flex w-full min-w-0 rounded-chip px-1.5 py-0.5 text-left text-13 text-ink transition-colors duration-micro ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <RowBody event={row.event} nameOf={nameOf} />
            </m.button>
          </li>
        ))}
      </ul>
    </section>
  );
}
