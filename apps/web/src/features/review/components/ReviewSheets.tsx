import type { ParsedDemo } from '@disa/demo-core';
import { MatchOverlay } from '@/features/timeline';
import type { Sheet } from '../hooks/use-review-sheets';
import { HelpSheet } from './HelpSheet';
import { SettingsSheet } from './SettingsSheet';

interface Props {
  demo: ParsedDemo;
  openSheet: Sheet | null;
  roundIndex: number | undefined;
  onDismiss: () => void;
}

/**
 * Everything that can cover the stage, in one place. All three live in the top layer, so where they
 * sit in the stage's grid decides nothing about where they paint — they are rendered last because
 * that is the reading order a reader who never opens one gets from the DOM.
 */
export function ReviewSheets({ demo, openSheet, roundIndex, onDismiss }: Props) {
  return (
    <>
      <SettingsSheet isOpen={openSheet === 'settings'} onDismiss={onDismiss} />

      <HelpSheet isOpen={openSheet === 'help'} onDismiss={onDismiss} />

      <MatchOverlay
        demo={demo}
        isOpen={openSheet === 'match'}
        onDismiss={onDismiss}
        roundIndex={roundIndex}
      />
    </>
  );
}
