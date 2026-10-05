import { Text } from '@disa/i18n';

export type HeatLegendKind = 'field' | 'rings' | 'pair' | 'difference';

/** A hue's own colour pulled towards black and towards white, the way the plate's ramps are. */
const dark = (token: string) => `color-mix(in srgb, var(${token}) 38%, #000)`;

const SWATCH: Readonly<Record<Exclude<HeatLegendKind, 'rings'>, string>> = {
  field: `linear-gradient(90deg, ${dark('--color-heat-low')}, var(--color-heat-low), var(--color-heat-high), var(--color-ink))`,
  pair: `linear-gradient(90deg, ${dark('--color-heat-high')}, var(--color-heat-high) 50%, ${dark('--color-heat-second')} 50%, var(--color-heat-second))`,
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
