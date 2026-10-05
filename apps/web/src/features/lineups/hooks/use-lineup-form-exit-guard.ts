import { useEffect, useState } from 'react';

export function useLineupFormExitGuard({
  isOpen,
  isDirty,
  onDismiss,
}: {
  readonly isOpen: boolean;
  readonly isDirty: boolean;
  readonly onDismiss: () => void;
}) {
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!isOpen || !isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isOpen, isDirty]);

  return {
    /** Leaving with unsaved changes asks first; leaving clean just leaves. */
    handleExit: () => {
      if (isDirty) setIsAsking(true);
      else onDismiss();
    },
    isAsking,
    keepEditing: () => setIsAsking(false),
    discard: () => {
      setIsAsking(false);
      onDismiss();
    },
  };
}
