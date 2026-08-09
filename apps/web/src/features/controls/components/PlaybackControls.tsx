import { lastFrame, secondsAtFrame, type TickTrack } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { useMemo } from 'react';
import {
  createClockFormat,
  formatElapsedOfTotal,
  type Transport,
  useFrameReadout,
  useIsPlaying,
} from '@/core/playback';
import { Button } from '@/shared/components/ui/button';
import { SpeedControl } from './SpeedControl';
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

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-instrument border border-line bg-surface-1 p-4">
      <div className="flex items-center gap-1">
        <StepButton transport={transport} samples={-1} />

        <Button type="button" size="sm" onClick={transport.toggle}>
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

      <SpeedControl transport={transport} />
    </section>
  );
}
