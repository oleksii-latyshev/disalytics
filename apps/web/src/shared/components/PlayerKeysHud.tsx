import { type ParsedDemo, type PlayerSlot, playerButtonsAt, playerSpeedAt } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';

export interface PlayerKeysHudProps {
  demo: ParsedDemo;
  frame: number;
  slot: PlayerSlot;
  className?: string;
  showSpeed?: boolean;
}

function keyStyle(isActive: boolean, extraClasses = ''): string {
  return cn(
    'flex items-center justify-center select-none font-mono uppercase transition-colors duration-(--duration-micro)',
    'rounded-xs border border-line/60',
    isActive
      ? 'bg-ink text-surface-0 font-semibold border-ink shadow-xs'
      : 'bg-surface-2/40 text-ink-faint',
    extraClasses,
  );
}

/**
 * Visual key HUD showing pressed movement and action buttons for a player.
 * Polled on the 10 Hz readout channel rather than per frame (AGENTS.md §8).
 */
export function PlayerKeysHud({
  demo,
  frame,
  slot,
  className,
  showSpeed = true,
}: PlayerKeysHudProps) {
  const t = useT();
  const buttons = playerButtonsAt(demo, frame, slot);
  const speed = playerSpeedAt(demo.track, frame, slot);

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <span className="sr-only">{t('review.player.inputs.title')}</span>
      {/* Mouse buttons */}
      <div className="flex items-center gap-1">
        <span className={keyStyle(buttons.attack, 'h-5 px-2 text-10')}>
          {t('review.player.inputs.lmb')}
        </span>
        <span className={keyStyle(buttons.attack2, 'h-5 px-2 text-10')}>
          {t('review.player.inputs.rmb')}
        </span>
      </div>

      {/* WASD cluster */}
      <div className="flex flex-col items-center gap-1">
        <span className={keyStyle(buttons.forward, 'size-6 text-11')}>W</span>
        <div className="flex items-center gap-1">
          <span className={keyStyle(buttons.left, 'size-6 text-11')}>A</span>
          <span className={keyStyle(buttons.back, 'size-6 text-11')}>S</span>
          <span className={keyStyle(buttons.right, 'size-6 text-11')}>D</span>
        </div>
      </div>

      {/* Actions: Ctrl, Space, Shift */}
      <div className="flex items-center gap-1">
        <span className={keyStyle(buttons.duck, 'h-5 px-1.5 text-10')}>
          {t('review.player.inputs.duck')}
        </span>
        <span className={keyStyle(buttons.jump, 'h-5 min-w-10 px-2 text-10')}>
          {t('review.player.inputs.jump')}
        </span>
        <span className={keyStyle(buttons.walk, 'h-5 px-1.5 text-10')}>
          {t('review.player.inputs.walk')}
        </span>
      </div>

      {/* Live Speed */}
      {showSpeed && (
        <div className="numeric text-11 text-ink-dim">
          {t('review.player.inputs.speed', { speed })}
        </div>
      )}
    </div>
  );
}
