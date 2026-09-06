import { Text, useT } from '@disa/i18n';
import { Button, Popover, PopoverPanel, PopoverTrigger } from '@disa/ui';
import { CircleQuestionMark } from 'lucide-react';
import { matchHistoryFolder } from '../helpers/match-history';

/**
 * Where the reader's own demos are recorded, in the card's corner rather than under the invitation.
 *
 * **It is a popover on a press and not a tooltip on a hover**, and that is the reading rather than
 * a preference: what it holds is a file path somebody is going to want to select and copy, and
 * hover content disappears the moment the pointer leaves to do it. WCAG 1.4.13 asks any such content
 * to be hoverable, persistent and dismissible; a popover is all three by construction, and it is the
 * one of the two that a keyboard and a touch screen reach the same way a pointer does. `Esc` and a
 * press outside close it, and focus returns to the trigger — Base UI's, not ours.
 *
 * The path itself is game vocabulary: one string in both locales, rendered as vocabulary rather than
 * through `<Text>`, and interpolated into a whole sentence rather than appended to a translated
 * prefix, which is grammatically impossible in Russian (`AGENTS.md` §11). It wraps rather than
 * truncating — the Windows path fits no width this popover has, and a path with its middle elided
 * names nothing.
 */
export function DemoFolderHint() {
  const t = useT();

  // Read where it is used rather than passed down: it is a constant of the device, not state.
  const folder = matchHistoryFolder({
    platform: navigator.userAgentData?.platform,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 text-ink-dim"
            aria-label={t('library.open.where')}
          >
            <CircleQuestionMark aria-hidden="true" />
          </Button>
        }
      />

      <PopoverPanel className="surface-card w-80 rounded-card border-0 p-4 text-12 text-ink-dim leading-prose shadow-none">
        {folder === null ? (
          <Text path="library.open.hint" />
        ) : (
          <Text
            path="library.open.hintFolder"
            values={{ folder: <code className="wrap-anywhere text-ink">{folder}</code> }}
          />
        )}
      </PopoverPanel>
    </Popover>
  );
}
