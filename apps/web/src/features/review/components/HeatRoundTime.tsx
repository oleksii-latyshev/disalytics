import { HEAT_BIN_SECONDS, HEAT_BINS, HEAT_PHASES, type HeatPhaseId } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import {
  AnimatePresence,
  cn,
  DURATION_PANEL_SECONDS,
  EASE_OUT,
  motion,
  useReducedMotionConfig,
} from '@disa/ui';
import { ChevronUp, Play, Square } from 'lucide-react';
import { useState } from 'react';
import { rangeLabel } from '../helpers/heat-copy';
import { isWholeRange, phaseOfRange, type RoundRange } from '../helpers/heat-range';
import { HeatRoundDetail } from './HeatRoundDetail';

const BAND =
  'flex min-w-0 cursor-pointer flex-col items-start justify-center gap-px overflow-hidden rounded-chip border px-2 py-1 text-left transition-colors duration-(--duration-micro) ease-out';

function bandClass(isOn: boolean): string {
  return cn(
    BAND,
    isOn
      ? 'border-ink bg-ink text-surface-0'
      : 'border-line bg-surface-2 text-ink hover:border-line-strong',
  );
}

interface Props {
  range: RoundRange;
  bars: Float32Array;
  isPlaying: boolean;
  onWhole: () => void;
  onPhase: (phase: HeatPhaseId) => void;
  onBin: (bin: number) => void;
  onPlay: () => void;
  onStop: () => void;
}

function PhaseRange({ firstBin, lastBin }: { firstBin: number; lastBin: number }) {
  const from = firstBin * HEAT_BIN_SECONDS;

  return lastBin >= HEAT_BINS - 1 ? (
    <Text path="review.heat.when.phaseRangeOpen" values={{ from }} />
  ) : (
    <Text
      path="review.heat.when.phaseRange"
      values={{ from, to: (lastBin + 1) * HEAT_BIN_SECONDS }}
    />
  );
}

/**
 * *When in the round*, under the plate: the part of every round the map is narrowed to, and a way
 * to step through the round.
 *
 * **It is collapsed by default to the timeline alone** — the range, the three phases as bands as
 * long as they are, *Whole round* and *Play round* — so it costs the plate as little height as it
 * can. The brow above it opens the detail: the players alive at each moment, the ticks, and a range
 * of the reader's own.
 *
 * The detail opens on `height` and `opacity`, the plate resizing with it, which is a repaint of two
 * pictures and no work in a draw; with reduced motion it opens at once.
 */
export function HeatRoundTime(props: Props) {
  const { range, bars, isPlaying, onWhole, onPhase, onBin, onPlay, onStop } = props;
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const isReduced = useReducedMotionConfig() === true;

  const phase = phaseOfRange(range);
  const transition = isReduced
    ? { duration: 0 }
    : { duration: DURATION_PANEL_SECONDS, ease: EASE_OUT };

  return (
    <section aria-label={t('review.heat.when.title')} className="flex flex-col items-stretch">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={t(isOpen ? 'review.heat.when.detailHide' : 'review.heat.when.detailShow')}
        onClick={() => setIsOpen((current) => !current)}
        className="mx-auto flex h-5 cursor-pointer items-center gap-1 rounded-t-chip border border-line border-b-0 bg-surface-1 px-3 text-11 text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink"
      >
        <Text path="review.heat.when.detail" />
        <ChevronUp
          aria-hidden="true"
          className={cn(
            'size-3 transition-[rotate] duration-(--duration-base) ease-out',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div className="surface-card flex flex-col gap-2 rounded-float p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="label-dense shrink-0 text-ink-dim">
              <Text path="review.heat.when.title" />
            </h2>
            <span className="numeric shrink-0 font-semibold text-14 text-ink">
              {rangeLabel(t, range)}
            </span>
            <span className="hidden min-w-0 truncate text-12 text-ink-dim wide:inline">
              <Text path="review.heat.when.hint" />
            </span>
          </div>

          <button
            type="button"
            aria-label={t('review.heat.when.playLabel')}
            onClick={isPlaying ? onStop : onPlay}
            className="flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-chip border border-line-strong bg-surface-2 px-3 text-12 font-medium text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
          >
            {isPlaying ? (
              <Square aria-hidden="true" className="size-3 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-3 fill-current" />
            )}
            <Text path={isPlaying ? 'review.heat.when.stop' : 'review.heat.when.play'} />
          </button>
        </div>

        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            aria-pressed={isWholeRange(range)}
            onClick={onWhole}
            className={cn(bandClass(isWholeRange(range)), 'shrink-0 justify-center text-12')}
          >
            <Text path="review.heat.when.whole" />
          </button>

          <div className="flex min-w-0 flex-1 gap-0.5">
            {HEAT_PHASES.map((each) => (
              <button
                key={each.id}
                type="button"
                aria-pressed={phase === each.id}
                onClick={() => onPhase(each.id)}
                title={t(`review.heat.when.phase.${each.id}`)}
                style={{ flex: `${each.lastBin - each.firstBin + 1} 1 0` }}
                className={bandClass(phase === each.id)}
              >
                <span className="w-full truncate font-semibold text-12">
                  <Text path={`review.heat.when.phase.${each.id}`} />
                </span>
                <span className="numeric text-10 opacity-75">
                  <PhaseRange firstBin={each.firstBin} lastBin={each.lastBin} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <HeatRoundDetail range={range} bars={bars} onBin={onBin} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
