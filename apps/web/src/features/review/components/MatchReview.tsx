import {
  type ParsedDemo,
  playersOnSide,
  roundIndexAtFrame,
  roundOpeningFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useCallback, useMemo, useState } from 'react';
import type { CacheState } from '@/core/parsing';
import { useFrameReadout, useTransport } from '@/core/playback';
import { useShortcuts } from '@/core/shortcuts';
import { InspectorDrawer } from '@/features/inspector';
import { MatchRadar } from '@/features/radar';
import { MatchSpine } from '@/features/timeline';
import { FloatingTransport } from './FloatingTransport';
import { PlayerRail } from './PlayerRail';
import { TopBar } from './TopBar';

interface Props {
  demo: ParsedDemo;
  fileName: string;
  cache: CacheState;
  onClose: () => void;
}

/** The workspace the match is reviewed in. It owns the transport every panel below reads from. */
export function MatchReview({ demo, fileName, cache, onClose }: Props) {
  const transport = useTransport(demo);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Which side a slot holds changes at halftime, so the rails follow the round rather than the
  // end-of-match roster — and off the 10 Hz readout, because a roster is text.
  const frame = useFrameReadout(transport);
  const roundIndex = roundIndexAtFrame(demo, frame);
  const sides = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const ct = useMemo(() => playersOnSide(demo.header.players, sides, 'CT'), [demo, sides]);
  const t = useMemo(() => playersOnSide(demo.header.players, sides, 'T'), [demo, sides]);

  const jumpRounds = useCallback(
    (rounds: number) => {
      const current = roundIndexAtFrame(demo, transport.clock.frame);
      const wanted = current === undefined ? 0 : current + rounds;
      const last = demo.events.rounds.length - 1;

      transport.seek(roundOpeningFrame(demo, Math.max(Math.min(wanted, last), 0)));
    },
    [demo, transport],
  );

  // DESIGN.md §9's accessibility floor: the match is operable without a pointer.
  useShortcuts({
    ' ': transport.toggle,
    ',': () => transport.step(-1),
    '.': () => transport.step(1),
    '[': () => jumpRounds(-1),
    ']': () => jumpRounds(1),
  });

  // DESIGN.md §5's layout, and the grid areas are written out rather than left to auto-placement
  // because the rails move from beside the stage to a strip under it. The rail wrapper is
  // `display: contents` above the breakpoint, which is what lets one pair of rails be a flex strip
  // in one layout and two grid columns in the other.
  //
  // The stage cell carries no padding at all: `min(100cqi,100cqb)` spends every pixel of it on the
  // map, and the transport floats over the result instead of taking a row.
  return (
    <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] wide:grid-cols-[minmax(min-content,14rem)_minmax(0,1fr)_minmax(min-content,14rem)] wide:grid-rows-[auto_minmax(0,1fr)_auto]">
      <div className="[grid-area:1/1/2/-1]">
        <TopBar
          demo={demo}
          transport={transport}
          isInspectorOpen={isInspectorOpen}
          onInspectorToggle={() => setIsInspectorOpen(!isInspectorOpen)}
          onClose={onClose}
        />
      </div>

      <div className="flex gap-px [grid-area:3/1/4/-1] wide:contents">
        <div className="flex min-w-0 flex-1 wide:[grid-area:2/1/3/2]">
          <PlayerRail side="CT" players={ct} />
        </div>

        <div className="flex min-w-0 flex-1 wide:[grid-area:2/3/3/4]">
          <PlayerRail side="T" players={t} />
        </div>
      </div>

      <div className="relative grid min-h-0 min-w-0 [grid-area:2/1/3/-1] wide:[grid-area:2/2/3/3]">
        <MatchRadar demo={demo} transport={transport} />
        <FloatingTransport demo={demo} transport={transport} />
      </div>

      {isInspectorOpen && (
        <div className="z-10 grid w-[min(28rem,40%)] justify-self-end [grid-area:2/1/3/-1]">
          <InspectorDrawer
            cache={cache}
            fileName={fileName}
            onClose={() => setIsInspectorOpen(false)}
          />
        </div>
      )}

      <div className="[grid-area:4/1/5/-1] wide:[grid-area:3/1/4/-1]">
        <MatchSpine demo={demo} transport={transport} />
      </div>
    </div>
  );
}
