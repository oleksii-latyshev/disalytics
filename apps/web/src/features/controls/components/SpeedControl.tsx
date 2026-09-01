import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { type Transport, usePlaybackScrub, usePlaybackSpeed } from '@/core/playback';
import { PLAYBACK_SPEEDS } from '../constants/speeds';

interface Props {
  transport: Transport;
}

export function SpeedControl({ transport }: Props) {
  const t = useT();
  const speed = usePlaybackSpeed(transport);
  const scrub = usePlaybackScrub(transport);

  // The pressed entry stays on the speed the reader *chose* — a held arrow is a
  // rate the transport owns for as long as the key is down, and a temporary rate that lit a button
  // here would read as a setting nobody changed. The mark keeps its box while nothing is held, or
  // the row would move under the pointer at the moment the reader starts scrubbing.
  return (
    <div className="flex items-center gap-2">
      <fieldset aria-label={t('controls.speed')} className="flex gap-1">
        {PLAYBACK_SPEEDS.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === speed ? 'secondary' : 'outline'}
            aria-pressed={option === speed}
            onClick={() => transport.setSpeed(option)}
          >
            <Text path="controls.speedValue" values={{ speed: option }} />
          </Button>
        ))}
      </fieldset>

      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-ink"
      >
        {scrub !== null &&
          (scrub < 0 ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />)}
      </span>
    </div>
  );
}
