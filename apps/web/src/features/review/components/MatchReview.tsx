import type { ParsedDemo } from '@disa/demo-core';
import { useTransport } from '@/core/playback';
import { PlaybackControls } from '@/features/controls';
import { MatchRadar } from '@/features/radar';

interface Props {
  demo: ParsedDemo;
}

/** The workspace the match is reviewed in. It owns the transport every panel below reads from. */
export function MatchReview({ demo }: Props) {
  const transport = useTransport(demo);

  return (
    <div className="flex flex-col gap-4">
      <MatchRadar demo={demo} transport={transport} />
      <PlaybackControls track={demo.track} transport={transport} />
    </div>
  );
}
