import { useT } from '@disa/i18n';
import { memo } from 'react';
import type { Transport } from '@/core/playback';
import { useRovingFocus } from '@/shared/hooks';
import { type KillMarker, MARKER_BAND_PX } from '../helpers/spine';

interface Props {
  markers: readonly KillMarker[];
  names: readonly (string | undefined)[];
  transport: Transport;
}

/**
 * The markers share one tab stop and are walked with the arrow keys, because a match holds well
 * over a hundred kills and tabbing through them to reach the controls below is not an interface.
 *
 * Memoised because the timeline above it re-renders off the 10 Hz readout: reconciling two hundred
 * buttons ten times a second cost 5 fps and pushed the worst scrub frame from 12 ms to 25 ms.
 */
export const KillMarkers = memo(function KillMarkers({ markers, names, transport }: Props) {
  const t = useT();
  const roving = useRovingFocus(markers.length);

  if (markers.length === 0) return null;

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
      className="-translate-y-1/2 pointer-events-none absolute inset-x-0 top-1/2"
      style={{ height: `${MARKER_BAND_PX}px` }}
    >
      {markers.map((marker, index) => (
        <li key={marker.index}>
          <button
            type="button"
            ref={roving.register(index)}
            tabIndex={index === roving.tabStop ? 0 : -1}
            aria-label={labelFor(marker)}
            onKeyDown={(event) => roving.onKeyDown(event, index)}
            onClick={() => {
              roving.select(index);
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
