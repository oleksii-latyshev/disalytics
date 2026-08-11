import type { ParsedDemo } from '@disa/demo-core';
import type { Transport } from '@/core/playback';
import { PlaybackControls } from '@/features/controls';
import { RoundPicker } from '@/features/timeline';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/**
 * The transport floats over the bottom of the stage rather than taking a row of its own —
 * DESIGN.md §5, and the 96px it gives back is what the radar grows into. Glass and `--radius-float`
 * because it floats; 56px tall around a 36px primary control, which are §4's only two heights.
 *
 * The wrapper is inert so the plate under it stays reachable everywhere the bar itself is not.
 */
export function FloatingTransport({ demo, transport }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
      <div className="pointer-events-auto flex h-14 max-w-full items-center gap-4 overflow-x-auto rounded-float border border-line bg-glass-panel px-4 shadow-raised">
        <PlaybackControls track={demo.track} transport={transport} />
        <RoundPicker demo={demo} transport={transport} />
      </div>
    </div>
  );
}
