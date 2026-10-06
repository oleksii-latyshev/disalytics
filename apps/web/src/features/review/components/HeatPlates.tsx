import type { ParsedDemo } from '@disa/demo-core';
import { cn } from '@disa/ui';
import { HeatPlate, type HeatShown } from '@/features/radar';
import type { HeatPlateSpec, HeatReading } from '../helpers/heat-view';
import { HeatFigure } from './HeatFigure';
import { HeatLegend, type HeatLegendKind } from './HeatLegend';

interface Props {
  demo: ParsedDemo;
  plates: readonly HeatPlateSpec[];
  reading: HeatReading;
  /** The name above each plate: `null` where a plate stands alone and needs none. */
  labels: readonly (string | null)[];
  legend: HeatLegendKind;
  names: { first: string; second: string };
  /** Which compared players are drawn: an overlay leaves the hidden one out, side by side dims its plate. */
  shown: HeatShown;
}

/**
 * The plate, or two of them side by side, each at the largest size its cell allows.
 *
 * Two compared players keep one colour each — yellow and pink — on their own plate, in the
 * difference and in the overlay, where the second is also striped; the name above a plate carries
 * the same dot.
 */
export function HeatPlates({ demo, plates, reading, labels, legend, names, shown }: Props) {
  return (
    <section
      className={cn('relative grid min-h-0 min-w-0 gap-4', plates.length === 2 && 'grid-cols-2')}
    >
      {plates.map((plate, at) => {
        const label = labels[at] ?? null;
        const isDimmed =
          plates.length === 2 && !shown[plate.identity === 'second' ? 'second' : 'first'];

        return (
          <div
            key={plate.identity}
            className={cn(
              'flex min-h-0 min-w-0 flex-col items-center gap-1.5 transition-opacity duration-(--duration-micro) ease-out',
              isDimmed && 'opacity-30',
            )}
          >
            {label !== null && (
              <span className="flex items-center gap-2 font-semibold text-13 text-ink">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 rounded-full',
                    plate.identity === 'second' ? 'bg-heat-second' : 'bg-heat-high',
                  )}
                />
                {label}
                <span className="numeric font-normal text-12 text-ink-dim">
                  <HeatFigure reading={reading} value={plate.total} />
                </span>
              </span>
            )}

            <div className="grid min-h-0 w-full flex-1">
              <HeatPlate demo={demo} picture={plate.picture} shown={shown} />
            </div>
          </div>
        );
      })}

      <HeatLegend kind={legend} first={names.first} second={names.second} />
    </section>
  );
}
