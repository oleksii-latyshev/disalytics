import { type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Transport, useFrameReadout } from '@/core/playback';
import { useStoredFlag } from '@/shared/hooks';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import {
  hasRoomForNumbers,
  ROUND_STRIP_EXPANDED_HEIGHT_PX,
  ROUND_STRIP_HEIGHT_PX,
  type RoundCell,
  roundCells,
  type TooltipAnchor,
  tooltipAnchor,
} from '../helpers/round-strip';
import { RoundOutcomes } from './RoundOutcomes';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/** §9.2's dwell: a tooltip answers a pointer that stayed, never one that passed through. */
const HOVER_DWELL_MS = 400;

/** Namespaced the way `@disa/i18n` namespaces the locale it remembers. */
const SURVIVORS_KEY = 'disa.timeline.survivors';

interface Naming {
  readonly cell: RoundCell;
  readonly anchor: TooltipAnchor;
}

function namingOf(cells: readonly RoundCell[], index: number | null): Naming | undefined {
  if (index === null) return undefined;

  const cell = cells.at(index);

  return cell === undefined ? undefined : { cell, anchor: tooltipAnchor(index, cells.length) };
}

/**
 * The match as a strip of rounds — `docs/DESIGN.md` §7.3. The timeline block's **top row**, directly
 * above §7.1's axis: the reader's path is *pick a round, then watch it*, and the strip spent #157 to
 * #190 on the far side of the controls from the axis it feeds.
 *
 * Nothing here is a playhead. That is on §7.1, and this strip carries no per-frame work at all: the
 * lit round turns over once a round and rides the 10 Hz readout, and the cells are derived once per
 * demo.
 */
export function RoundStrip({ demo, transport }: Props) {
  const t = useT();

  const frame = useFrameReadout(transport);
  const litIndex = roundIndexAtFrame(demo, frame);

  const cells = useMemo(() => roundCells(demo), [demo]);

  const rowRef = useRef<HTMLDivElement>(null);
  const dwellRef = useRef(0);

  // The row's width decides whether the pills carry their numbers, so unlike a playhead offset it
  // has to reach React. It changes on a window resize and nowhere else.
  const [widthPx, setWidthPx] = useState(0);
  const [namedIndex, setNamedIndex] = useState<number | null>(null);

  // Off by default — §7.3. What is always on screen is the way to a round; the shape of the round is
  // what the reader asks for. `AGENTS.md` §2 rule 5 allows an interface preference to outlive the
  // session.
  const [isExpanded, toggleExpanded] = useStoredFlag(SURVIVORS_KEY, false);

  useEffect(() => {
    const row = rowRef.current;
    if (row === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;

      setWidthPx(entry.contentRect.width);
    });
    observer.observe(row);

    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(dwellRef.current), []);

  const seekToRound = useCallback(
    (index: number) => transport.seek(roundOpeningFrame(demo, index)),
    [demo, transport],
  );

  const point = useCallback((index: number | null) => {
    window.clearTimeout(dwellRef.current);

    if (index === null) {
      setNamedIndex(null);
      return;
    }

    dwellRef.current = window.setTimeout(() => setNamedIndex(index), HOVER_DWELL_MS);
  }, []);

  const reveal = useCallback((index: number | null) => {
    window.clearTimeout(dwellRef.current);
    setNamedIndex(index);
  }, []);

  const naming = namingOf(cells, namedIndex);

  return (
    <div
      className="relative flex shrink-0 items-stretch gap-2 px-4"
      style={{
        height: `${isExpanded ? ROUND_STRIP_EXPANDED_HEIGHT_PX : ROUND_STRIP_HEIGHT_PX}px`,
      }}
    >
      <div ref={rowRef} className="min-w-0 flex-1">
        <RoundOutcomes
          cells={cells}
          hasNumbers={hasRoomForNumbers(widthPx, cells)}
          isExpanded={isExpanded}
          litIndex={litIndex}
          onSeek={seekToRound}
          onPoint={point}
          onReveal={reveal}
        />
      </div>

      {/* The disclosure is the survivors' own control, which is why they need no bridge in the
          corner cluster the way the audibility rings do — §7.3.

          §4's dense control height, 32px, in a 28px row: the hit area overruns the strip by 2px
          either side and lands in the block's own padding, which is the right way round. Minting a
          24px height to make it fit would be a third control size, and §4 has two. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isExpanded}
        aria-label={t(isExpanded ? 'timeline.survivors.hide' : 'timeline.survivors.show')}
        onClick={toggleExpanded}
        className="shrink-0 self-center text-ink-faint hover:text-ink"
      >
        {isExpanded ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </Button>

      {naming !== undefined && (
        // Aria-hidden because the pill's own name already says all of this — §9.2 permits the
        // tooltip as a shortcut to what is reachable without a pointer, not as a second voice.
        //
        // `--glass-raised` without a blur behind it: §2.3 pays for a `backdrop-filter` only where
        // the ground is static, and §7.1's playhead is moving under this one every frame.
        <div
          aria-hidden="true"
          style={naming.anchor}
          className="pointer-events-none absolute bottom-full z-10 mb-1 flex items-baseline gap-1.5 whitespace-nowrap rounded-chip bg-glass-raised px-2 py-1 text-12 shadow-raised ring-1 ring-glass-hair"
        >
          <span className="text-ink">
            {t(roundOutcomeKey(naming.cell.reason), {
              round: naming.cell.number,
              side: naming.cell.winner,
            })}
          </span>

          {!isExpanded && (
            <span className="flex items-baseline gap-1">
              <span className="numeric text-ct">{naming.cell.survivors.CT}</span>
              <span className="text-ink-faint">:</span>
              <span className="numeric text-t">{naming.cell.survivors.T}</span>
            </span>
          )}

          <span className="numeric text-ink-dim">{naming.cell.score.startedCt}</span>
          <span className="text-ink-faint">:</span>
          <span className="numeric text-ink-dim">{naming.cell.score.startedT}</span>
        </div>
      )}
    </div>
  );
}
