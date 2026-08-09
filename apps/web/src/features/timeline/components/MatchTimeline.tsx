import type { ParsedDemo } from '@disa/demo-core';
import { type Transport, useFrameReadout } from '@/core/playback';
import { MatchSpine } from './MatchSpine';
import { RoundPicker } from './RoundPicker';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

export function MatchTimeline({ demo, transport }: Props) {
  // One readout for the whole spine: the playhead moves per frame through the DOM, and everything
  // read as text moves at 10 Hz — AGENTS.md §8.
  const frame = useFrameReadout(transport);

  return (
    <section className="flex flex-col gap-3">
      <MatchSpine demo={demo} transport={transport} frame={frame} />
      <RoundPicker demo={demo} transport={transport} frame={frame} />
    </section>
  );
}
