import { HEAT_BIN_SECONDS, HEAT_BINS } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { binStartSeconds, clockOf, type RoundRange } from '../helpers/heat-range';

/** A tick every three steps, which is fifteen seconds. */
const TICK_EVERY_BINS = 3;
const TICKS = Array.from({ length: Math.ceil(HEAT_BINS / TICK_EVERY_BINS) + 1 }, (_, at) => at);

const MIN_BAR_PERCENT = 4;

const EDGE = 'var(--color-ink)';

/** A lit step is closed top and bottom by a line, and the first and last of a range by a bar. */
function rangeShadow(bin: number, range: RoundRange): string {
  const lines = [`inset 0 2px 0 ${EDGE}`, `inset 0 -2px 0 ${EDGE}`];
  if (bin === range.first) lines.push(`inset 3px 0 0 ${EDGE}`);
  if (bin === range.last) lines.push(`inset -3px 0 0 ${EDGE}`);

  return lines.join(', ');
}

interface Props {
  range: RoundRange;
  /** Seconds of presence in each step of the axis, over the side, the buy and the player. */
  bars: Float32Array;
  onBin: (bin: number) => void;
}

/**
 * What the collapsed timeline leaves out: how many players were alive at each moment of the round,
 * the fifteen-second ticks under them, and picking a range of the axis with two presses.
 *
 * The bars are the narrowing's own presence over the axis, so the range is drawn over what it would
 * keep: a part of the round nobody was alive in is a part of the map that will stay dark.
 */
export function HeatRoundDetail({ range, bars, onBin }: Props) {
  const t = useT();
  const tallest = bars.reduce((most, value) => Math.max(most, value), 0) || 1;

  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <div className="flex gap-3">
        <span className="hidden w-24 shrink-0 flex-col justify-center text-11 text-ink-dim leading-dense sm:flex">
          <Text path="review.heat.when.alive" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-10 items-end gap-px">
            {Array.from(bars, (value, bin) => {
              const isOn = bin >= range.first && bin <= range.last;
              const seconds = binStartSeconds(bin);

              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: the axis is fixed, a step is its index
                  key={bin}
                  type="button"
                  aria-pressed={isOn}
                  aria-label={t('review.heat.when.bar', {
                    from: clockOf(seconds),
                    to: clockOf(seconds + HEAT_BIN_SECONDS),
                  })}
                  onClick={() => onBin(bin)}
                  style={isOn ? { boxShadow: rangeShadow(bin, range) } : undefined}
                  className={cn(
                    'flex h-full min-w-0 flex-1 cursor-pointer items-end px-px transition-colors duration-(--duration-micro) ease-out',
                    isOn && 'bg-selected',
                    isOn && bin === range.first && 'rounded-s-chip',
                    isOn && bin === range.last && 'rounded-e-chip',
                  )}
                >
                  <span
                    className={cn('block w-full rounded-t-[2px]', isOn ? 'bg-ink' : 'bg-surface-3')}
                    style={{
                      height: `${Math.max(MIN_BAR_PERCENT, Math.round((value / tallest) * 88))}%`,
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div className="numeric flex justify-between text-10 text-ink-dim" aria-hidden="true">
            {TICKS.map((tick) => (
              <span key={tick}>{clockOf(tick * TICK_EVERY_BINS * HEAT_BIN_SECONDS)}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-right text-11 text-ink-dim">
        <Text
          path={range.pending === null ? 'review.heat.when.pick' : 'review.heat.when.pending'}
        />
      </p>
    </div>
  );
}
