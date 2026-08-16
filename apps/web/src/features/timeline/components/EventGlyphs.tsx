import { type PlayerSlot, type Team, UTILITY_NAMES } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { memo } from 'react';
import { EventGlyph, UTILITY_INK, UtilityGlyph } from '@/core/glyphs';
import type { Transport } from '@/core/playback';
import { useRovingFocus } from '@/shared/hooks';
import { defuseOutcomeKey } from '../helpers/outcome-copy';
import type { AxisEvent, AxisGlyph } from '../helpers/round-axis';

/** The band the glyphs occupy, centred on the axis — 24px of mark plus the room to rise into. */
const GLYPH_BAND_PX = 28;

interface Props {
  glyphs: readonly AxisGlyph[];
  names: readonly (string | undefined)[];
  selectedSlot: PlayerSlot | null;
  /** Whether the axis is wide enough for symbols, or narrow enough that they collapse to marks. */
  hasRoom: boolean;
  transport: Transport;
}

const SIDE_INK: Readonly<Record<Team, string>> = {
  CT: 'text-ct',
  T: 'text-t',
};

function inkFor(event: AxisEvent): string {
  switch (event.kind) {
    case 'kill':
      return event.victimSide === undefined ? 'text-ink-dim' : SIDE_INK[event.victimSide];
    case 'plant':
    case 'defuse':
      return 'text-objective';
    case 'grenade':
      return UTILITY_INK[event.utility];
  }
}

function Glyph({ event }: { event: AxisEvent }) {
  switch (event.kind) {
    case 'kill':
      return <EventGlyph kind="kill" size="axis" />;
    case 'plant':
      return <EventGlyph kind="plant" size="axis" />;
    case 'defuse':
      return <EventGlyph kind="defuse" size="axis" />;
    case 'grenade':
      return <UtilityGlyph kind={event.utility} size="axis" />;
  }
}

/**
 * §7.1's glyphs: one symbol per event on the round's own axis, tinted by what it was. They share one
 * tab stop and are walked with the arrow keys, because a busy round holds thirty of them and tabbing
 * through to reach the speed control is not an interface.
 *
 * Memoised for the reason `KillMarkers` was: the timeline above re-renders off the 10 Hz readout, so
 * without it every glyph reconciles ten times a second for a list that turns over once a round.
 */
export const EventGlyphs = memo(function EventGlyphs({
  glyphs,
  names,
  selectedSlot,
  hasRoom,
  transport,
}: Props) {
  const t = useT();
  const roving = useRovingFocus(glyphs.length);

  if (glyphs.length === 0) return null;

  function nameOf(slot: PlayerSlot | null): string {
    if (slot === null) return t('timeline.unknownPlayer');

    return names[slot] ?? t('timeline.unknownPlayer');
  }

  function labelFor(event: AxisEvent): string {
    switch (event.kind) {
      case 'kill':
        return event.attacker === null
          ? t('timeline.killByWorld', { victim: nameOf(event.victim) })
          : t('timeline.kill', {
              attacker: nameOf(event.attacker),
              victim: nameOf(event.victim),
            });
      case 'plant':
        return t('timeline.plant', { planter: nameOf(event.planter) });
      case 'defuse':
        return t(defuseOutcomeKey(event.status), { defuser: nameOf(event.defuser) });
      case 'grenade':
        return t('timeline.grenade', {
          thrower: nameOf(event.thrower),
          utility: UTILITY_NAMES[event.utility],
        });
    }
  }

  // §7.1: the strip goes quiet around the one question a reader asked. Only a kill *by* the selected
  // player rises — a kill *of* them is still someone else's work.
  function isRaised(event: AxisEvent): boolean {
    return selectedSlot !== null && event.kind === 'kill' && event.attacker === selectedSlot;
  }

  return (
    // The band takes no pointer events of its own, so everything between two glyphs still scrubs.
    <ul
      aria-label={t('timeline.events')}
      className="-translate-y-1/2 pointer-events-none absolute inset-x-0 top-1/2"
      style={{ height: `${GLYPH_BAND_PX}px` }}
    >
      {glyphs.map((glyph, index) => {
        const raised = isRaised(glyph.event);
        const muted = selectedSlot !== null && !raised;

        return (
          <li key={glyph.id}>
            <button
              type="button"
              ref={roving.register(index)}
              tabIndex={index === roving.tabStop ? 0 : -1}
              aria-label={labelFor(glyph.event)}
              onKeyDown={(event) => roving.onKeyDown(event, index)}
              onClick={() => {
                roving.select(index);
                transport.seek(glyph.frame);
              }}
              style={{ left: `${glyph.fraction * 100}%` }}
              // The target a pointer hits is the `::before`, wider than the mark it carries. The
              // descendant selector is what mutes a `UtilityGlyph`, which owns its colour class:
              // between two single-class rules the stylesheet's order would decide instead.
              className={`-translate-x-1/2 pointer-events-auto absolute inset-y-0 flex items-center justify-center transition-transform duration-micro ease-out before:absolute before:-inset-x-1 before:inset-y-0 before:content-[''] focus-visible:z-10 ${
                muted ? 'text-ink-faint [&_svg]:text-ink-faint' : inkFor(glyph.event)
              } ${raised ? '-translate-y-1' : ''}`}
            >
              {hasRoom ? (
                <Glyph event={glyph.event} />
              ) : (
                // A mark keeps the position and the colour and loses only the shape — §7.1.
                <span aria-hidden="true" className="h-3.5 w-0.5 bg-current" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
});
