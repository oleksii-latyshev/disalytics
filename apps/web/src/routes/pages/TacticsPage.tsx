import { decodeTacticFromHash } from '@disa/demo-core';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { TacticsView } from '@/features/tactics';

export function TacticsPage() {
  const navigate = useNavigate({ from: '/tactics' });
  const hash = useRouterState({ select: (state) => state.location.hash });

  return (
    <TacticsView
      initialTactic={decodeTacticFromHash(hash)}
      onClearInitialTactic={() => void navigate({ hash: '', replace: true })}
    />
  );
}
