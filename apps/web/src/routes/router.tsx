import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { validateMatchSearch } from '@/core/navigation';
import type { RouterContext } from './context';
import { ShellLayout } from './ShellLayout';

function RootComponent() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    if (location.hash.includes('tactic=') && location.pathname !== '/tactics') {
      void navigate({ to: '/tactics', hash: location.hash, replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  return <Outlet />;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: () => <UnknownRoute />,
});

function UnknownRoute() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: '/', replace: true });
  }, [navigate]);
  return null;
}

const shellLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_shell',
  component: ShellLayout,
});

const shellLayoutTree = shellLayoutRoute.addChildren([
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/',
    component: lazyRouteComponent(() => import('./pages/UploadPage'), 'UploadPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/open',
    component: lazyRouteComponent(() => import('./pages/UploadPage'), 'UploadPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/library',
    component: lazyRouteComponent(() => import('./pages/LibraryPage'), 'LibraryPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/tools',
    component: lazyRouteComponent(() => import('./pages/ToolsPage'), 'ToolsPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/lineups',
    component: lazyRouteComponent(() => import('./pages/LineupsPage'), 'LineupsPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/tactics',
    component: lazyRouteComponent(() => import('./pages/TacticsPage'), 'TacticsPage'),
  }),
  createRoute({
    getParentRoute: () => shellLayoutRoute,
    path: '/stats',
    component: lazyRouteComponent(() => import('./pages/StatsPage'), 'StatsPage'),
  }),
]);

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$demoKey',
  validateSearch: validateMatchSearch,
  component: lazyRouteComponent(() => import('./pages/MatchPage'), 'MatchPage'),
});

const routeTree = rootRoute.addChildren([shellLayoutTree, matchRoute]);

export function createAppRouter(context: RouterContext, history?: RouterHistory) {
  const options = { routeTree, context, defaultPreload: 'intent' as const };
  return history === undefined ? createRouter(options) : createRouter({ ...options, history });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
