import { type ParsedDemo, roundIndexAtFrame, sideScoreAtFrame } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { type Transport, useFrameReadout } from '@/core/playback';
import { Button } from '@/shared/components/ui/button';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  fileName: string;
  onClose: () => void;
}

function RoundReadout({ demo, frame }: { demo: ParsedDemo; frame: number }) {
  const { rounds } = demo.events;
  const roundIndex = roundIndexAtFrame(demo, frame);
  const round = roundIndex === undefined ? undefined : rounds.at(roundIndex);

  if (round === undefined) {
    return (
      <span className="text-14">
        <Text path="review.warmup" />
      </span>
    );
  }

  return (
    <span className="numeric text-14">
      <Text path="review.roundOfTotal" values={{ current: round.number, total: rounds.length }} />
    </span>
  );
}

export function MatchStrip({ demo, transport, fileName, onClose }: Props) {
  // Everything here is read as text, so it moves at the 10 Hz readout rather than with the clock —
  // AGENTS.md §8.
  const frame = useFrameReadout(transport);
  const score = sideScoreAtFrame(demo, frame);

  return (
    <header className="col-span-2 flex h-12 items-center gap-6 border-line border-b bg-surface-1 px-4 shadow-raised">
      <p className="flex items-baseline gap-2">
        <span className="label-dense">
          <Text path="review.map" />
        </span>
        <span className="text-14">{demo.header.map}</span>
      </p>

      <p className="flex items-baseline gap-2">
        <span className="label-dense">
          <Text path="review.score" />
        </span>
        <span className="font-narrow text-ct">CT</span>
        <span className="numeric text-16">{score.CT}</span>
        <span className="text-14 text-ink-faint">:</span>
        <span className="numeric text-16">{score.T}</span>
        <span className="font-narrow text-t">T</span>
      </p>

      <RoundReadout demo={demo} frame={frame} />

      <p className="numeric ms-auto min-w-0 truncate text-12 text-ink-faint" title={fileName}>
        {fileName}
      </p>

      <Button type="button" variant="outline" size="xs" onClick={onClose}>
        <Text path="review.close" />
      </Button>
    </header>
  );
}
