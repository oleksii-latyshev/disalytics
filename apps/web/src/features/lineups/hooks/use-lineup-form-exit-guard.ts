import { useT } from '@disa/i18n';
import { useEffect } from 'react';

export function useLineupFormExitGuard({
  isOpen,
  isDirty,
  onDismiss,
}: {
  readonly isOpen: boolean;
  readonly isDirty: boolean;
  readonly onDismiss: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (!isOpen || !isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isOpen, isDirty]);

  return () => {
    if (!isDirty || window.confirm(t('library.lineups.form.discardConfirm'))) onDismiss();
  };
}
