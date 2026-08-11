import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { type Transport, usePlaybackSpeed } from '@/core/playback';
import { PLAYBACK_SPEEDS } from '../constants/speeds';

interface Props {
  transport: Transport;
}

export function SpeedControl({ transport }: Props) {
  const t = useT();
  const speed = usePlaybackSpeed(transport);

  return (
    <fieldset aria-label={t('controls.speed')} className="flex gap-1">
      {PLAYBACK_SPEEDS.map((option) => (
        <Button
          key={option}
          type="button"
          variant={option === speed ? 'default' : 'outline'}
          aria-pressed={option === speed}
          onClick={() => transport.setSpeed(option)}
        >
          <Text path="controls.speedValue" values={{ speed: option }} />
        </Button>
      ))}
    </fieldset>
  );
}
