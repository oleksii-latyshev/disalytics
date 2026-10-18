import { decodeTacticFromHash } from '@disa/demo-core';
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import { TACTIC_READ_OPTIONS, TacticsView } from '@/features/tactics';

export function TacticsPage() {
  const navigate = useNavigate({ from: '/tactics' });
  const hash = useRouterState({ select: (state) => state.location.hash });
  const { open } = useSearch({ from: '/_shell/tactics' });

  return (
    <TacticsView
      initialTactic={decodeTacticFromHash(hash, TACTIC_READ_OPTIONS)}
      onClearInitialTactic={() => void navigate({ hash: '', replace: true })}
      openId={open}
      onClearOpenId={() => void navigate({ search: {}, replace: true })}
    />
  );
}
