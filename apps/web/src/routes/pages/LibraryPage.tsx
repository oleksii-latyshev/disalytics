import { useNavigate } from '@tanstack/react-router';
import { afterRouteNavigation } from '@/core/navigation';
import { LibraryView } from '@/features/library';
import { useAppRouteContext } from '../context';

export function LibraryPage() {
  const { parse, parseOrigin } = useAppRouteContext();
  const navigate = useNavigate();

  return (
    <LibraryView
      onEnter={(saved, roundIndex) => {
        void afterRouteNavigation(
          () => navigate({ to: '/' }),
          () => {
            parseOrigin.current = '/';
            parse.openSaved(saved, roundIndex);
          },
        );
      }}
      onSample={(sample) => {
        void afterRouteNavigation(
          () => navigate({ to: '/' }),
          () => {
            parseOrigin.current = '/';
            parse.openSample(sample);
          },
        );
      }}
    />
  );
}
