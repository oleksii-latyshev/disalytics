import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
// Named imports rather than the per-icon deep paths DESIGN.md §11 asks for: `lucide-react` ships
// ESM with `sideEffects: false` and no `exports` map, so the deep files carry no declarations and
// the barrel tree-shakes to the same five icons. `bun run size` is what holds this to its word.
import { CircleQuestionMark, Ear, Maximize, Minimize, Settings, X } from 'lucide-react';

interface Props {
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  isAudibilityShown: boolean;
  onAudibilityToggle: () => void;
  onClose: () => void;
}

/**
 * The corner cluster — DESIGN.md §5.4. It sits at `--ink-faint` and rises to `--ink` on hover or
 * focus, and the whole strip lifts when the pointer enters the stage's top-right quadrant (§9.3).
 * The hot corner is an **accelerator only**: every button here is reachable by `Tab` from anywhere,
 * because a control that needs a pointer to appear has no keyboard at all.
 *
 * §5.4 names three buttons and this carries five. Deleting the top bar deleted the only route out
 * of a demo and the only audibility toggle, and the settings sheet that absorbs the second one is
 * §15's last step. **The two extras leave when that sheet arrives** — they are a bridge, not a
 * reading of the document. Settings and help are disabled for the same reason: they have nowhere
 * to go yet, and a control that looks live and answers nothing is worse than one that says so.
 */
export function CornerCluster({
  isFullscreen,
  onFullscreenToggle,
  isAudibilityShown,
  onAudibilityToggle,
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
