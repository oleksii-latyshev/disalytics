import type { Team } from '@disa/demo-core';
import { EventGlyph, KillMark, WeaponGlyph } from '@/core/glyphs';
import type { NameOfSlot, RowEvent } from '../helpers/row';

interface Props {
  event: RowEvent;
  nameOf: NameOfSlot;
}

const SIDE_INK: Readonly<Record<Team, string>> = {
  CT: 'text-ct',
  T: 'text-t',
};

function sideInk(side: Team | undefined): string {
  return side === undefined ? 'text-ink-dim' : SIDE_INK[side];
}

/**
 * One event as a line of reading — *attacker · weapon glyph · victim* for a kill, with the two names
 * in their side colours, and a single line in `--objective` for a plant or a defuse.
 *
 * **It lives in `core` because two features draw it**: §5.4's feed under the corner cluster and
 * §7.1's tooltip on the round axis. That is the rule rather than a convenience — `timeline` may not
 * import from `review`, and two components that agree by hand would have drifted the first time a
 * mark was added to one of them.
 *
 * It carries no accessible name of its own. Each caller names the whole control it sits in — a row
 * in a list on one side, a mark on an axis on the other — and the glyphs inside here are
 * `aria-hidden`, so a reader hears that name instead of a bag of symbols.
 */
export function EventRow({ event, nameOf }: Props) {
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
        {event.attacker !== null && <WeaponGlyph weapon={event.weapon} icon={event.weaponIcon} />}
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
