import { decodeTacticFromHash } from '@disa/demo-core';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { TACTIC_READ_OPTIONS, TacticsView } from '@/features/tactics';

export function TacticsPage() {
  const navigate = useNavigate({ from: '/tactics' });
  const hash = useRouterState({ select: (state) => state.location.hash });

  return (
    <TacticsView
      initialTactic={decodeTacticFromHash(hash, TACTIC_READ_OPTIONS)}
      onClearInitialTactic={() => void navigate({ hash: '', replace: true })}
    />
  );
}
