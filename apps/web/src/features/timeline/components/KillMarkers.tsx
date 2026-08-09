import { useT } from '@disa/i18n';
import { type KeyboardEvent, useRef, useState } from 'react';
import type { Transport } from '@/core/playback';
import { type KillMarker, SPINE_AXIS_FRACTION } from '../helpers/spine';

const STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

interface Props {
  markers: readonly KillMarker[];
  names: readonly (string | undefined)[];
  transport: Transport;
}

/**
 * The markers share one tab stop and are walked with the arrow keys, because a match holds well
 * over a hundred kills and tabbing through them to reach the controls below is not an interface.
 */
export function KillMarkers({ markers, names, transport }: Props) {
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

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    const step = STEPS[event.key];

    if (step === undefined) {
      if (event.key !== 'Home' && event.key !== 'End') return;

      event.preventDefault();
      focusAt(event.key === 'Home' ? 0 : markers.length - 1);
      return;
    }

    event.preventDefault();
    focusAt(tabStop + step);
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
      onKeyDown={handleKeyDown}
      className="pointer-events-none absolute inset-x-0 h-3"
      style={{ top: `${SPINE_AXIS_FRACTION * 100}%` }}
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
            onClick={() => {
              setActiveIndex(index);
              transport.seek(marker.frame);
            }}
            style={{ left: `${marker.fraction * 100}%` }}
            className="pointer-events-auto absolute inset-y-0 w-1 -translate-x-1/2 bg-kill"
          />
        </li>
      ))}
    </ul>
  );
}
