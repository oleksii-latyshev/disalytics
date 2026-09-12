import type { ParsedDemo, PlayerSlot } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import { useMemo, useState } from 'react';
import { HeatPlate, presenceField } from '@/features/radar';
import { MapScope, type SideScope } from './MapScope';

const SECONDS_PER_MINUTE = 60;

function minutes(seconds: number): number {
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

/**
 * Where the match was spent, on the map it was spent on — `ROADMAP.md` M5's heat map, and its own
 * place rather than a layer of the duel map: the two answer different questions and nobody reads
 * them at once.
 *
 * **The field is derived here rather than inside the plate**, because the roster beside it is made
 * of the same walk: one pass over `TickTrack` answers both what the map draws and what each seat
 * states, and a second pass for the roster would read the whole match again to say it.
 *
 * **A seat's figure ignores the player narrowing.** It is the side scope's own time, so choosing a
 * player changes what is drawn without moving the numbers that were the reason for choosing them.
 */
export function MatchHeatmap({ demo }: { demo: ParsedDemo }) {
  const [side, setSide] = useState<SideScope>('all');
  const [subject, setSubject] = useState<PlayerSlot | null>(null);

  const overview = getMapOverview(demo.header.map);

  const field = useMemo(
    () =>
      overview === undefined
        ? null
        : presenceField(demo, overview, { side: side === 'all' ? null : side, subject }),
    [demo, overview, side, subject],
  );

  const scopeSeconds = useMemo(
    () => (field === null ? 0 : field.secondsBySlot.reduce((total, seconds) => total + seconds, 0)),
    [field],
  );

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)]">
      <MapScope
        side={side}
        onSide={setSide}
        subject={subject}
        onSubject={setSubject}
        players={demo.header.players}
        reading={
          <Text path="review.maps.timeOnMap" values={{ count: minutes(field?.seconds ?? 0) }} />
        }
        figure={(slot) => (
          <Text
            path="review.maps.minutes"
            values={{
              count: minutes(slot === null ? scopeSeconds : (field?.secondsBySlot[slot] ?? 0)),
            }}
          />
        )}
        note={<Text path="review.maps.sampledNote" values={{ hz: demo.track.sampleHz }} />}
      />

      <section className="grid min-h-0 min-w-0">
        <HeatPlate demo={demo} field={field} />
      </section>
    </div>
  );
}
