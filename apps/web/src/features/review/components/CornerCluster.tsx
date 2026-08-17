import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
// Named imports rather than the per-icon deep paths DESIGN.md §11 asks for: `lucide-react` ships
// ESM with `sideEffects: false` and no `exports` map, so the deep files carry no declarations and
// the barrel tree-shakes to the icons named here. `bun run size` is what holds this to its word.
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CircleQuestionMark,
  Ear,
  Maximize,
  Minimize,
  Settings,
  X,
} from 'lucide-react';

interface Props {
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  isAudibilityShown: boolean;
  onAudibilityToggle: () => void;
  isScoreboardOnPlate: boolean;
  onScoreboardPositionToggle: () => void;
  onClose: () => void;
}

/**
 * The corner cluster — DESIGN.md §5.4. It sits at `--ink-faint` and rises to `--ink` on hover or
 * focus, and the whole strip lifts when the pointer enters the stage's top-right quadrant (§9.3).
 * The hot corner is an **accelerator only**: every button here is reachable by `Tab` from anywhere,
 * because a control that needs a pointer to appear has no keyboard at all.
 *
 * §5.4 names three buttons and this carries six. Deleting the top bar deleted the only route out of
 * a demo and the only audibility toggle, and §10.5's scoreboard position joined them when the brow
 * became the default. **All three extras leave when the settings sheet arrives** — §5.4 permits a
 * control to bridge here only while §10.5's table already names it, which is true of every one of
 * them. Settings and help are disabled for the same reason: they have nowhere to go yet, and a
 * control that looks live and answers nothing is worse than one that says so.
 */
export function CornerCluster({
  isFullscreen,
  onFullscreenToggle,
  isAudibilityShown,
  onAudibilityToggle,
  isScoreboardOnPlate,
  onScoreboardPositionToggle,
  onClose,
}: Props) {
  const t = useT();

  return (
    <div className="glass-panel flex items-center gap-1 rounded-float p-1 text-ink-faint transition-colors duration-micro ease-out focus-within:text-ink hover:text-ink">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t(isFullscreen ? 'review.fullscreen.exit' : 'review.fullscreen.enter')}
        onClick={onFullscreenToggle}
      >
        {isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
      </Button>

      {/* A toggle rather than a pair of states: the plate under it says which way it is set, and
          the pressed fill is `--selected`, which is §2.6's "interaction is luminance, not hue". */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isAudibilityShown}
        aria-label={t(isAudibilityShown ? 'radar.audibility.hide' : 'radar.audibility.show')}
        onClick={onAudibilityToggle}
        className="aria-pressed:bg-selected aria-pressed:text-ink"
      >
        <Ear aria-hidden="true" />
      </Button>

      {/* The icon is the move rather than the state: pressed means the score is over the plate, and
          the arrow points at where pressing would send it next. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isScoreboardOnPlate}
        aria-label={t(
          isScoreboardOnPlate
            ? 'review.scoreboardPosition.toBlock'
            : 'review.scoreboardPosition.toPlate',
        )}
        onClick={onScoreboardPositionToggle}
        className="aria-pressed:bg-selected aria-pressed:text-ink"
      >
        {isScoreboardOnPlate ? (
          <ArrowDownToLine aria-hidden="true" />
        ) : (
          <ArrowUpToLine aria-hidden="true" />
        )}
      </Button>

      <Button type="button" variant="ghost" size="icon" disabled aria-label={t('review.settings')}>
        <Settings aria-hidden="true" />
      </Button>

      <Button type="button" variant="ghost" size="icon" disabled aria-label={t('review.help')}>
        <CircleQuestionMark aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('review.close')}
        onClick={onClose}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
