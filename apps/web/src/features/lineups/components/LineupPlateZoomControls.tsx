import { useT } from '@disa/i18n';
import { Minus, Plus } from 'lucide-react';
import { ZOOM_STEP } from '@/features/radar/helpers/view';

export function LineupPlateZoomControls({
  zoom,
  onZoomChange,
}: {
  readonly zoom: number;
  readonly onZoomChange: (factor: number) => void;
}) {
  const t = useT();

  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-card border border-line bg-surface-0/90 p-1">
      <button
        type="button"
        onClick={() => onZoomChange(1 / ZOOM_STEP)}
        disabled={zoom <= 1}
        aria-label={t('library.lineups.zoomOut')}
        className="rounded-chip p-1.5 text-ink disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="numeric min-w-10 text-center text-11 text-ink">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => onZoomChange(ZOOM_STEP)}
        disabled={zoom >= 4}
        aria-label={t('library.lineups.zoomIn')}
        className="rounded-chip p-1.5 text-ink disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
