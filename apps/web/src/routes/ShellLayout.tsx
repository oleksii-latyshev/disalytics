import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { afterRouteNavigation } from '@/core/navigation';
import { nonReadyParseState } from '@/core/parsing';
import { type ShellView, useFileDrop, WayIn } from '@/features/library';
import { ShellInteractionContext, useAppRouteContext } from './context';

function viewAt(pathname: string): ShellView {
  switch (pathname) {
    case '/library':
      return 'library';
    case '/tools':
      return 'tools';
    case '/lineups':
      return 'lineups';
    case '/tactics':
      return 'tactics';
    case '/stats':
      return 'stats';
    default:
      return 'home';
  }
}

export function ShellLayout() {
  const { parse, onUpdate, parseOrigin } = useAppRouteContext();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const state = parse.state;
  const view = viewAt(location.pathname);

  useEffect(() => {
    if (state.status === 'failed') {
      parseOrigin.current = null;
      return;
    }
    if (state.status !== 'ready' || parseOrigin.current === null) return;
    if (parseOrigin.current !== location.pathname) {
      parseOrigin.current = null;
      return;
    }
    parseOrigin.current = null;
    void navigate({
      to: '/match/$demoKey',
      params: { demoKey: state.demoKey },
      search: { round: state.roundIndex + 1, view: 'stage' },
    });
  }, [location.pathname, navigate, parseOrigin, state]);

  const onFile = useCallback(
    (file: File) => {
      void afterRouteNavigation(
        () => navigate({ to: '/' }),
        () => {
          parseOrigin.current = '/';
          parse.open(file);
        },
      );
    },
    [navigate, parse.open, parseOrigin],
  );
  const isDraggedOver = useFileDrop(onFile);
  const onClose = () => {
    parseOrigin.current = null;
    parse.close();
  };
  return (
    <ShellInteractionContext.Provider value={isDraggedOver}>
      <WayIn
        state={nonReadyParseState(state)}
        isDraggedOver={isDraggedOver}
        onClose={onClose}
        onUpdate={onUpdate}
        view={view}
      >
        <Outlet />
      </WayIn>
    </ShellInteractionContext.Provider>
  );
}
