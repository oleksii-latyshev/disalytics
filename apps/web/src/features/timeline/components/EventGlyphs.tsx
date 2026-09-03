import { type PlayerSlot, type Team, UTILITY_NAMES } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventRow } from '@/core/events';
import { EventGlyph, UTILITY_INK, UtilityGlyph } from '@/core/glyphs';
import type { Transport } from '@/core/playback';
import { useRovingFocus } from '@/shared/hooks';
import { GLYPH_HIT_HALF_PX, glyphHitHalves, hasRoomForSymbol } from '../helpers/glyph-hits';
import { defuseOutcomeKey } from '../helpers/outcome-copy';
import { type AxisEvent, type AxisGlyph, namedKill } from '../helpers/round-axis';
import { anchorAtFraction } from '../helpers/round-strip';

/** The band the glyphs occupy, centred on the axis — 24px of mark plus the room to rise into. */
const GLYPH_BAND_PX = 28;

/** The dwell, the same one the strip's pills answer on: a tooltip answers a pointer that stayed. */
const HOVER_DWELL_MS = 400;

interface Props {
  glyphs: readonly AxisGlyph[];
  names: readonly (string | undefined)[];
  selectedSlot: PlayerSlot | null;
  /** The axis's own width, which decides both the glyphs' form and how wide each one's target is. */
  widthPx: number;
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
 * The axis's glyphs: one symbol per event on the round's own axis, tinted by what it was. They share
 * one tab stop and are walked with the arrow keys, because a busy round holds thirty of them and
 * tabbing through to reach the speed control is not an interface.
 *
 * **A glyph decides its own form** (#271). Where the nearest mark is a whole glyph away it is drawn
 * as a symbol; where it is closer than that, that glyph — and only that glyph — falls back to a
 * mark, so a cluster reads as the several events it is rather than as a smear of icons drawn over
 * one another. Nothing is nudged: a mark on a time axis that has been moved off its own moment is a
 * lie about time.
 *
 * Memoised for the reason `KillMarkers` was: the timeline above re-renders off the 10 Hz readout, so
 * without it every glyph reconciles ten times a second for a list that turns over once a round.
 */
export const EventGlyphs = memo(function EventGlyphs({
  glyphs,
  names,
  selectedSlot,
  widthPx,
  transport,
}: Props) {
  const t = useT();
  const roving = useRovingFocus(glyphs.length);
  const dwellRef = useRef(0);

  const halves = useMemo(() => glyphHitHalves(glyphs, widthPx), [glyphs, widthPx]);

  const [namedId, setNamedId] = useState<string | null>(null);

  useEffect(() => () => window.clearTimeout(dwellRef.current), []);

  const point = useCallback((id: string | null) => {
    window.clearTimeout(dwellRef.current);

    if (id === null) {
      setNamedId(null);
      return;
    }

    dwellRef.current = window.setTimeout(() => setNamedId(id), HOVER_DWELL_MS);
  }, []);

  // Focus answers at once: a reader arriving with the arrow keys has already committed to the glyph,
  // and a dwell would be a delay on a deliberate move rather than a guard against a passing pointer.
  const reveal = useCallback((id: string | null) => {
    window.clearTimeout(dwellRef.current);
    setNamedId(id);
  }, []);

  if (glyphs.length === 0) return null;

  const named = namedKill(glyphs, namedId);

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

  // The strip goes quiet around the one question a reader asked. Only a kill *by* the selected
  // player rises — a kill *of* them is still someone else's work.
  function isRaised(event: AxisEvent): boolean {
    return selectedSlot !== null && event.kind === 'kill' && event.attacker === selectedSlot;
  }

  return (
    <>
      {/* The band takes no pointer events of its own, so everything between two glyphs still
          scrubs. */}
      <ul
        aria-label={t('timeline.events')}
        className="-translate-y-1/2 pointer-events-none absolute inset-x-0 top-1/2"
        style={{ height: `${GLYPH_BAND_PX}px` }}
      >
        {glyphs.map((glyph, index) => {
          const raised = isRaised(glyph.event);
          const muted = selectedSlot !== null && !raised;
          const halfPx = halves.at(index) ?? GLYPH_HIT_HALF_PX;

          return (
            <li key={glyph.id}>
              <button
                type="button"
                ref={roving.register(index)}
                tabIndex={index === roving.tabStop ? 0 : -1}
                aria-label={labelFor(glyph.event)}
                onKeyDown={(event) => roving.onKeyDown(event, index)}
                onPointerEnter={() => point(glyph.id)}
                onPointerLeave={() => point(null)}
                onFocus={() => reveal(glyph.id)}
                onBlur={() => reveal(null)}
                onClick={() => {
                  roving.select(index);
                  transport.seek(glyph.frame);
                }}
                // The button *is* the target — the hit slot, centred on the mark and stopping half
                // way to the nearest neighbour, so a cluster's targets never overlap (#268). The
                // mark itself is laid out over the slot rather than inside it, or a 24px symbol in a
                // 3px button would be squeezed to fit.
                style={{
                  left: `${glyph.fraction * 100}%`,
                  width: `${halfPx * 2}px`,
                }}
                // The descendant selector is what mutes a `UtilityGlyph`, which owns its colour
                // class: between two single-class rules the stylesheet's order would decide instead.
                className={`-translate-x-1/2 pointer-events-auto absolute inset-y-0 transition-transform duration-(--duration-micro) ease-out focus-visible:z-10 hover:z-10 ${
                  muted ? 'text-ink-faint [&_svg]:text-ink-faint' : inkFor(glyph.event)
                } ${raised ? '-translate-y-1' : ''}`}
              >
                {/* The mark overhangs the slot, so it must not be a target itself: a 24px symbol
                    taking pointer events would reach across its neighbours exactly the way the
                    button used to. */}
                <span className="-translate-x-1/2 pointer-events-none absolute inset-y-0 left-1/2 flex items-center justify-center">
                  {hasRoomForSymbol(halfPx) ? (
                    <Glyph event={glyph.event} />
                  ) : (
                    // A mark keeps the position and the colour and loses only the shape.
                    <span aria-hidden="true" className="h-3.5 w-0.5 bg-current" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The kill row: `--surface-3` and no `backdrop-filter`, because the playhead and the glyphs
          are moving under it every frame. It hangs above the axis and over the round strip — the
          block does not clip its overflow, and below the axis is the bottom of the window. Anchored
          by the edge nearer its end of the axis, so the row grows inward and the last kill of a
          round is not drawn off the screen.

          `aria-hidden` because it restates the glyph's own accessible name, which is the whole
          reason it is allowed to exist. */}
      {named !== undefined && (
        <div
          aria-hidden="true"
          style={anchorAtFraction(named.fraction)}
          className="pointer-events-none absolute bottom-1/2 z-20 mb-4 flex items-center whitespace-nowrap rounded-chip bg-surface-3 px-2 py-1 text-12 shadow-float"
        >
          <EventRow event={named.event} nameOf={nameOf} />
        </div>
      )}
    </>
  );
});
