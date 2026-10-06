import { Text } from '@disa/i18n';

export type HeatLegendKind =
  | 'field'
  | 'rings'
  | 'pair'
  | 'overlay'
  | 'difference'
  | 'events'
  | 'utility';

/** A hue's own colour pulled towards black and towards white, the way the plate's ramps are. */
const dark = (token: string) => `color-mix(in srgb, var(${token}) 38%, #000)`;

/** Dark green to green to yellow, and white only on the last sliver: the ramp the plate is drawn in. */
const FIELD = `linear-gradient(90deg, ${dark('--color-heat-low')}, var(--color-heat-low) 40%, var(--color-heat-high) 86%, var(--color-ink))`;

const STRIPES = (token: string) =>
  `repeating-linear-gradient(135deg, var(${token}) 0 3px, transparent 3px 6px)`;

const SWATCH: Readonly<Record<Exclude<HeatLegendKind, 'rings'>, string>> = {
  events: FIELD,
  utility: FIELD,
  field: FIELD,
  pair: `linear-gradient(90deg, ${dark('--color-heat-high')}, var(--color-heat-high) 50%, ${dark('--color-heat-second')} 50%, var(--color-heat-second))`,
  overlay: `${STRIPES('--color-heat-second')} right / 50% 100% no-repeat, linear-gradient(90deg, var(--color-heat-high) 50%, transparent 50%)`,
  difference: `linear-gradient(90deg, var(--color-heat-second), ${dark('--color-heat-second')} 45%, ${dark('--color-heat-high')} 55%, var(--color-heat-high))`,
};

interface Props {
  kind: HeatLegendKind;
  first: string;
  second: string;
}

/** How to read the colours on the plate, in the corner of it, the way the duels view states its own. */
export function HeatLegend({ kind, first, second }: Props) {
  return (
    <p className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-2.5 rounded-card bg-surface-0/80 px-2.5 py-1.5 text-12 text-ink-dim">
      {kind === 'rings' ? (
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border-2 border-ink [box-shadow:0_0_0_1.5px_var(--color-surface-0)]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-2 w-24 shrink-0 rounded-full"
          style={{ background: SWATCH[kind] }}
        />
      )}
      <span>
        <Text path={`review.heat.legend.${kind}`} values={{ first, second }} />
      </span>
    </p>
  );
}
