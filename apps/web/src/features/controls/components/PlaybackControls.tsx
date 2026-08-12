import { lastFrame, secondsAtFrame, type TickTrack } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useMemo } from 'react';
import {
  createClockFormat,
  formatElapsedOfTotal,
  type Transport,
  useFrameReadout,
  useIsPlaying,
} from '@/core/playback';
import { StepButton } from './StepButton';

interface Props {
  track: TickTrack;
  transport: Transport;
}

export function PlaybackControls({ track, transport }: Props) {
  const locale = useLocale();
  const isPlaying = useIsPlaying(transport);
  const frame = useFrameReadout(transport);

  const format = useMemo(() => createClockFormat(locale), [locale]);

  // The speed control is a sibling rather than a child: DESIGN.md §5.5 puts the timeline between
  // the two, so the block that owns the layout is what places them.
  return (
    <section className="flex shrink-0 items-center gap-3">
      <div className="flex items-center gap-1">
        <StepButton transport={transport} samples={-1} />

        <Button type="button" size="lg" onClick={transport.toggle}>
          <Text path={isPlaying ? 'controls.pause' : 'controls.play'} />
        </Button>

        <StepButton transport={transport} samples={1} />
      </div>

      <p className="numeric text-14">
        <span className="sr-only">
          <Text path="controls.matchTime" />
        </span>
        {formatElapsedOfTotal(
          format,
          secondsAtFrame(track, frame),
          secondsAtFrame(track, lastFrame(track)),
        )}
      </p>
    </section>
  );
}
