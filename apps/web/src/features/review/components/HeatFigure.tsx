import { Text } from '@disa/i18n';
import type { HeatReading } from '../helpers/heat-view';

const SECONDS_PER_MINUTE = 60;

/** A reading's figure in its own unit: minutes alive for where they stood, deaths for where they died. */
export function HeatFigure({ reading, value }: { reading: HeatReading; value: number }) {
  return reading === 'stood' ? (
    <Text path="review.maps.minutes" values={{ count: Math.round(value / SECONDS_PER_MINUTE) }} />
  ) : (
    <Text path="review.heat.deaths" values={{ count: Math.round(value) }} />
  );
}
