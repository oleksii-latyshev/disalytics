import { useEffect } from 'react';
import { coachKeyIntent } from '../helpers/coach-keys';
import type { CoachSession } from '../helpers/coach-session';

const TEXT_ENTRY = 'textarea, select, [contenteditable="true"], input:not([type="range"])';

function isTyping(event: KeyboardEvent): boolean {
  return event.target instanceof Element && event.target.matches(TEXT_ENTRY);
}

export function useCoachKeys(session: CoachSession, isSuspended: boolean): void {
  useEffect(() => {
    if (isSuspended) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (session.getState().tool === null || event.defaultPrevented || isTyping(event)) return;

      const intent = coachKeyIntent(event);
      if (intent === null) return;

      event.preventDefault();
      if (intent === 'redo') session.redo();
      else session.undo();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [session, isSuspended]);
}
