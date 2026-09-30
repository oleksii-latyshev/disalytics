import { useT } from '@disa/i18n';

export function useLineupImport(
  importLineups: (file: File) => Promise<number>,
  setNotice: (notice: string | null) => void,
) {
  const t = useT();

  return async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const count = await importLineups(file);
      setNotice(t('library.lineups.importSuccess', { count }));
    } catch {
      setNotice(t('library.lineups.importError'));
    } finally {
      event.target.value = '';
    }
  };
}
