import { useT } from '@disa/i18n';
import { type KeyboardEvent, memo, useRef, useState } from 'react';
import type { Transport } from '@/core/playback';
import { type KillMarker, MARKER_BAND_PX, SPINE_AXIS_FRACTION } from '../helpers/spine';

const STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

interface Props {
  markers: readonly KillMarker[];
  names: readonly (string | undefined)[];
  transport: Transport;
}

/**
 * The markers share one tab stop and are walked with the arrow keys, because a match holds well
 * over a hundred kills and tabbing through them to reach the controls below is not an interface.
 *
 * Memoised because the spine above it re-renders off the 10 Hz readout: reconciling two hundred
 * buttons ten times a second cost 5 fps and pushed the worst scrub frame from 12 ms to 25 ms.
 */
export const KillMarkers = memo(function KillMarkers({ markers, names, transport }: Props) {
  const t = useT();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (markers.length === 0) return null;

  // Derived rather than stored: a shorter match than the last one would otherwise leave the tab
  // stop on a marker that no longer exists, and the whole band would drop out of the tab order.
  const tabStop = Math.min(activeIndex, markers.length - 1);

  function focusAt(index: number): void {
    const wanted = Math.min(Math.max(index, 0), markers.length - 1);

    setActiveIndex(wanted);
    buttonsRef.current[wanted]?.focus();
  }

  // The index comes from the key's own marker rather than from state, so two keys arriving inside
  // one React batch both step from where the focus actually is.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, from: number): void {
    const step = STEPS[event.key];

    if (step === undefined) {
      if (event.key !== 'Home' && event.key !== 'End') return;

      event.preventDefault();
      focusAt(event.key === 'Home' ? 0 : markers.length - 1);
      return;
    }

    event.preventDefault();
    focusAt(from + step);
  }

  function labelFor(marker: KillMarker): string {
    const victim = names[marker.victim] ?? t('timeline.unknownPlayer');
    if (marker.attacker === null) return t('timeline.killByWorld', { victim });

    return t('timeline.kill', {
      attacker: names[marker.attacker] ?? t('timeline.unknownPlayer'),
      victim,
    });
  }

  return (
    // The band takes no pointer events of its own, so everything between two markers still scrubs.
    <ul
      aria-label={t('timeline.kills')}
      className="pointer-events-none absolute inset-x-0"
      style={{ top: `${SPINE_AXIS_FRACTION * 100}%`, height: `${MARKER_BAND_PX}px` }}
    >
      {markers.map((marker, index) => (
        <li key={marker.index}>
          <button
            type="button"
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            tabIndex={index === tabStop ? 0 : -1}
            aria-label={labelFor(marker)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => {
              setActiveIndex(index);
              transport.seek(marker.frame);
            }}
            style={{ left: `${marker.fraction * 100}%` }}
            // A match holds a couple of hundred kills, so the tick is 2px and the target it
            // carries is the `::before` — wide enough to hit, narrow enough not to read as a bar.
            className="pointer-events-auto absolute inset-y-0 w-0.5 -translate-x-1/2 bg-damage before:absolute before:-inset-x-1 before:inset-y-0 before:content-[''] focus-visible:z-10"
          />
        </li>
      ))}
    </ul>
  );
});
