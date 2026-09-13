import { HEAT_MODES, type HeatMode, type ParsedDemo, type PlayerSlot } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import { type ReactNode, useMemo, useState } from 'react';
import { HeatPlate, heatField } from '@/features/radar';
import type { SideScope } from '../helpers/map-scope';
import { MapScope } from './MapScope';

const SECONDS_PER_MINUTE = 60;

function minutes(seconds: number): number {
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

const MODE_NAMES: Readonly<Record<HeatMode, TranslationKey>> = {
  presence: 'review.maps.heat.presence',
  damageDealt: 'review.maps.heat.damageDealt',
  damageTaken: 'review.maps.heat.damageTaken',
  kills: 'review.maps.heat.kills',
  deaths: 'review.maps.heat.deaths',
  utility: 'review.maps.heat.utility',
};

/** The reading above the roster: what the whole field is made of, in the mode's own unit. */
function reading(mode: HeatMode, total: number): ReactNode {
  switch (mode) {
    case 'presence':
      return <Text path="review.maps.timeOnMap" values={{ count: minutes(total) }} />;
    case 'damageDealt':
    case 'damageTaken':
      return <Text path="review.maps.heat.damage" values={{ count: Math.round(total) }} />;
    case 'kills':
      return <Text path="review.maps.heat.killCount" values={{ count: total }} />;
    case 'deaths':
      return <Text path="review.maps.heat.deathCount" values={{ count: total }} />;
    case 'utility':
      return <Text path="review.maps.throws" values={{ count: total }} />;
  }
}

/** What a seat states beside a name, in the same unit. */
function figure(mode: HeatMode, value: number): ReactNode {
  return mode === 'presence' ? (
    <Text path="review.maps.minutes" values={{ count: minutes(value) }} />
  ) : (
    <Text path="review.maps.heat.figure" values={{ count: Math.round(value) }} />
  );
}

function note(mode: HeatMode, hz: number): ReactNode {
  if (mode === 'presence') return <Text path="review.maps.sampledNote" values={{ hz }} />;
  if (mode === 'utility') return <Text path="review.maps.heat.utilityNote" />;

  return <Text path="review.maps.heat.eventNote" />;
}

/**
 * Where the match was spent, and since #385 where it was fought: presence, the damage a side dealt
 * and took, its kills, its deaths, and where its utility went off — `ROADMAP.md` M5's heat map.
 *
 * **Which points count is `demo-core`'s** (`walkHeat`), and this screen only chooses the mode. It is
 * a native `<select>` rather than a row of seats: six names in the longest locale are a column of
 * their own, and below `split` this aside is a strip over the map whose every extra line is taken
 * from the plate.
 *
 * **A seat's figure ignores the player narrowing.** It is the side scope's own, so choosing a player
 * changes what is drawn without moving the numbers that were the reason for choosing them.
 */
export function MatchHeatmap({ demo }: { demo: ParsedDemo }) {
  const t = useT();

  const [mode, setMode] = useState<HeatMode>('presence');
  const [side, setSide] = useState<SideScope>('all');
  const [subject, setSubject] = useState<PlayerSlot | null>(null);

  const overview = getMapOverview(demo.header.map);

  const field = useMemo(
    () =>
      overview === undefined
        ? null
        : heatField(demo, overview, mode, { side: side === 'all' ? null : side, subject }),
    [demo, overview, mode, side, subject],
  );

  const scopeTotal = useMemo(
    () => (field === null ? 0 : field.bySlot.reduce((total, value) => total + value, 0)),
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
        scope={
          <label className="flex items-center justify-between gap-2 split:self-stretch">
            <span className="label-dense text-ink-dim">
              <Text path="review.maps.heat.mode" />
            </span>

            <select
              value={mode}
              onChange={(event) => {
                const chosen = HEAT_MODES.find((each) => each === event.target.value);
                if (chosen !== undefined) setMode(chosen);
              }}
              className="h-control min-w-0 rounded-chip border border-line bg-surface-2 px-2 text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:border-line-strong"
            >
              {HEAT_MODES.map((each) => (
                <option key={each} value={each}>
                  {t(MODE_NAMES[each])}
                </option>
              ))}
            </select>
          </label>
        }
        reading={reading(mode, field?.total ?? 0)}
        figure={(slot) => figure(mode, slot === null ? scopeTotal : (field?.bySlot[slot] ?? 0))}
        note={note(mode, demo.track.sampleHz)}
      />

      <section className="grid min-h-0 min-w-0">
        <HeatPlate demo={demo} field={field} />
      </section>
    </div>
  );
}
