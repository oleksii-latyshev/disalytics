import { type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Transport, useFrameReadout } from '@/core/playback';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import {
  cellDetail,
  ROUND_LIST_HEIGHT_PX,
  type RoundCell,
  roundCells,
  type TooltipAnchor,
  tooltipAnchor,
} from '../helpers/round-list';
import { RoundOutcomes } from './RoundOutcomes';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/** §9.2's dwell: a tooltip answers a pointer that stayed, never one that passed through. */
const HOVER_DWELL_MS = 400;

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
 * The match as a list of rounds — `docs/DESIGN.md` §7.3. It replaces the 14px ribbon, whose bands
 * were a map of match time and whose density trace and economy gap were a chart nobody was reading
 * while scrubbing. Both keep their code and follow the chart into the match overlay; what is always
 * on screen is the way to a round.
 *
 * Nothing here is a playhead. That is on §7.1's round timeline above, where it belongs, and this
 * strip carries no per-frame work at all: the lit round turns over once a round and rides the 10 Hz
 * readout, and the cells are derived once per demo.
 */
export function RoundList({ demo, transport }: Props) {
  const t = useT();

  const frame = useFrameReadout(transport);
  const litIndex = roundIndexAtFrame(demo, frame);

  const cells = useMemo(() => roundCells(demo), [demo]);

  const stripRef = useRef<HTMLDivElement>(null);
  const dwellRef = useRef(0);

  // The strip's width decides which of §7.3's three rows every cell renders, so unlike a playhead
  // offset it has to reach React. It changes on a window resize and nowhere else.
  const [widthPx, setWidthPx] = useState(0);
  const [namedIndex, setNamedIndex] = useState<number | null>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (strip === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;

      setWidthPx(entry.contentRect.width);
    });
    observer.observe(strip);

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
      ref={stripRef}
      className="relative shrink-0"
      style={{ height: `${ROUND_LIST_HEIGHT_PX}px` }}
    >
      <RoundOutcomes
        cells={cells}
        detail={cellDetail(widthPx, cells.length)}
        litIndex={litIndex}
        onSeek={seekToRound}
        onPoint={point}
        onReveal={reveal}
      />

      {naming !== undefined && (
        // Aria-hidden because the cell's own name already says all of this — §9.2 permits the
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

          <span className="numeric text-ink-dim">{naming.cell.score.startedCt}</span>
          <span className="text-ink-faint">:</span>
          <span className="numeric text-ink-dim">{naming.cell.score.startedT}</span>
        </div>
      )}
    </div>
  );
}
