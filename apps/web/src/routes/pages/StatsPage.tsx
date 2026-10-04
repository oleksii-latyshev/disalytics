import { useRouterState } from '@tanstack/react-router';
import { StatsView } from '@/features/library';
import { useAppRouteContext } from '../context';

export function StatsPage() {
  const { parse, parseOrigin } = useAppRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <StatsView
      onEnter={(saved, roundIndex) => {
        parseOrigin.current = pathname;
        parse.openSaved(saved, roundIndex);
      }}
    />
  );
}
