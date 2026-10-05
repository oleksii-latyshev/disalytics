import { Text } from '@disa/i18n';
import type { HeatReading } from '../helpers/heat-view';

const SECONDS_PER_MINUTE = 60;

/** A reading's figure in its own unit: minutes alive, deaths, health dealt, kills, or throws. */
export function HeatFigure({ reading, value }: { reading: HeatReading; value: number }) {
  switch (reading) {
    case 'stood':
      return (
        <Text
          path="review.maps.minutes"
          values={{ count: Math.round(value / SECONDS_PER_MINUTE) }}
        />
      );
    case 'died':
      return <Text path="review.heat.deaths" values={{ count: Math.round(value) }} />;
    case 'damageDealt':
    case 'damageTaken':
      return <Text path="review.heat.damage" values={{ count: Math.round(value) }} />;
    case 'kills':
      return <Text path="review.heat.kills" values={{ count: value }} />;
    case 'utility':
      return <Text path="review.heat.throws" values={{ count: value }} />;
  }
}

/** What the header states beside the plates: the reading's figure, or how far two routes overlap. */
export function HeatReadout({
  reading,
  isComparing,
  total,
  overlap,
}: {
  reading: HeatReading;
  isComparing: boolean;
  total: number;
  overlap: number | null;
}) {
  if (!isComparing) return <HeatFigure reading={reading} value={total} />;

  return overlap === null ? null : <Text path="review.heat.overlap" values={{ share: overlap }} />;
}
