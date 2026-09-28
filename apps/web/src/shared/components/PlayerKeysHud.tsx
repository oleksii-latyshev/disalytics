import {
  type ParsedDemo,
  type PlayerButtons,
  type PlayerMovementAccuracy,
  type PlayerSlot,
  playerButtonsAt,
  playerMovementAccuracy,
  playerPitchAt,
  playerSpeedAt,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';

export interface PlayerKeysHudProps {
  demo: ParsedDemo;
  frame: number;
  slot: PlayerSlot;
  className?: string;
  showKeys?: boolean;
  showAccuracy?: boolean;
  showCrosshair?: boolean;
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

function KeysCluster({
  buttons,
  showSpeed,
  speed,
}: {
  buttons: PlayerButtons;
  showSpeed: boolean;
  speed: number;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-1.5">
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

      {showSpeed && (
        <div className="numeric text-11 text-ink-dim">
          {t('review.player.inputs.speed', { speed })}
        </div>
      )}
    </div>
  );
}

function AccuracyMeter({ accuracy }: { accuracy: PlayerMovementAccuracy }) {
  const t = useT();
  const thresholdPercent = Math.round((accuracy.accuracyThreshold / accuracy.maxSpeed) * 100);
  const ratioPercent = Math.round(accuracy.ratio * 100);

  return (
    <div className="flex w-full max-w-[10rem] flex-col gap-1 [border-block-start:1px_solid_var(--color-line)] pt-1.5">
      <div className="flex items-center justify-between text-10 font-mono">
        <span
          className={cn(
            'rounded-xs px-1 font-semibold uppercase',
            accuracy.isAccurate ? 'bg-heat-low/15 text-heat-low' : 'bg-damage/15 text-damage',
          )}
        >
          {t(
            accuracy.isAccurate
              ? 'review.player.inputs.accurate'
              : 'review.player.inputs.inaccurate',
          )}
        </span>
        <span className="numeric text-ink-dim">
          {t('review.player.inputs.speedMeter', {
            speed: accuracy.speed,
            max: accuracy.maxSpeed,
          })}
        </span>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-xs border border-line/40 bg-surface-2">
        <div
          className={cn(
            'h-full transition-all duration-(--duration-micro)',
            accuracy.isAccurate ? 'bg-heat-low' : 'bg-damage',
          )}
          style={{ width: `${ratioPercent}%` }}
        />
        <span
          className="absolute inset-y-0 w-px bg-ink/60"
          style={{ left: `${thresholdPercent}%` }}
        />
      </div>
    </div>
  );
}

function CrosshairGauge({ pitch }: { pitch: number }) {
  const t = useT();
  const isPitchLevel = Math.abs(pitch) <= 3.0;
  const isPitchUp = pitch < -3.0;
  const pitchPosPercent = Math.min(Math.max(50 + (pitch / 90) * 50, 0), 100);
  const formattedDegrees = pitch >= 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1);

  return (
    <div className="flex w-full max-w-[10rem] flex-col gap-1 [border-block-start:1px_solid_var(--color-line)] pt-1.5">
      <div className="flex items-center justify-between text-10 font-mono">
        <span className="text-ink-dim">{t('review.player.inputs.pitchTitle')}</span>
        <span className={cn('numeric font-medium', isPitchLevel ? 'text-heat-low' : 'text-ink')}>
          {t('review.player.inputs.pitchDegrees', { degrees: formattedDegrees })}{' '}
          <span className="text-ink-faint">
            (
            {t(
              isPitchLevel
                ? 'review.player.inputs.pitchLevel'
                : isPitchUp
                  ? 'review.player.inputs.pitchUp'
                  : 'review.player.inputs.pitchDown',
            )}
            )
          </span>
        </span>
      </div>

      <div className="relative flex h-2 w-full items-center overflow-hidden rounded-xs border border-line/40 bg-surface-2">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/40" />
        <span
          className={cn(
            'absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-xs',
            isPitchLevel ? 'bg-heat-low' : 'bg-ink',
          )}
          style={{ left: `${pitchPosPercent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Visual spectator HUD showing pressed keys, counter-strafing accuracy, and crosshair pitch.
 * Polled on the 10 Hz readout channel rather than per frame (AGENTS.md §8).
 */
export function PlayerKeysHud({
  demo,
  frame,
  slot,
  className,
  showKeys = true,
  showAccuracy = true,
  showCrosshair = true,
}: PlayerKeysHudProps) {
  const t = useT();

  if (!showKeys && !showAccuracy && !showCrosshair) {
    return null;
  }

  const buttons = showKeys ? playerButtonsAt(demo, frame, slot) : null;
  const accuracy = showAccuracy ? playerMovementAccuracy(demo, frame, slot) : null;
  const pitch = showCrosshair ? playerPitchAt(demo.track, frame, slot) : 0;
  const speed = playerSpeedAt(demo.track, frame, slot);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <span className="sr-only">{t('review.player.inputs.title')}</span>
      {buttons !== null && (
        <KeysCluster buttons={buttons} showSpeed={!showAccuracy} speed={speed} />
      )}
      {accuracy !== null && <AccuracyMeter accuracy={accuracy} />}
      {showCrosshair && <CrosshairGauge pitch={pitch} />}
    </div>
  );
}
