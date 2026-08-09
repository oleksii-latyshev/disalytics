import { useT } from '@disa/i18n';
import type { Transport } from '@/core/playback';
import { Button } from '@/shared/components/ui/button';

interface Props {
  transport: Transport;
  samples: number;
}

export function StepButton({ transport, samples }: Props) {
  const t = useT();
  const isBack = samples < 0;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={t(isBack ? 'controls.stepBack' : 'controls.stepForward')}
      onClick={() => transport.step(samples)}
    >
      <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <path d={isBack ? 'M7 1 L3 5 L7 9 Z' : 'M3 1 L7 5 L3 9 Z'} fill="currentColor" />
      </svg>
    </Button>
  );
}
