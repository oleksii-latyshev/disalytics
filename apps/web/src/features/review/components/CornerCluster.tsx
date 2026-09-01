import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
// Named imports rather than the per-icon deep paths DESIGN.md §11 asks for: `lucide-react` ships
// ESM with `sideEffects: false` and no `exports` map, so the deep files carry no declarations and
// the barrel tree-shakes to the icons named here. `bun run size` is what holds this to its word.
import { CircleQuestionMark, Maximize, Minimize, Settings } from 'lucide-react';

interface Props {
  /** Whether §9.3's top-right region has the pointer in it. */
  isRaised: boolean;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
}

/**
 * The corner cluster — DESIGN.md §5.4: **fullscreen, settings, help**, and nothing else. It sits at
 * `--ink-faint` and rises to `--ink` on hover or focus, and the whole strip lifts when the pointer
 * enters the stage's top-right quadrant (§9.3). The hot corner is an **accelerator only**: every
 * button here is reachable by `Tab` from anywhere, because a control that needs a pointer to appear
 * has no keyboard at all.
 *
 * **The corner is the same fade as the hover, reached from further away.** `hover` and
 * `focus-within` are still the two that answer a reader who went straight for a button; the region
 * is what answers the one who has not decided yet, and all three end on the same `--ink`. Colour is
 * the property §5.4 names, and it neither triggers layout nor runs on the frame channel — the block
 * below, which does move, moves by `transform` alone.
 *
 * It carried seven for four PRs (#147, #196, #199), because deleting the top bar deleted the only
 * route out of a demo and the only audibility toggle, and §10.5's settings sheet did not exist to
 * take them. #151 is the other half of that trade: the three settings moved into the sheet, leaving
 * a demo moved to the sheet's foot — §5.4 admits a control here only while §10.5's table names it,
 * and leaving a match is not a setting — and no button on this strip is `disabled` any more.
 */
export function CornerCluster({
  isRaised,
  isFullscreen,
  onFullscreenToggle,
  onSettingsOpen,
  onHelpOpen,
}: Props) {
  const t = useT();

  return (
    <div
      className={`surface-card flex items-center gap-1 rounded-float p-1 transition-colors duration-(--duration-micro) ease-out focus-within:text-ink hover:text-ink ${
        isRaised ? 'text-ink' : 'text-ink-faint'
      }`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t(isFullscreen ? 'review.fullscreen.exit' : 'review.fullscreen.enter')}
        onClick={onFullscreenToggle}
      >
        {isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.settings')}
        onClick={onSettingsOpen}
      >
        <Settings aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.help')}
        onClick={onHelpOpen}
      >
        <CircleQuestionMark aria-hidden="true" />
      </Button>
    </div>
  );
}
