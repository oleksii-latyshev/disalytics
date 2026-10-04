import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Minus, Plus } from 'lucide-react';

export interface TacticZoomControlsProps {
  readonly zoom: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
}

/** The `−`, the zoom level and the `+`, floating over the plate's corner. */
export function TacticZoomControls({
  zoom,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: TacticZoomControlsProps) {
  const t = useT();

  return (
    <div className="absolute right-2.5 bottom-2.5 flex items-center gap-0.5 rounded-card border border-line bg-surface-0/85 p-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label={t('library.tactics.zoom.out')}
        title={t('library.tactics.zoom.out')}
      >
        <Minus />
      </Button>
      <span className="min-w-10 text-center font-mono text-12 text-ink-dim tabular-nums">
        {t('library.tactics.zoom.level', { zoom })}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label={t('library.tactics.zoom.in')}
        title={t('library.tactics.zoom.in')}
      >
        <Plus />
      </Button>
    </div>
  );
}
